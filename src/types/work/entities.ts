// Gig Driving work module (0050_gig_driving.sql). Schedule items live
// on the shared `appointments` table (category="work") instead of a
// second calendar concept — see Appointment.gig_platforms/
// gig_earnings_goal in types/health/entities.ts. Earnings/expenses are
// deliberately their own tables, never written into finance_transactions
// (see the migration's own comment on why).

export type GigPlatform = "doordash" | "ubereats" | "spark" | "other";
export type GigShiftStatus = "in_progress" | "completed" | "cancelled";
export type GigMaintenanceType = "oil_change" | "tire_rotation" | "tire_replacement" | "brake_service" | "repair" | "other";
export type GigExpenseCategory = "fuel" | "maintenance" | "tires" | "repairs" | "car_wash" | "parking" | "tolls" | "phone" | "insurance" | "other";

export interface GigVehicle {
  id: string;
  user_id: string;
  make: string | null;
  model: string | null;
  year: number | null;
  nickname: string | null;
  license_plate_last4: string | null;
  current_odometer: number | null;
  insurance_expiration: string | null;
  registration_expiration: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GigVehicleMaintenance {
  id: string;
  user_id: string;
  vehicle_id: string;
  date: string;
  type: GigMaintenanceType;
  mileage: number | null;
  cost: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GigShift {
  id: string;
  user_id: string;
  vehicle_id: string | null;
  date: string;
  start_time: string;
  end_time: string | null;
  start_odometer: number;
  end_odometer: number | null;
  platforms: GigPlatform[];
  notes: string | null;
  status: GigShiftStatus;
  scheduled_appointment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GigEarning {
  id: string;
  user_id: string;
  shift_id: string;
  platform: GigPlatform;
  gross: number;
  tips: number;
  bonuses: number;
  other: number;
  created_at: string;
}

export interface GigExpense {
  id: string;
  user_id: string;
  vehicle_id: string | null;
  shift_id: string | null;
  platform: GigPlatform | null;
  category: GigExpenseCategory;
  amount: number;
  date: string;
  description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GigTaxSettings {
  id: string;
  user_id: string;
  tax_year: number;
  standard_mileage_rate: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// One earnings-per-platform row submitted as part of ending a shift
// (end_gig_shift() writes these atomically alongside the shift itself).
export interface GigShiftEarningInput {
  platform: GigPlatform;
  gross: number;
  tips?: number;
  bonuses?: number;
  other?: number;
}

export interface GigShiftExpenseInput {
  category: GigExpenseCategory;
  amount: number;
  description?: string;
  platform?: GigPlatform;
}

// Audit snapshot of a generated "final tax package" (0051_gig_tax_export.sql)
// -- never a lock on the underlying shifts/earnings/expenses, just a record
// of exactly what totals/counts a given downloaded package contained.
export interface GigTaxExport {
  id: string;
  user_id: string;
  tax_year: number;
  vehicle_id: string | null;
  platforms: GigPlatform[] | null;
  generated_at: string;
  income_record_count: number;
  mileage_record_count: number;
  expense_record_count: number;
  total_income: number;
  total_mileage: number;
  total_expenses: number;
  snapshot: unknown;
  created_at: string;
}
