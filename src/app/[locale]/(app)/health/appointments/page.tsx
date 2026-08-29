import { getTranslations } from "next-intl/server";
import { listAppointments } from "@/services/health/appointments";
import { listConditions } from "@/services/health/conditions";
import { resolveDateRangeParams } from "@/lib/dates/server-range";
import { DateRangeFilter } from "@/components/core/date-range-filter";
import { AppointmentCard } from "@/components/health/appointment-card";
import { AppointmentAddButton } from "@/components/health/appointment-add-button";

// Data-first page (Global Data-Entry UX Refactor): the form no longer
// lives permanently on the page — it opens in a modal via the primary
// action button next to the title, and closes itself after a
// successful save. Default view is unfiltered (all upcoming + all
// past) — the date filter only narrows things down when the user
// explicitly sets one (Date Range Filter spec Section 8: "Upcoming
// appointments" is this page's own already-established default
// grouping, not a date restriction to override). Per-user data behind
// auth — never statically prerendered.
export const dynamic = "force-dynamic";

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const t = await getTranslations("appointments");
  const { utcBounds } = await resolveDateRangeParams(await searchParams);
  const [appointments, conditions] = await Promise.all([listAppointments(utcBounds), listConditions()]);

  const now = new Date();
  const upcoming = appointments
    .filter((a) => new Date(a.date_time) >= now)
    .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());
  const past = appointments
    .filter((a) => new Date(a.date_time) < now)
    .sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime());

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-secondary">{t("title")}</h1>
        <AppointmentAddButton conditions={conditions} />
      </div>

      <DateRangeFilter quickRanges={["30d", "3m", "6m", "thisYear", "custom"]} />

      {appointments.length === 0 ? (
        <div className="rounded-card border border-dashed border-surface p-8 text-center">
          <p className="text-sm text-muted">{t("empty")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("upcoming")}</h2>
              <div className="flex flex-col gap-3">
                {upcoming.map((appointment) => (
                  <AppointmentCard key={appointment.id} appointment={appointment} conditions={conditions} />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("past")}</h2>
              <div className="flex flex-col gap-3">
                {past.map((appointment) => (
                  <AppointmentCard key={appointment.id} appointment={appointment} conditions={conditions} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
