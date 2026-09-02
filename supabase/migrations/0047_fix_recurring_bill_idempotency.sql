-- Fix two related bugs surfaced by testing "Mark as Paid" on a
-- recurring, debt-linked bill:
--
-- Bug 1 (duplicate expense transactions): a recurring bill's status
-- never actually leaves 'pending' when paid -- it stays 'pending' with
-- an advanced due_date, by design, so the next cycle shows up as due.
-- pay_bill()'s claim-first guard (`where status = 'pending'`) therefore
-- never protects a recurring bill against a duplicate/retried "Mark as
-- Paid" call: every call matches the same WHERE clause and creates
-- ANOTHER finance_transactions row for the same due date. Confirmed
-- live: 4 duplicate $20 expense transactions from repeated submissions
-- against one recurring bill. Fix: the claim guard now also requires
-- the caller's already-observed due_date to still match -- once a
-- payment succeeds and due_date advances, a stale/duplicate call's
-- guard fails and raises ALREADY_PAID, exactly like a one-time bill's
-- permanent status transition already protects it.
--
-- Bug 2 (debt balance silently stops updating on the 2nd+ payment):
-- debt_payments.bill_id was UNIQUE, so pay_bill() treated a second
-- payment against the same recurring bill as "correcting the existing
-- payment" (upsert by bill_id, balance adjusted by the DELTA vs the
-- last recorded payment) rather than "a new, distinct payment." A
-- second cycle's payment of the same amount produced a delta of zero,
-- silently failing to reduce the balance even though a real new
-- expense was recorded. Fix: debt_payments is now one row per payment
-- EVENT (tied 1:1 to the finance_transactions row created alongside
-- it via the new transaction_id column), not one row per bill -- every
-- successful payment always inserts a new row and always subtracts its
-- own full amount from the balance. Bug 1's fix is what makes this safe
-- against duplicate submissions now that there's no upsert/delta math
-- left to (accidentally) absorb them.

alter table debt_payments drop constraint debt_payments_bill_id_key;
alter table debt_payments add column transaction_id uuid unique references finance_transactions(id) on delete set null;
create index debt_payments_bill_id_idx on debt_payments(bill_id);

drop function if exists pay_bill(uuid, text, timestamptz, date, text, numeric, date, text, text, uuid, boolean);

create or replace function pay_bill(
  p_bill_id uuid,
  p_expected_due_date date,
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
  v_rows_affected int;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  update bills
  set status = p_new_status, paid_at = p_new_paid_at, due_date = p_new_due_date
  where id = p_bill_id and user_id = v_user_id and status = 'pending' and due_date = p_expected_due_date
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
    insert into debt_payments (user_id, bill_id, transaction_id, credit_card_id, loan_id, amount, paid_at)
    values (v_user_id, p_bill_id, v_transaction.id, v_bill.linked_credit_card_id, v_bill.linked_loan_id, p_expense_amount, coalesce(p_new_paid_at, now()));

    if v_bill.linked_credit_card_id is not null then
      update credit_cards set balance = balance - p_expense_amount, updated_at = now()
      where id = v_bill.linked_credit_card_id and user_id = v_user_id;
    else
      update loans set balance = balance - p_expense_amount, updated_at = now()
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
revoke all on function pay_bill(uuid, date, text, timestamptz, date, text, numeric, date, text, text, uuid, boolean) from public;
grant execute on function pay_bill(uuid, date, text, timestamptz, date, text, numeric, date, text, text, uuid, boolean) to authenticated;

-- update_paid_bill_amount(): bill_id is no longer guaranteed unique in
-- debt_payments, but this function is only ever reachable for a
-- one-time (non-recurring) PAID bill -- updateBill() in
-- services/core/bills.ts only routes here when current.status ===
-- 'paid', and a recurring bill's status never rests at 'paid' (see Bug
-- 1 above). A non-recurring bill can be paid at most once, ever, so it
-- can have at most one debt_payments row -- this still resolves to
-- exactly one row in practice; ordering defensively picks the most
-- recent if that invariant is ever violated.
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
    select * into v_existing_payment from debt_payments where bill_id = p_bill_id order by created_at desc limit 1;

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
  end if;

  return to_jsonb(v_bill);
end;
$$;

notify pgrst, 'reload schema';
