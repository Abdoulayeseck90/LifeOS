import { getTranslations } from "next-intl/server";
import { HeartPulse, Activity, TestTube, Pill, FileText, MonitorCheck, CalendarDays } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { listConditions } from "@/services/health/conditions";
import { listMedications } from "@/services/health/medications";
import { listAppointments } from "@/services/health/appointments";
import { listLabResults } from "@/services/health/labs";
import { listBodyMetrics } from "@/services/health/body-metrics";
import { listVitals } from "@/services/health/vitals";
import { listMonitoringItems, getMonitoringItemDisplayStatus } from "@/services/health/monitoring";
import { listDocuments } from "@/services/core/documents";
import { listTimelineEvents } from "@/services/core/timeline";
import { getLabResultStatus, LAB_STATUS_BADGE_VARIANT } from "@/lib/health/lab-level";
import { InfoCard } from "@/components/core/info-card";
import { SectionHeader } from "@/components/core/section-header";
import { CategoryIcon } from "@/components/core/category-icon";
import { Badge } from "@/components/core/badge";
import { TrendIndicator } from "@/components/core/trend-indicator";
import { TimelineEventList } from "@/components/health/timeline-event-list";

const RECENT_ACTIVITY_LIMIT = 5;

// Master Redesign Section 15: a summary landing for the Health module —
// the AppSidebar's "Overview" link. Pure composition of existing
// services, no new data layer. Per-user data behind auth — never
// statically prerendered.
//
// Visual Hierarchy Redesign spec, Section 5: organized into visual
// cards with clear hierarchy rather than plain text blocks — every
// list row now carries a category icon, lab results are real clickable
// links into the Lab Test History system (previously missing here
// entirely), and Vitals shows an actual latest reading (BP), not just
// weight.
export const dynamic = "force-dynamic";

export default async function HealthOverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("healthOverview");
  const [conditions, medications, appointments, labResults, bodyMetrics, bloodPressureReadings, monitoringItems, documents, timelineEvents] =
    await Promise.all([
      listConditions(),
      listMedications(),
      listAppointments(),
      listLabResults(),
      listBodyMetrics(),
      listVitals("blood_pressure"),
      listMonitoringItems(),
      listDocuments(),
      listTimelineEvents(),
    ]);

  const activeConditions = conditions.filter((c) => c.status === "active");
  const activeMedications = medications.filter((m) => m.status === "active").length;

  const now = new Date();
  const upcomingAppointments = appointments
    .filter((a) => new Date(a.date_time) >= now)
    .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());
  const upcomingAppointmentsPreview = upcomingAppointments.slice(0, 3);

  const dueMonitoringItems = monitoringItems.filter((item) => {
    const status = getMonitoringItemDisplayStatus(item);
    return status === "overdue" || status === "due" || status === "due_soon";
  });

  const recentLabResults = labResults.slice(0, 3);

  const weightEntries = bodyMetrics
    .filter((m) => m.metric_type === "weight")
    .sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime());
  const [latestWeight, previousWeight] = weightEntries;
  const weightChange = latestWeight && previousWeight ? Math.round((latestWeight.value - previousWeight.value) * 10) / 10 : null;

  const latestBloodPressure = bloodPressureReadings[0];

  return (
    <div>
      <h1 className="mb-6 text-3xl font-semibold text-secondary">{t("title")}</h1>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard icon={HeartPulse} label={t("conditionsLabel")} action={{ label: t("viewAll"), href: "/health/conditions" }}>
          <p className="text-2xl font-semibold text-secondary">{activeConditions.length}</p>
          <p className="mt-1 text-xs text-muted">{t("activeConditions")}</p>
        </InfoCard>

        <InfoCard icon={Activity} category="vitals" label={t("vitalsLabel")} action={{ label: t("viewAll"), href: "/health/vitals" }}>
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
              {latestWeight && (
                <p>
                  {t("vitalsLabel")}: <span className="font-semibold">{latestWeight.value} {latestWeight.unit}</span>
                </p>
              )}
              {weightChange !== null && (
                <TrendIndicator delta={weightChange} unit={latestWeight?.unit} caption={t("vsLastEntry")} colorConvention="downIsPositive" />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">{t("noWeight")}</p>
          )}
        </InfoCard>

        <InfoCard icon={TestTube} category="labs" label={t("recentLabResults")} action={{ label: t("viewAll"), href: "/health/labs" }}>
          <p className="text-2xl font-semibold text-secondary">{labResults.length}</p>
          <p className="mt-1 text-xs text-muted">{t("resultsCountCaption", { count: labResults.length })}</p>
        </InfoCard>

        <InfoCard icon={CalendarDays} category="appointments" label={t("appointmentsLabel")} action={{ label: t("viewAll"), href: "/health/appointments" }}>
          <p className="text-2xl font-semibold text-secondary">{upcomingAppointments.length}</p>
          <p className="mt-1 text-xs text-muted">
            {upcomingAppointments.length > 0 ? t("upcomingCountCaption", { count: upcomingAppointments.length }) : t("noAppointmentsCaption")}
          </p>
        </InfoCard>

        <InfoCard icon={Pill} category="medications" label={t("medicationsLabel")} action={{ label: t("viewAll"), href: "/health/medications" }}>
          <p className="text-2xl font-semibold text-secondary">{activeMedications}</p>
          <p className="mt-1 text-xs text-muted">{t("activeMedicationsCaption")}</p>
        </InfoCard>

        <InfoCard icon={MonitorCheck} label={t("monitoring")} action={{ label: t("viewAll"), href: "/health/monitoring" }}>
          <p className="text-2xl font-semibold text-secondary">{monitoringItems.filter((i) => i.status === "active").length}</p>
          <p className="mt-1 text-xs text-muted">
            {dueMonitoringItems.length > 0 ? t("itemsDueCaption", { count: dueMonitoringItems.length }) : t("activeItemsCaption")}
          </p>
        </InfoCard>

        <InfoCard icon={FileText} category="documents" label={t("documentsLabel")} action={{ label: t("viewAll"), href: "/health/documents" }}>
          <p className="text-2xl font-semibold text-secondary">{documents.length}</p>
          <p className="mt-1 text-xs text-muted">{t("totalDocumentsCaption")}</p>
        </InfoCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-card border border-surface bg-white p-4">
          <SectionHeader title={t("upcomingAppointments")} action={{ label: t("viewAll"), href: "/health/appointments" }} />
          {upcomingAppointmentsPreview.length === 0 ? (
            <p className="text-sm text-muted">{t("noUpcomingAppointments")}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {upcomingAppointmentsPreview.map((appointment) => (
                <li key={appointment.id} className="flex items-center gap-3">
                  <CategoryIcon icon={CalendarDays} category="appointments" size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-secondary">{appointment.provider_name}</p>
                    <p className="text-xs text-muted">
                      {new Date(appointment.date_time).toLocaleString(locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-card border border-surface bg-white p-4">
          <SectionHeader title={t("monitoring")} action={{ label: t("viewAll"), href: "/health/monitoring" }} />
          {dueMonitoringItems.length === 0 ? (
            <p className="text-sm text-muted">{t("monitoringUpToDate")}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {dueMonitoringItems.slice(0, 3).map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <CategoryIcon icon={MonitorCheck} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-secondary">{item.name}</p>
                    {item.next_due_at && <p className="text-xs text-muted">{item.next_due_at}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-card border border-surface bg-white p-4 lg:col-span-2">
          <SectionHeader title={t("recentLabResults")} action={{ label: t("viewAll"), href: "/health/labs" }} />
          {recentLabResults.length === 0 ? (
            <p className="text-sm text-muted">{t("noLabResults")}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {recentLabResults.map((result) => {
                const status = getLabResultStatus(result);
                const testName = (locale === "fr" ? result.test_definitions?.name_fr : result.test_definitions?.name_en) ?? t("unknownTest");
                return (
                  <li key={result.id}>
                    <Link href={`/health/labs/${result.test_definition_id}`} className="flex items-center gap-3 rounded hover:bg-surface">
                      <CategoryIcon icon={TestTube} category="labs" size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-secondary">{testName}</p>
                        <p className="text-xs text-muted">
                          {result.value_numeric ?? result.value_text}
                          {result.unit ? ` ${result.unit}` : ""} · {result.collection_date}
                        </p>
                      </div>
                      {status && <Badge variant={LAB_STATUS_BADGE_VARIANT[status]}>{t(`levels.${status}`)}</Badge>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-card border border-surface bg-white p-4 lg:col-span-2">
          <SectionHeader title={t("recentActivity")} action={{ label: t("viewAll"), href: "/health/timeline" }} />
          <TimelineEventList events={timelineEvents.slice(0, RECENT_ACTIVITY_LIMIT)} locale={locale} emptyMessage={t("noRecentActivity")} />
        </section>
      </div>
    </div>
  );
}
