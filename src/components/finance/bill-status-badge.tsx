import { useTranslations } from "next-intl";
import type { Bill } from "@/types/core/entities";
import { getBillDisplayStatus } from "@/lib/finance/bill-status";

const STATUS_CLASSES: Record<string, string> = {
  overdue: "bg-status-urgent/10 text-status-urgent",
  due_today: "bg-status-attention/10 text-status-attention",
  upcoming: "bg-status-normal/10 text-status-normal",
  paid: "bg-status-normal/10 text-status-normal",
  cancelled: "bg-status-inactive/10 text-status-inactive",
};

export function BillStatusBadge({ bill }: { bill: Pick<Bill, "status" | "due_date"> }) {
  const t = useTranslations("finance.billStatus");
  const displayStatus = getBillDisplayStatus(bill);

  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[displayStatus]}`}>{t(displayStatus)}</span>;
}
