import { getTranslations } from "next-intl/server";
import type { GigShiftWithRelations } from "@/lib/work/gig-calculations";
import { shiftTotalMiles } from "@/lib/work/gig-calculations";
import { formatMiles } from "@/lib/work/gig-format";

function weekStart(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

export async function GigMileageTab({ shifts }: { shifts: GigShiftWithRelations[] }) {
  const t = await getTranslations("gigDriving.mileage");

  const completed = shifts.filter((s) => s.status === "completed");
  const totalMiles = completed.reduce((sum, s) => sum + (shiftTotalMiles(s) ?? 0), 0);

  const byWeek = new Map<string, number>();
  for (const shift of completed) {
    const key = weekStart(shift.date);
    byWeek.set(key, (byWeek.get(key) ?? 0) + (shiftTotalMiles(shift) ?? 0));
  }
  const weeks = Array.from(byWeek.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-card border border-surface bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("totalMiles")}</p>
        <p className="mt-1 text-xl font-semibold text-secondary">{formatMiles(totalMiles)}</p>
      </div>

      {weeks.length === 0 ? (
        <p className="text-sm text-muted">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-4">{t("weekOf")}</th>
                <th className="py-2 pr-4">{t("miles")}</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map(([week, miles]) => (
                <tr key={week} className="border-b border-surface last:border-0">
                  <td className="py-2 pr-4 font-medium text-secondary">{new Date(`${week}T00:00:00`).toLocaleDateString()}</td>
                  <td className="py-2 pr-4">{formatMiles(miles)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
