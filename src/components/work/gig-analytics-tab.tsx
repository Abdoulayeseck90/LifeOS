import { getTranslations } from "next-intl/server";
import type { GigShiftWithRelations, ScheduleVsActual } from "@/lib/work/gig-calculations";
import { computeGigMetrics } from "@/lib/work/gig-calculations";
import { formatCurrency, formatHours, formatMiles } from "@/lib/work/gig-format";

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export async function GigAnalyticsTab({
  shifts,
  scheduleVsActual,
}: {
  shifts: GigShiftWithRelations[];
  scheduleVsActual: { label: string; result: ScheduleVsActual }[];
}) {
  const t = await getTranslations("gigDriving.analytics");
  const completed = shifts.filter((s) => s.status === "completed");

  const byDay = DAY_KEYS.map((key, index) => ({
    key,
    metrics: computeGigMetrics(completed.filter((s) => new Date(`${s.date}T00:00:00`).getDay() === index)),
  }));

  const monthGroups = new Map<string, GigShiftWithRelations[]>();
  for (const shift of completed) {
    const key = monthKey(shift.date);
    monthGroups.set(key, [...(monthGroups.get(key) ?? []), shift]);
  }
  const byMonth = Array.from(monthGroups.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, group]) => ({ month, metrics: computeGigMetrics(group) }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="mb-3 text-sm font-semibold text-secondary">{t("byDayOfWeek")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-4">{t("day")}</th>
                <th className="py-2 pr-4">{t("gross")}</th>
                <th className="py-2 pr-4">{t("hours")}</th>
                <th className="py-2 pr-4">{t("miles")}</th>
              </tr>
            </thead>
            <tbody>
              {byDay.map(({ key, metrics }) => (
                <tr key={key} className="border-b border-surface last:border-0">
                  <td className="py-2 pr-4 font-medium text-secondary">{t(`days.${key}`)}</td>
                  <td className="py-2 pr-4">{formatCurrency(metrics.grossEarnings)}</td>
                  <td className="py-2 pr-4">{formatHours(metrics.hours)}</td>
                  <td className="py-2 pr-4">{formatMiles(metrics.miles)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-secondary">{t("byMonth")}</h2>
        {byMonth.length === 0 ? (
          <p className="text-sm text-muted">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-4">{t("month")}</th>
                  <th className="py-2 pr-4">{t("gross")}</th>
                  <th className="py-2 pr-4">{t("net")}</th>
                  <th className="py-2 pr-4">{t("hours")}</th>
                  <th className="py-2 pr-4">{t("miles")}</th>
                </tr>
              </thead>
              <tbody>
                {byMonth.map(({ month, metrics }) => (
                  <tr key={month} className="border-b border-surface last:border-0">
                    <td className="py-2 pr-4 font-medium text-secondary">{month}</td>
                    <td className="py-2 pr-4">{formatCurrency(metrics.grossEarnings)}</td>
                    <td className="py-2 pr-4">{formatCurrency(metrics.estimatedNet)}</td>
                    <td className="py-2 pr-4">{formatHours(metrics.hours)}</td>
                    <td className="py-2 pr-4">{formatMiles(metrics.miles)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-secondary">{t("scheduleVsActual")}</h2>
        {scheduleVsActual.length === 0 ? (
          <p className="text-sm text-muted">{t("scheduleVsActualEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {scheduleVsActual.map(({ label, result }, i) => (
              <li key={i} className="rounded-card border border-surface bg-white px-4 py-3 text-sm">
                <p className="font-medium text-secondary">{label}</p>
                <p className="text-xs text-muted">
                  {t("planned")}: {result.plannedHours !== null ? formatHours(result.plannedHours) : "—"}
                  {result.goal !== null ? ` · ${t("goal")} ${formatCurrency(result.goal)}` : ""} — {t("actual")}:{" "}
                  {result.actualHours !== null ? formatHours(result.actualHours) : "—"} · {formatCurrency(result.actualGross)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
