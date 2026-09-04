import { getTranslations } from "next-intl/server";
import { listConditions } from "@/services/health/conditions";
import { listAppointmentOccurrences, listAppointments } from "@/services/core/appointments";
import { listPersonalDocuments } from "@/services/core/personal-documents";
import type { PersonalDocument } from "@/types/core/entities";
import {
  listGigVehicles,
  listGigShiftsWithRelations,
  getInProgressGigShift,
  listGigVehicleMaintenance,
  listGigExpenses,
  listGigTaxSettings,
} from "@/services/work/gig-driving";
import { computeGigMetrics, computePlatformBreakdown, computeTaxYearSummary, computeScheduleVsActual } from "@/lib/work/gig-calculations";
import type { GigVehicleMaintenance, GigTaxSettings } from "@/types/work/entities";
import { GigDrivingTabs } from "@/components/work/gig-driving-tabs";
import { GigOverviewTab } from "@/components/work/gig-overview-tab";
import { GigScheduleTab } from "@/components/work/gig-schedule-tab";
import { GigShiftsTab } from "@/components/work/gig-shifts-tab";
import { GigEarningsTab } from "@/components/work/gig-earnings-tab";
import { GigMileageTab } from "@/components/work/gig-mileage-tab";
import { GigExpensesTab } from "@/components/work/gig-expenses-tab";
import { GigVehicleTab } from "@/components/work/gig-vehicle-tab";
import { GigTaxesTab } from "@/components/work/gig-taxes-tab";
import { GigAnalyticsTab } from "@/components/work/gig-analytics-tab";

// Per-user data behind auth — never statically prerendered.
export const dynamic = "force-dynamic";

// Gig Driving spec: one route, nine tabs (Overview/Schedule/Shifts/
// Earnings/Mileage/Expenses/Vehicle/Taxes/Analytics), same tab-shell
// pattern as Health Monitoring. Schedule reuses the global Calendar
// (appointments, category="work") instead of a second calendar; every
// number on Overview/Earnings/Mileage/Taxes/Analytics is derived here
// from stored shifts/earnings/expenses via lib/work/gig-calculations,
// never hardcoded.
export default async function GigDrivingPage() {
  const t = await getTranslations("gigDriving");
  const now = new Date();
  const scheduleRangeStart = new Date(now.getTime() - 30 * 86_400_000);
  const scheduleRangeEnd = new Date(now.getTime() + 90 * 86_400_000);

  const [
    vehicles,
    shiftsWithRelations,
    inProgressShift,
    taxSettingsList,
    occurrences,
    conditions,
    allAppointments,
    expenses,
    maintenanceRecords,
    allDocuments,
  ] = await Promise.all([
    listGigVehicles(),
    listGigShiftsWithRelations(),
    getInProgressGigShift(),
    listGigTaxSettings(),
    listAppointmentOccurrences(scheduleRangeStart, scheduleRangeEnd),
    listConditions(),
    listAppointments(),
    listGigExpenses(),
    listGigVehicleMaintenance(),
    listPersonalDocuments(),
  ]);

  const workOccurrences = occurrences
    .filter((o) => o.appointment.category === "work")
    .filter((o) => new Date(o.occurrenceStart).getTime() >= now.getTime())
    .sort((a, b) => a.occurrenceStart.localeCompare(b.occurrenceStart));

  const completedShifts = shiftsWithRelations.filter((s) => s.status === "completed");

  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekShifts = completedShifts.filter((s) => new Date(`${s.date}T00:00:00`) >= weekStart);
  const weekMetrics = computeGigMetrics(weekShifts);

  const overallMetrics = computeGigMetrics(completedShifts);
  const platformBreakdown = computePlatformBreakdown(completedShifts);

  const nextOccurrence = workOccurrences[0];
  const nextShiftLabel = nextOccurrence
    ? `${nextOccurrence.appointment.title ?? t("overview.untitledShift")} — ${new Date(nextOccurrence.occurrenceStart).toLocaleString()}`
    : null;

  const maintenanceByVehicle: Record<string, GigVehicleMaintenance[]> = {};
  for (const record of maintenanceRecords) {
    (maintenanceByVehicle[record.vehicle_id] ??= []).push(record);
  }

  const documentsByGigExpenseId: Record<string, PersonalDocument[]> = {};
  const documentsByGigMaintenanceId: Record<string, PersonalDocument[]> = {};
  for (const doc of allDocuments) {
    if (doc.related_gig_expense_id) (documentsByGigExpenseId[doc.related_gig_expense_id] ??= []).push(doc);
    if (doc.related_gig_maintenance_id) (documentsByGigMaintenanceId[doc.related_gig_maintenance_id] ??= []).push(doc);
  }

  const taxSettingsByYear: Record<number, GigTaxSettings> = {};
  for (const settings of taxSettingsList) taxSettingsByYear[settings.tax_year] = settings;

  const yearsSet = new Set<number>([now.getFullYear()]);
  for (const shift of completedShifts) yearsSet.add(Number(shift.date.slice(0, 4)));
  for (const settings of taxSettingsList) yearsSet.add(settings.tax_year);
  const years = Array.from(yearsSet).sort((a, b) => b - a);

  const taxSummaries: Record<number, ReturnType<typeof computeTaxYearSummary>> = {};
  for (const year of years) {
    const yearShifts = completedShifts.filter((s) => s.date.startsWith(String(year)));
    const yearExpenses = expenses.filter((e) => e.date.startsWith(String(year)));
    taxSummaries[year] = computeTaxYearSummary(yearShifts, yearExpenses, taxSettingsByYear[year] ?? null);
  }

  const appointmentsById = new Map(allAppointments.map((a) => [a.id, a]));
  const scheduleVsActual = completedShifts
    .filter((s) => s.scheduled_appointment_id && appointmentsById.has(s.scheduled_appointment_id))
    .map((shift) => {
      const appointment = appointmentsById.get(shift.scheduled_appointment_id as string)!;
      return {
        label: `${appointment.title ?? t("overview.untitledShift")} — ${new Date(shift.date).toLocaleDateString()}`,
        result: computeScheduleVsActual(
          { date_time: appointment.date_time, end_time: appointment.end_time, gig_earnings_goal: appointment.gig_earnings_goal },
          shift
        ),
      };
    });

  return (
    <div>
      <h1 className="mb-6 text-3xl font-semibold text-secondary">{t("title")}</h1>

      <GigDrivingTabs
        overview={
          <GigOverviewTab vehicles={vehicles} inProgressShift={inProgressShift} weekMetrics={weekMetrics} nextShiftLabel={nextShiftLabel} />
        }
        schedule={<GigScheduleTab occurrences={workOccurrences} conditions={conditions} />}
        shifts={<GigShiftsTab vehicles={vehicles} inProgressShift={inProgressShift} shifts={shiftsWithRelations} />}
        earnings={<GigEarningsTab overall={overallMetrics} byPlatform={platformBreakdown} />}
        mileage={<GigMileageTab shifts={shiftsWithRelations} />}
        expenses={<GigExpensesTab expenses={expenses} vehicles={vehicles} documentsByExpenseId={documentsByGigExpenseId} />}
        vehicle={
          <GigVehicleTab vehicles={vehicles} maintenanceByVehicle={maintenanceByVehicle} documentsByMaintenanceId={documentsByGigMaintenanceId} />
        }
        taxes={<GigTaxesTab years={years} summaries={taxSummaries} taxSettingsByYear={taxSettingsByYear} vehicles={vehicles} />}
        analytics={<GigAnalyticsTab shifts={shiftsWithRelations} scheduleVsActual={scheduleVsActual} />}
      />
    </div>
  );
}
