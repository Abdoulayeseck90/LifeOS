-- Bill -> Debt payment linking. A Bill can optionally represent a
-- payment toward a Credit Card or Loan rather than an ordinary expense
-- (e.g. "Chase Credit Card Payment" $500, linked to the Chase card) —
-- marking it Paid must apply that $500 to the card's balance exactly
-- once, ever, no matter how many times the request is retried, the
-- page is refreshed, or the bill is edited afterward.
--
-- No new payment system: this reuses the existing bills/finance_
-- transactions tables and the existing payBill() flow. The only new
-- table is debt_payments, which fills a real gap — credit_cards/loans
-- had no payment-history concept at all before this, just a manually-
-- editable `balance` column.

alter table bills add column linked_credit_card_id uuid references credit_cards(id) on delete set null;
alter table bills add column linked_loan_id uuid references loans(id) on delete set null;
alter table bills add constraint bills_single_debt_link
  check (linked_credit_card_id is null or linked_loan_id is null);
create index bills_linked_credit_card_id_idx on bills(linked_credit_card_id);
create index bills_linked_loan_id_idx on bills(linked_loan_id);

-- The idempotency mechanism the spec explicitly demands: `bill_id` is
-- UNIQUE, so a given bill can ever have at most one debt_payments row.
-- Combined with pay_bill()'s upsert-by-bill_id below, "mark the same
-- bill paid twice" and "re-run a retried request" both resolve to the
-- same single row rather than a second deduction.
create table debt_payments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credit_card_id uuid references credit_cards(id) on delete cascade,
  loan_id uuid references loans(id) on delete cascade,
  bill_id uuid unique references bills(id) on delete set null,
  amount numeric not null check (amount > 0),
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint debt_payments_exactly_one_target check (
    (credit_card_id is not null and loan_id is null) or (credit_card_id is null and loan_id is not null)
  )
);
alter table debt_payments enable row level security;
create policy "debt_payments_all_own" on debt_payments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index debt_payments_user_id_idx on debt_payments(user_id);
create index debt_payments_credit_card_id_idx on debt_payments(credit_card_id);
create index debt_payments_loan_id_idx on debt_payments(loan_id);

-- Deliberately NOT `security definer` — this runs with the calling
-- user's own privileges, so every statement inside it is still checked
-- against bills_all_own / debt_payments_all_own / credit_cards_all_own
-- / loans_all_own exactly as if the client had run each statement
-- directly. That is what makes "the linked credit card or loan must
-- belong to the same authenticated user" true by construction: if
-- v_claimed_bill.linked_credit_card_id somehow pointed at another
-- user's card, the UPDATE on credit_cards below would affect zero rows
-- (RLS hides that row entirely) and the function raises, rolling back
-- the whole transaction — bill included.
--
-- Atomicity: a single plpgsql function body is one transaction. Any
-- `raise exception` here rolls back every write already made in this
-- call — the bill claim, the expense insert, the debt_payments upsert,
-- the balance update — so "bill says Paid but the debt update failed"
-- cannot happen.
create or replace function pay_bill(
  p_bill_id uuid,
  p_new_status text,
  p_new_paid_at timestamptz,
  p_new_due_date date,
  p_expense_description text,
  p_expense_amount numeric,
  p_expense_date date,
  p_expense_category text,
  p_expense_payment_method text,
  p_expense_business_id uuid,
  p_link_transaction boolean
)
returns jsonb
language plpgsql
as $$
declare
  v_user_id uuid := auth.uid();
  v_bill bills%rowtype;
  v_transaction finance_transactions%rowtype;
  v_existing_payment debt_payments%rowtype;
  v_delta numeric;
  v_rows_affected int;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Same atomic-claim-first guard payBill() already used against a
  -- double "Mark as Paid" (double-click, retry, two tabs) — only
  -- succeeds if the bill is still 'pending' as of this exact statement.
  update bills
  set status = p_new_status, paid_at = p_new_paid_at, due_date = p_new_due_date
  where id = p_bill_id and user_id = v_user_id and status = 'pending'
  returning * into v_bill;

  if not found then
    raise exception 'ALREADY_PAID';
  end if;

  insert into finance_transactions (user_id, type, description, amount, date, category, payment_method, business_id, bill_id)
  values (v_user_id, 'expense', p_expense_description, p_expense_amount, p_expense_date, p_expense_category, p_expense_payment_method, p_expense_business_id, p_bill_id)
  returning * into v_transaction;

  if p_link_transaction then
    update bills set linked_transaction_id = v_transaction.id
    where id = p_bill_id and user_id = v_user_id
    returning * into v_bill;
  end if;

  if v_bill.linked_credit_card_id is not null or v_bill.linked_loan_id is not null then
    select * into v_existing_payment from debt_payments where bill_id = p_bill_id;

    if found then
      -- Re-running pay_bill for the same bill can only reach here via
      -- the update_paid_bill_amount() path below in practice (this
      -- function's own claim guard above already blocks a second
      -- "Mark as Paid" outright) — handled for completeness/safety.
      v_delta := p_expense_amount - v_existing_payment.amount;
      update debt_payments set amount = p_expense_amount, paid_at = p_new_paid_at, updated_at = now()
      where id = v_existing_payment.id;
    else
      v_delta := p_expense_amount;
      insert into debt_payments (user_id, bill_id, credit_card_id, loan_id, amount, paid_at)
      values (v_user_id, p_bill_id, v_bill.linked_credit_card_id, v_bill.linked_loan_id, p_expense_amount, p_new_paid_at);
    end if;

    if v_bill.linked_credit_card_id is not null then
      update credit_cards set balance = balance - v_delta, updated_at = now()
      where id = v_bill.linked_credit_card_id and user_id = v_user_id;
    else
      update loans set balance = balance - v_delta, updated_at = now()
      where id = v_bill.linked_loan_id and user_id = v_user_id;
    end if;

    get diagnostics v_rows_affected = row_count;
    if v_rows_affected = 0 then
      raise exception 'DEBT_TARGET_NOT_FOUND';
    end if;
  end if;

  return jsonb_build_object('bill', to_jsonb(v_bill), 'transaction', to_jsonb(v_transaction));
end;
$$;
revoke all on function pay_bill(uuid, text, timestamptz, date, text, numeric, date, text, text, uuid, boolean) from public;
grant execute on function pay_bill(uuid, text, timestamptz, date, text, numeric, date, text, text, uuid, boolean) to authenticated;

-- Handles "Edit Paid Bill": changing a paid, debt-linked bill's amount
-- from $500 to $600 must update the SAME debt_payments row (by
-- bill_id) and adjust the balance by the $100 delta only — never
-- treated as a second $600 payment. If the bill isn't paid yet, or
-- isn't debt-linked, this only touches bills.amount (and, if a linked
-- expense already exists, keeps that transaction's amount in sync too)
-- — no debt side effects, since none apply yet.
create or replace function update_paid_bill_amount(p_bill_id uuid, p_new_amount numeric)
returns jsonb
language plpgsql
as $$
declare
  v_user_id uuid := auth.uid();
  v_bill bills%rowtype;
  v_existing_payment debt_payments%rowtype;
  v_delta numeric;
  v_rows_affected int;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_bill from bills where id = p_bill_id and user_id = v_user_id;
  if not found then
    raise exception 'Bill not found';
  end if;

  update bills set amount = p_new_amount, updated_at = now()
  where id = p_bill_id and user_id = v_user_id
  returning * into v_bill;

  if v_bill.linked_transaction_id is not null then
    update finance_transactions set amount = p_new_amount, updated_at = now()
    where id = v_bill.linked_transaction_id and user_id = v_user_id;
  end if;

  if v_bill.linked_credit_card_id is not null or v_bill.linked_loan_id is not null then
    select * into v_existing_payment from debt_payments where bill_id = p_bill_id;

    if found then
      v_delta := p_new_amount - v_existing_payment.amount;
      update debt_payments set amount = p_new_amount, updated_at = now()
      where id = v_existing_payment.id;

      if v_bill.linked_credit_card_id is not null then
        update credit_cards set balance = balance - v_delta, updated_at = now()
        where id = v_bill.linked_credit_card_id and user_id = v_user_id;
      else
        update loans set balance = balance - v_delta, updated_at = now()
        where id = v_bill.linked_loan_id and user_id = v_user_id;
      end if;

      get diagnostics v_rows_affected = row_count;
      if v_rows_affected = 0 then
        raise exception 'DEBT_TARGET_NOT_FOUND';
      end if;
    end if;
    -- No existing debt_payments row means this bill was never actually
    -- paid yet (or its payment predates the debt link) — nothing to
    -- propagate; bills.amount above is the only change.
  end if;

  return to_jsonb(v_bill);
end;
$$;
revoke all on function update_paid_bill_amount(uuid, numeric) from public;
grant execute on function update_paid_bill_amount(uuid, numeric) to authenticated;

notify pgrst, 'reload schema';
