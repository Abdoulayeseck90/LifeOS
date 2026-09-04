import { getTranslations } from "next-intl/server";
import { CalendarDays, TestTube, HeartPulse, Activity, Dumbbell, ScanLine, MonitorCheck, Car } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { getProfile } from "@/services/core/profile";
import { listConditions } from "@/services/health/conditions";
import { listAppointmentOccurrences } from "@/services/core/appointments";
import { listGigShiftsWithRelations } from "@/services/work/gig-driving";
import { computeGigMetrics } from "@/lib/work/gig-calculations";
import { formatCurrency, formatHours, formatMiles } from "@/lib/work/gig-format";
import { listLabResults } from "@/services/health/labs";
import { getLabResultStatus, LAB_STATUS_BADGE_VARIANT } from "@/lib/health/lab-level";
import { listMonitoringItems, getMonitoringItemDisplayStatus } from "@/services/health/monitoring";
import { listVitals } from "@/services/health/vitals";
import { listBodyMetrics } from "@/services/health/body-metrics";
import { listWorkouts } from "@/services/health/workouts";
import { listDiagnosticTests } from "@/services/health/diagnostic-tests";
import { listReferenceStandardsForMetrics } from "@/services/health/reference-standards";
import { resolveBloodPressureCategory } from "@/lib/health/reference-standards";
import { computeFitnessSummary } from "@/lib/health/exercise";
import { listTimelineEvents } from "@/services/core/timeline";
import { InfoCard } from "@/components/core/info-card";
import { Badge } from "@/components/core/badge";
import { SectionHeader } from "@/components/core/section-header";
import { CategoryIcon } from "@/components/core/category-icon";
import { ClinicalThreshold } from "@/components/health/clinical-threshold";
import { getTimelineEventIcon, getTimelineEventCategory } from "@/components/health/timeline-event-icon";
import { PushPermissionBanner } from "@/components/core/push-permission-banner";

// Master Redesign Section 14: the central LifeOS home — greeting, 4
// at-a-glance cards (Next Appointment / Monitoring Due / Active
// Conditions / Latest Lab Result), Upcoming, and Recent activity. Still
// a summary: each section shows a handful of items with a link to the
// full page, never the full underlying dataset. Per-user data behind
// auth — never statically prerendered.
export const dynamic = "force-dynamic";

function greetingKey(hour: number): "greetingMorning" | "greetingAfternoon" | "greetingEvening" {
  if (hour < 12) return "greetingMorning";
  if (hour < 18) return "greetingAfternoon";
  return "greetingEvening";
}

function daysUntil(dateStr: string): number {
  const today = new Date(new Date().toISOString().slice(0, 10));
  const target = new Date(dateStr);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function formatActiveTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("dashboard");
  const tDiagnosticTestType = await getTranslations("diagnosticTests.form.testTypeOptions");
  const now = new Date();
  // A recurring appointment's own date_time (DTSTART) can be long past —
  // occurrences must be expanded, not read directly off the row. 90 days
  // is comfortably enough for a "what's coming up" dashboard card.
  const occurrenceRangeEnd = new Date(now.getTime() + 90 * 86_400_000);
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const [
    profile,
    conditions,
    upcomingAppointments,
    labResults,
    monitoringItems,
    timelineEvents,
    bloodPressureReadings,
    bodyMetrics,
    workouts,
    diagnosticTests,
    bloodPressureStandards,
    gigShiftsThisWeek,
  ] = await Promise.all([
    getProfile(),
    listConditions(),
    listAppointmentOccurrences(now, occurrenceRangeEnd),
    listLabResults(),
    listMonitoringItems(),
    listTimelineEvents(),
    listVitals("blood_pressure"),
    listBodyMetrics(),
    listWorkouts(),
    listDiagnosticTests(),
    listReferenceStandardsForMetrics(["vital:blood_pressure"]),
    listGigShiftsWithRelations(weekStart.toISOString().slice(0, 10)),
  ]);

  const nextAppointment = upcomingAppointments[0];

  const dueMonitoringItems = monitoringItems
    .filter((item) => {
      const status = getMonitoringItemDisplayStatus(item);
      return status === "overdue" || status === "due" || status === "due_soon";
    })
    .sort((a, b) => (a.next_due_at ?? "").localeCompare(b.next_due_at ?? ""));
  const nextMonitoringItem = dueMonitoringItems[0];

  const activeConditions = conditions.filter((c) => c.status === "active");
  // listLabResults() is already ordered by collection_date desc — a
  // small number of recent results (Redesign Lab Results Spec, Section
  // 18: "show only a small number," never the whole module here).
  const recentLabResults = labResults.slice(0, 2);

  const latestBloodPressure = bloodPressureReadings[0]; // listVitals() is already ordered by recorded_at desc
  const latestWeight = bodyMetrics
    .filter((m) => m.metric_type === "weight")
    .sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime())[0];
  const bloodPressureCategory =
    latestBloodPressure && latestBloodPressure.systolic !== null && latestBloodPressure.diastolic !== null
      ? resolveBloodPressureCategory(latestBloodPressure.systolic, latestBloodPressure.diastolic, bloodPressureStandards)
      : null;

  const fitnessSummary = computeFitnessSummary(workouts, now);
  const latestDiagnosticTest = diagnosticTests[0]; // listDiagnosticTests() is already ordered by study_date desc

  const gigWeekMetrics = computeGigMetrics(gigShiftsThisWeek.filter((s) => s.status === "completed"));
  const nextGigShift = upcomingAppointments.find((a) => a.appointment.category === "work");

  const upcoming = [
    ...upcomingAppointments.map((a) => ({
      date: a.occurrenceStart,
      title: a.appointment.title ?? `${t("appointmentWith")} ${a.appointment.provider_name}`,
      type: "appointment" as const,
    })),
    ...dueMonitoringItems
      .filter((item) => item.next_due_at)
      .map((item) => ({ date: item.next_due_at as string, title: item.name, type: "monitoring" as const })),
  ]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);

  const recentActivity = timelineEvents.slice(0, 5);

  const greeting = t(greetingKey(now.getHours()), { name: profile?.display_name || "none" });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-3xl font-semibold text-secondary">{greeting}</h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </div>
        <p className="shrink-0 text-sm text-muted">
          {now.toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      <PushPermissionBanner />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard icon={CalendarDays} category="appointments" label={t("nextAppointment")} action={{ label: t("viewCalendar"), href: "/calendar" }}>
          {nextAppointment ? (
            <>
              <p className="text-sm font-semibold text-secondary">
                {new Date(nextAppointment.occurrenceStart).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
              </p>
              <p className="mt-1 text-sm text-secondary">{nextAppointment.appointment.title ?? nextAppointment.appointment.provider_name}</p>
              {nextAppointment.appointment.appointment_type && (
                <p className="text-xs text-muted">{nextAppointment.appointment.appointment_type}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted">{t("noUpcoming")}</p>
          )}
        </InfoCard>

        <InfoCard icon={MonitorCheck} label={t("monitoringDue")} action={{ label: t("viewMonitoring"), href: "/health/monitoring" }}>
          {nextMonitoringItem ? (
            <>
              <p className="text-sm font-semibold text-secondary">{nextMonitoringItem.name}</p>
              <p className="mt-1 text-xs text-muted">
                {nextMonitoringItem.next_due_at &&
                  (() => {
                    const days = daysUntil(nextMonitoringItem.next_due_at);
                    if (days < 0) return t("overdueBy", { count: Math.abs(days) });
                    if (days === 0) return t("dueToday");
                    return t("dueInDays", { count: days });
                  })()}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">{t("monitoringUpToDate")}</p>
          )}
        </InfoCard>

        <InfoCard icon={HeartPulse} label={t("currentConditions")} action={{ label: t("viewConditions"), href: "/health/conditions" }}>
          <p className="text-2xl font-semibold text-secondary">{activeConditions.length}</p>
          {activeConditions.length > 0 && (
            <p className="mt-1 truncate text-xs text-muted">{activeConditions.map((c) => c.name).join(", ")}</p>
          )}
        </InfoCard>

        <InfoCard icon={TestTube} category="labs" label={t("recentLabs")} action={{ label: t("viewLabResults"), href: "/health/labs" }}>
          {recentLabResults.length > 0 ? (
            <div className="flex flex-col gap-3">
              {recentLabResults.map((result) => {
                const status = getLabResultStatus(result);
                const testName =
                  (locale === "fr" ? result.test_definitions?.name_fr : result.test_definitions?.name_en) ?? t("unknownTest");
                return (
                  <Link
                    key={result.id}
                    href={`/health/labs/${result.test_definition_id}`}
                    className="block rounded hover:bg-surface"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-secondary">{testName}</p>
                      {status && <Badge variant={LAB_STATUS_BADGE_VARIANT[status]}>{t(`levels.${status}`)}</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-secondary">
                      {result.value_numeric ?? result.value_text}
                      {result.unit ? ` ${result.unit}` : ""}
                    </p>
                    <p className="text-xs text-muted">{result.collection_date}</p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted">{t("noLabResults")}</p>
          )}
        </InfoCard>

        <InfoCard icon={Activity} category="vitals" label={t("vitalsLabel")} action={{ label: t("viewVitals"), href: "/health/vitals" }}>
          {latestBloodPressure || latestWeight ? (
            <div className="flex flex-col gap-1 text-sm text-secondary">
              {latestBloodPressure && (
                <p>
                  {t("bloodPressureLabel")}:{" "}
                  <span className="font-semibold">
                    {latestBloodPressure.systolic} / {latestBloodPressure.diastolic}
                  </span>
                </p>
              )}
              {latestBloodPressure?.pulse != null && (
                <p>
                  {t("heartRateLabel")}: <span className="font-semibold">{latestBloodPressure.pulse} {t("bpm")}</span>
                </p>
              )}
              {latestWeight && (
                <p>
                  {t("weightLabel")}:{" "}
                  <span className="font-semibold">
                    {latestWeight.value} {latestWeight.unit}
                  </span>
                </p>
              )}
              {bloodPressureCategory && (
                <div className="mt-1">
                  <ClinicalThreshold
                    category={bloodPressureCategory.category}
                    guidelineLabel={bloodPressureCategory.standard.source_name}
                    standard={bloodPressureCategory.standard}
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">{t("noVitals")}</p>
          )}
        </InfoCard>

        <InfoCard
          icon={Dumbbell}
          label={t("exerciseLabel")}
          action={
            fitnessSummary.workoutCount > 0
              ? { label: t("viewExercise"), href: "/health/exercise" }
              : { label: t("logWorkout"), href: "/health/exercise" }
          }
        >
          {fitnessSummary.workoutCount > 0 ? (
            <>
              <p className="text-sm font-semibold text-secondary">
                {t("workoutsThisWeek", { count: fitnessSummary.workoutCount })}
              </p>
              {fitnessSummary.activeMinutes > 0 && (
                <p className="mt-1 text-xs text-muted">{t("activeThisWeek", { time: formatActiveTime(fitnessSummary.activeMinutes) })}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted">{t("noWorkouts")}</p>
          )}
        </InfoCard>

        <InfoCard
          icon={ScanLine}
          label={t("diagnosticTestsLabel")}
          action={{ label: t("viewDiagnosticTests"), href: "/health/diagnostic-tests" }}
        >
          {latestDiagnosticTest ? (
            <>
              <p className="text-sm font-semibold text-secondary">
                {tDiagnosticTestType.has(latestDiagnosticTest.test_type)
                  ? tDiagnosticTestType(latestDiagnosticTest.test_type)
                  : latestDiagnosticTest.test_type}
              </p>
              <p className="mt-1 text-xs text-muted">{latestDiagnosticTest.study_date}</p>
            </>
          ) : (
            <p className="text-sm text-muted">{t("noDiagnosticTests")}</p>
          )}
        </InfoCard>

        <InfoCard icon={Car} label={t("gigDrivingLabel")} action={{ label: t("viewGigDriving"), href: "/work/gig-driving" }}>
          {gigShiftsThisWeek.length > 0 || nextGigShift ? (
            <div className="flex flex-col gap-1 text-sm text-secondary">
              <p>
                {t("gigThisWeek")}: <span className="font-semibold">{formatCurrency(gigWeekMetrics.grossEarnings)}</span>
              </p>
              <p className="text-xs text-muted">
                {formatHours(gigWeekMetrics.hours)} · {formatMiles(gigWeekMetrics.miles)}
              </p>
              {nextGigShift && (
                <p className="mt-1 text-xs text-muted">
                  {t("gigNextShift")}: {new Date(nextGigShift.occurrenceStart).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">{t("noGigActivity")}</p>
          )}
        </InfoCard>
      </div>

      <section className="mb-8">
        <SectionHeader title={t("upcoming")} action={{ label: t("viewCalendar"), href: "/calendar" }} />
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted">{t("noUpcomingEvents")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {upcoming.map((entry, index) => (
              <div key={index} className="flex items-center gap-3 rounded-card border border-surface bg-white p-3">
                <CategoryIcon icon={entry.type === "appointment" ? CalendarDays : MonitorCheck} category={entry.type === "appointment" ? "appointments" : "neutral"} size="sm" />
                <p className="flex-1 truncate text-sm text-secondary">{entry.title}</p>
                <p className="shrink-0 text-xs text-muted">
                  {new Date(entry.date).toLocaleDateString(locale, { month: "short", day: "numeric" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeader title={t("recentActivity")} />
        {recentActivity.length === 0 ? (
          <p className="text-sm text-muted">{t("noRecentActivity")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentActivity.map((event) => (
              <div key={event.id} className="flex items-center gap-3 rounded-card border border-surface bg-white p-3">
                <CategoryIcon icon={getTimelineEventIcon(event.event_type)} category={getTimelineEventCategory(event.event_type)} size="sm" />
                <p className="flex-1 truncate text-sm text-secondary">{event.title}</p>
                <p className="shrink-0 text-xs text-muted">
                  {new Date(event.date_time).toLocaleDateString(locale, { month: "short", day: "numeric" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
