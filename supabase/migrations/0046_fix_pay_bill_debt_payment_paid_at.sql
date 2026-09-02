-- Fix pay_bill(): debt_payments.paid_at is `not null` (it always means
-- "when this payment actually happened"), but pay_bill() was writing
-- p_new_paid_at into it directly — and p_new_paid_at is deliberately
-- NULL whenever a recurring bill rolls forward to its next due date
-- (that null belongs to bills.paid_at, meaning "this cycle's instance
-- isn't marked paid, it's pending again"). Marking a recurring,
-- debt-linked bill as paid therefore violated debt_payments' not-null
-- constraint. Fix: fall back to now() for the payment's own paid_at
-- whenever p_new_paid_at is null, independent of the bill's own status.

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
      v_delta := p_expense_amount - v_existing_payment.amount;
      update debt_payments set amount = p_expense_amount, paid_at = coalesce(p_new_paid_at, now()), updated_at = now()
      where id = v_existing_payment.id;
    else
      v_delta := p_expense_amount;
      insert into debt_payments (user_id, bill_id, credit_card_id, loan_id, amount, paid_at)
      values (v_user_id, p_bill_id, v_bill.linked_credit_card_id, v_bill.linked_loan_id, p_expense_amount, coalesce(p_new_paid_at, now()));
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

notify pgrst, 'reload schema';
