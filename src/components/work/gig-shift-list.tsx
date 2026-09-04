"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Trash2 } from "lucide-react";
import type { GigShiftWithRelations } from "@/lib/work/gig-calculations";
import { shiftTotalMiles, shiftDurationHours, sumEarnings, sumExpenses } from "@/lib/work/gig-calculations";
import { formatCurrency, formatMiles, formatHours } from "@/lib/work/gig-format";

export function GigShiftList({ shifts }: { shifts: GigShiftWithRelations[] }) {
  const t = useTranslations("gigDriving.shifts");
  const locale = useLocale();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!window.confirm(t("deleteConfirm"))) return;
    setPendingId(id);
    const response = await fetch(`/api/work/gig-driving/shifts/${id}`, { method: "DELETE" });
    setPendingId(null);
    if (response.ok) router.refresh();
  }

  if (shifts.length === 0) {
    return <p className="text-sm text-muted">{t("empty")}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {shifts.map((shift) => {
        const miles = shiftTotalMiles(shift);
        const hours = shiftDurationHours(shift);
        const earnings = sumEarnings(shift.earnings);
        const expenses = sumExpenses(shift.expenses);
        const date = new Date(shift.start_time);

        return (
          <li key={shift.id} className="flex items-center justify-between rounded-card border border-surface bg-white px-4 py-3">
            <div>
              <p className="text-sm font-medium text-secondary">
                {date.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })} ·{" "}
                {shift.platforms.map((p) => t(`platformOptions.${p}`)).join(", ")}
              </p>
              <p className="text-xs text-muted">
                {shift.status === "in_progress"
                  ? t("statusInProgress")
                  : shift.status === "cancelled"
                    ? t("statusCancelled")
                    : `${miles !== null ? formatMiles(miles) : "—"} · ${hours !== null ? formatHours(hours) : "—"} · ${formatCurrency(earnings.total)} ${t("gross")} − ${formatCurrency(expenses)} ${t("expenses")}`}
              </p>
            </div>
            {shift.status !== "in_progress" && (
              <button
                type="button"
                onClick={() => handleDelete(shift.id)}
                disabled={pendingId === shift.id}
                className="min-h-11 min-w-11 shrink-0 text-muted hover:text-status-urgent disabled:opacity-50"
                aria-label={t("delete")}
              >
                <Trash2 size={16} />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
