import { describe, it, expect } from "vitest";
import { computeGigTaxExport } from "@/lib/work/gig-tax-export";
import type { GigShiftWithRelations } from "@/lib/work/gig-calculations";
import type { GigEarning, GigExpense, GigVehicle, GigVehicleMaintenance, GigTaxSettings } from "@/types/work/entities";
import type { PersonalDocument } from "@/types/core/entities";

function vehicle(overrides: Partial<GigVehicle> = {}): GigVehicle {
  return {
    id: "vehicle-1",
    user_id: "user-1",
    make: "Toyota",
    model: "Camry",
    year: 2020,
    nickname: null,
    license_plate_last4: null,
    current_odometer: null,
    insurance_expiration: null,
    registration_expiration: null,
    notes: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function earning(overrides: Partial<GigEarning> = {}): GigEarning {
  return {
    id: "earning-1",
    user_id: "user-1",
    shift_id: "shift-1",
    platform: "doordash",
    gross: 100,
    tips: 0,
    bonuses: 0,
    other: 0,
    created_at: "2026-09-05T21:00:00.000Z",
    ...overrides,
  };
}

function shift(overrides: Partial<GigShiftWithRelations> = {}): GigShiftWithRelations {
  return {
    id: "shift-1",
    user_id: "user-1",
    vehicle_id: "vehicle-1",
    date: "2026-09-05",
    start_time: "2026-09-05T21:00:00.000Z",
    end_time: "2026-09-06T01:27:00.000Z",
    start_odometer: 1000,
    end_odometer: 1088,
    platforms: ["doordash"],
    notes: null,
    status: "completed",
    scheduled_appointment_id: null,
    created_at: "2026-09-05T21:00:00.000Z",
    updated_at: "2026-09-06T01:27:00.000Z",
    earnings: [],
    expenses: [],
    ...overrides,
  };
}

function expense(overrides: Partial<GigExpense> = {}): GigExpense {
  return {
    id: "expense-1",
    user_id: "user-1",
    vehicle_id: "vehicle-1",
    shift_id: null,
    platform: null,
    category: "fuel",
    amount: 18,
    date: "2026-09-05",
    description: null,
    notes: null,
    created_at: "2026-09-05T21:00:00.000Z",
    updated_at: "2026-09-05T21:00:00.000Z",
    ...overrides,
  };
}

function maintenance(overrides: Partial<GigVehicleMaintenance> = {}): GigVehicleMaintenance {
  return {
    id: "maintenance-1",
    user_id: "user-1",
    vehicle_id: "vehicle-1",
    date: "2026-09-05",
    type: "oil_change",
    mileage: 1050,
    cost: 60,
    notes: null,
    created_at: "2026-09-05T00:00:00.000Z",
    updated_at: "2026-09-05T00:00:00.000Z",
    ...overrides,
  };
}

function taxSettings(overrides: Partial<GigTaxSettings> = {}): GigTaxSettings {
  return {
    id: "tax-1",
    user_id: "user-1",
    tax_year: 2026,
    standard_mileage_rate: 0.67,
    notes: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function document(overrides: Partial<PersonalDocument> = {}): PersonalDocument {
  return {
    id: "doc-1",
    user_id: "user-1",
    name: "receipt.pdf",
    document_type: "receipt",
    storage_path: "user-1/doc-1/receipt.pdf",
    mime_type: "application/pdf",
    file_size: 1000,
    category: null,
    description: null,
    tags: [],
    expiration_date: null,
    reminders_enabled: false,
    reminder_lead_days: null,
    pinned: false,
    notes: null,
    merchant: null,
    amount: null,
    purchase_date: null,
    payment_method: null,
    related_expense_id: null,
    related_gig_expense_id: null,
    related_gig_maintenance_id: null,
    created_at: "2026-09-05T00:00:00.000Z",
    updated_at: "2026-09-05T00:00:00.000Z",
    ...overrides,
  };
}

describe("computeGigTaxExport", () => {
  it("aggregates income, mileage, and expenses for the given tax year only", () => {
    const data = computeGigTaxExport({
      shifts: [shift({ earnings: [earning({ gross: 100 })] }), shift({ id: "shift-2025", date: "2025-12-31", earnings: [earning({ gross: 999 })] })],
      vehicles: [vehicle()],
      expenses: [expense({ amount: 18 }), expense({ id: "expense-2025", date: "2025-12-31", amount: 999 })],
      maintenance: [],
      documents: [],
      taxSettings: taxSettings(),
      taxYear: 2026,
    });

    expect(data.income.total).toBe(100);
    expect(data.mileage.totalMiles).toBe(88);
    expect(data.expenses.total).toBe(18);
  });

  it("filters by vehicle when a vehicleId is given", () => {
    const data = computeGigTaxExport({
      shifts: [
        shift({ id: "s1", vehicle_id: "vehicle-1", earnings: [earning({ gross: 100 })] }),
        shift({ id: "s2", vehicle_id: "vehicle-2", earnings: [earning({ gross: 50 })] }),
      ],
      vehicles: [vehicle({ id: "vehicle-1" }), vehicle({ id: "vehicle-2", nickname: "Second Car" })],
      expenses: [expense({ vehicle_id: "vehicle-1", amount: 18 }), expense({ id: "e2", vehicle_id: "vehicle-2", amount: 40 })],
      maintenance: [],
      documents: [],
      taxSettings: null,
      taxYear: 2026,
      vehicleId: "vehicle-1",
    });

    expect(data.income.total).toBe(100);
    expect(data.expenses.total).toBe(18);
    expect(data.filters.vehicleName).toBe("2020 Toyota Camry");
  });

  it("filters shifts by platform but keeps platform-agnostic expenses (never invents an exclusion the data doesn't support)", () => {
    const data = computeGigTaxExport({
      shifts: [
        shift({ id: "s1", platforms: ["doordash"], earnings: [earning({ platform: "doordash", gross: 100 })] }),
        shift({ id: "s2", platforms: ["spark"], earnings: [earning({ platform: "spark", gross: 50 })] }),
      ],
      vehicles: [vehicle()],
      expenses: [expense({ platform: null, amount: 18 }), expense({ id: "e2", platform: "spark", amount: 12 })],
      maintenance: [],
      documents: [],
      taxSettings: null,
      taxYear: 2026,
      platforms: ["doordash"],
    });

    expect(data.income.total).toBe(100);
    expect(data.mileage.totalMiles).toBe(88); // only the doordash shift
    // The null-platform expense is kept (never excluded just for not specifying
    // a platform); the spark-tagged one is correctly excluded since it
    // positively specifies a platform outside the filter.
    expect(data.expenses.total).toBe(18);
  });

  it("keeps maintenance cost out of the expenses total (informational only, avoids double-counting)", () => {
    const data = computeGigTaxExport({
      shifts: [shift({ earnings: [earning({ gross: 100 })] })],
      vehicles: [vehicle()],
      expenses: [expense({ amount: 18 })],
      maintenance: [maintenance({ cost: 60 })],
      documents: [],
      taxSettings: null,
      taxYear: 2026,
    });

    expect(data.expenses.total).toBe(18);
    expect(data.maintenanceLog).toHaveLength(1);
    expect(data.maintenanceLog[0]?.cost).toBe(60);
  });

  it("links receipts to their expense/maintenance record via the receipt index and hasReceipt flags", () => {
    const data = computeGigTaxExport({
      shifts: [shift({ earnings: [earning({ gross: 100 })] })],
      vehicles: [vehicle()],
      expenses: [expense({ id: "expense-with-receipt", amount: 18 })],
      maintenance: [maintenance({ id: "maintenance-with-receipt", cost: 60 })],
      documents: [
        document({ id: "doc-expense", related_gig_expense_id: "expense-with-receipt" }),
        document({ id: "doc-maintenance", related_gig_maintenance_id: "maintenance-with-receipt" }),
        document({ id: "doc-unrelated" }),
      ],
      taxSettings: null,
      taxYear: 2026,
    });

    expect(data.receiptIndex).toHaveLength(2);
    expect(data.expenses.records[0]?.hasReceipt).toBe(true);
    expect(data.maintenanceLog[0]?.hasReceipt).toBe(true);
  });

  it("includes an insurance expense in the expenses total", () => {
    const data = computeGigTaxExport({
      shifts: [],
      vehicles: [vehicle()],
      expenses: [expense({ category: "insurance", amount: 120 })],
      maintenance: [],
      documents: [],
      taxSettings: null,
      taxYear: 2026,
    });

    expect(data.expenses.byCategory.insurance).toBe(120);
    expect(data.expenses.total).toBe(120);
  });

  it("reports a null mileage rate/deduction (not a fallback number) when no tax settings exist for the year", () => {
    const data = computeGigTaxExport({
      shifts: [shift({ earnings: [earning({ gross: 100 })] })],
      vehicles: [vehicle()],
      expenses: [],
      maintenance: [],
      documents: [],
      taxSettings: null,
      taxYear: 2026,
    });

    expect(data.summary.mileageRate).toBeNull();
    expect(data.summary.estimatedMileageDeduction).toBeNull();
  });

  it("produces an empty-but-valid export for a tax year with no data at all", () => {
    const data = computeGigTaxExport({
      shifts: [],
      vehicles: [],
      expenses: [],
      maintenance: [],
      documents: [],
      taxSettings: null,
      taxYear: 2030,
    });

    expect(data.income.total).toBe(0);
    expect(data.mileage.totalMiles).toBe(0);
    expect(data.expenses.total).toBe(0);
    expect(data.receiptIndex).toHaveLength(0);
    expect(data.summary.estimatedNetProfit).toBe(0);
  });
});
