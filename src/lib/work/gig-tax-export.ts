import type { GigVehicle, GigExpense, GigVehicleMaintenance, GigTaxSettings, GigPlatform } from "@/types/work/entities";
import type { PersonalDocument } from "@/types/core/entities";
import type { GigShiftWithRelations, TaxYearSummary } from "@/lib/work/gig-calculations";
import { shiftTotalMiles, computeTaxYearSummary } from "@/lib/work/gig-calculations";

// Tax Filing Export (Gig Driving spec addendum). Every figure here is
// either a straight read of stored records (income/mileage/expenses) or
// explicitly reuses the already-tested computeTaxYearSummary for the
// estimate math -- nothing here invents a number that isn't derivable
// from what the user actually recorded.

function vehicleDisplayName(vehicle: GigVehicle | undefined): string {
  if (!vehicle) return "Unassigned";
  return vehicle.nickname ?? ([vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || vehicle.id);
}

function inTaxYear(dateStr: string, taxYear: number): boolean {
  return dateStr.startsWith(String(taxYear));
}

// A platform filter only excludes items that positively specify a
// *different* platform. Items with no platform at all (e.g. a general
// fuel expense, or vehicle-level maintenance) aren't platform-specific in
// the first place, so filtering by platform never silently drops them --
// dropping them would be inventing an exclusion the data doesn't support.
function matchesPlatformFilter(itemPlatforms: readonly string[] | string | null, filter?: GigPlatform[]): boolean {
  if (!filter || filter.length === 0) return true;
  if (itemPlatforms === null) return true;
  if (typeof itemPlatforms === "string") return filter.includes(itemPlatforms as GigPlatform);
  if (itemPlatforms.length === 0) return true;
  return itemPlatforms.some((p) => filter.includes(p as GigPlatform));
}

export interface GigTaxExportData {
  taxYear: number;
  filters: { vehicleId: string | null; vehicleName: string | null; platforms: GigPlatform[] | null };
  income: { byPlatform: Record<string, number>; total: number };
  mileage: {
    totalMiles: number;
    byPlatform: Record<string, number>;
    byVehicle: { vehicleId: string | null; vehicleName: string; miles: number }[];
    byMonth: { month: string; miles: number }[];
    odometerRecords: {
      shiftId: string;
      date: string;
      vehicleName: string | null;
      startOdometer: number;
      endOdometer: number | null;
      miles: number | null;
    }[];
  };
  expenses: {
    byCategory: Record<string, number>;
    total: number;
    records: {
      id: string;
      date: string;
      category: string;
      amount: number;
      description: string | null;
      vehicleName: string | null;
      hasReceipt: boolean;
    }[];
  };
  // Informational only -- gig_vehicle_maintenance.cost is a separate,
  // optional field from the gig_expenses ledger. Included for context
  // (a receipt can attach directly to a maintenance record) but never
  // added into expenses.total, so a repair logged in both places is
  // never double-counted.
  maintenanceLog: {
    id: string;
    vehicleName: string;
    date: string;
    type: string;
    mileage: number | null;
    cost: number | null;
    hasReceipt: boolean;
  }[];
  receiptIndex: {
    documentId: string;
    documentName: string;
    storagePath: string;
    relatedType: "expense" | "maintenance";
    category: string;
    amount: number | null;
    date: string | null;
  }[];
  summary: TaxYearSummary;
}

export function computeGigTaxExport(input: {
  shifts: GigShiftWithRelations[];
  vehicles: GigVehicle[];
  expenses: GigExpense[];
  maintenance: GigVehicleMaintenance[];
  documents: PersonalDocument[];
  taxSettings: GigTaxSettings | null;
  taxYear: number;
  vehicleId?: string;
  platforms?: GigPlatform[];
}): GigTaxExportData {
  const { taxYear, vehicleId, platforms } = input;
  const vehiclesById = new Map(input.vehicles.map((v) => [v.id, v]));

  const filteredShifts = input.shifts
    .filter((s) => s.status === "completed" && inTaxYear(s.date, taxYear))
    .filter((s) => !vehicleId || s.vehicle_id === vehicleId)
    .filter((s) => matchesPlatformFilter(s.platforms, platforms))
    .map((s) => (platforms && platforms.length > 0 ? { ...s, earnings: s.earnings.filter((e) => platforms.includes(e.platform)) } : s));

  const filteredExpenses = input.expenses
    .filter((e) => inTaxYear(e.date, taxYear))
    .filter((e) => !vehicleId || e.vehicle_id === vehicleId)
    .filter((e) => matchesPlatformFilter(e.platform, platforms));

  const filteredMaintenance = input.maintenance.filter((m) => inTaxYear(m.date, taxYear)).filter((m) => !vehicleId || m.vehicle_id === vehicleId);

  const expenseIds = new Set(filteredExpenses.map((e) => e.id));
  const maintenanceIds = new Set(filteredMaintenance.map((m) => m.id));

  // Income
  const incomeByPlatform: Record<string, number> = {};
  let incomeTotal = 0;
  for (const shift of filteredShifts) {
    for (const earning of shift.earnings) {
      const total = earning.gross + earning.tips + earning.bonuses + earning.other;
      incomeByPlatform[earning.platform] = (incomeByPlatform[earning.platform] ?? 0) + total;
      incomeTotal += total;
    }
  }

  // Mileage -- same documented simplification as computePlatformBreakdown:
  // a multi-platform shift's miles count toward every platform it
  // included, since the app has no way to split them precisely.
  const mileageByPlatform: Record<string, number> = {};
  const mileageByVehicle = new Map<string, number>();
  const mileageByMonth = new Map<string, number>();
  let totalMiles = 0;

  for (const shift of filteredShifts) {
    const miles = shiftTotalMiles(shift) ?? 0;
    totalMiles += miles;
    for (const platform of shift.platforms) {
      mileageByPlatform[platform] = (mileageByPlatform[platform] ?? 0) + miles;
    }
    const vehicleKey = shift.vehicle_id ?? "";
    mileageByVehicle.set(vehicleKey, (mileageByVehicle.get(vehicleKey) ?? 0) + miles);
    const monthKey = shift.date.slice(0, 7);
    mileageByMonth.set(monthKey, (mileageByMonth.get(monthKey) ?? 0) + miles);
  }

  const odometerRecords = filteredShifts
    .map((shift) => ({
      shiftId: shift.id,
      date: shift.date,
      vehicleName: shift.vehicle_id ? vehicleDisplayName(vehiclesById.get(shift.vehicle_id)) : null,
      startOdometer: shift.start_odometer,
      endOdometer: shift.end_odometer,
      miles: shiftTotalMiles(shift),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Expenses
  const expensesByCategory: Record<string, number> = {};
  let expensesTotal = 0;
  for (const expense of filteredExpenses) {
    expensesByCategory[expense.category] = (expensesByCategory[expense.category] ?? 0) + expense.amount;
    expensesTotal += expense.amount;
  }

  const documentsByExpenseId = new Map<string, PersonalDocument[]>();
  const documentsByMaintenanceId = new Map<string, PersonalDocument[]>();
  for (const doc of input.documents) {
    if (doc.related_gig_expense_id) {
      documentsByExpenseId.set(doc.related_gig_expense_id, [...(documentsByExpenseId.get(doc.related_gig_expense_id) ?? []), doc]);
    }
    if (doc.related_gig_maintenance_id) {
      documentsByMaintenanceId.set(doc.related_gig_maintenance_id, [...(documentsByMaintenanceId.get(doc.related_gig_maintenance_id) ?? []), doc]);
    }
  }

  const expenseRecords = filteredExpenses
    .map((expense) => ({
      id: expense.id,
      date: expense.date,
      category: expense.category,
      amount: expense.amount,
      description: expense.description,
      vehicleName: expense.vehicle_id ? vehicleDisplayName(vehiclesById.get(expense.vehicle_id)) : null,
      hasReceipt: (documentsByExpenseId.get(expense.id)?.length ?? 0) > 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const maintenanceLog = filteredMaintenance
    .map((record) => ({
      id: record.id,
      vehicleName: vehicleDisplayName(vehiclesById.get(record.vehicle_id)),
      date: record.date,
      type: record.type,
      mileage: record.mileage,
      cost: record.cost,
      hasReceipt: (documentsByMaintenanceId.get(record.id)?.length ?? 0) > 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const receiptIndex = input.documents
    .filter((doc) => (doc.related_gig_expense_id && expenseIds.has(doc.related_gig_expense_id)) || (doc.related_gig_maintenance_id && maintenanceIds.has(doc.related_gig_maintenance_id)))
    .map((doc) => {
      if (doc.related_gig_expense_id) {
        const expense = filteredExpenses.find((e) => e.id === doc.related_gig_expense_id)!;
        return {
          documentId: doc.id,
          documentName: doc.name,
          storagePath: doc.storage_path,
          relatedType: "expense" as const,
          category: expense.category,
          amount: expense.amount,
          date: expense.date,
        };
      }
      const maintenance = filteredMaintenance.find((m) => m.id === doc.related_gig_maintenance_id)!;
      return {
        documentId: doc.id,
        documentName: doc.name,
        storagePath: doc.storage_path,
        relatedType: "maintenance" as const,
        category: maintenance.type,
        amount: maintenance.cost,
        date: maintenance.date,
      };
    });

  return {
    taxYear,
    filters: {
      vehicleId: vehicleId ?? null,
      vehicleName: vehicleId ? vehicleDisplayName(vehiclesById.get(vehicleId)) : null,
      platforms: platforms && platforms.length > 0 ? platforms : null,
    },
    income: { byPlatform: incomeByPlatform, total: incomeTotal },
    mileage: {
      totalMiles,
      byPlatform: mileageByPlatform,
      byVehicle: Array.from(mileageByVehicle.entries()).map(([id, miles]) => ({
        vehicleId: id || null,
        vehicleName: id ? vehicleDisplayName(vehiclesById.get(id)) : "Unassigned",
        miles,
      })),
      byMonth: Array.from(mileageByMonth.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, miles]) => ({ month, miles })),
      odometerRecords,
    },
    expenses: { byCategory: expensesByCategory, total: expensesTotal, records: expenseRecords },
    maintenanceLog,
    receiptIndex,
    summary: computeTaxYearSummary(filteredShifts, filteredExpenses, input.taxSettings),
  };
}
