import { z } from "zod";

// Gig Driving work module (0050_gig_driving.sql). Server-side validation
// per Spec Section 30 — same pattern as validation/core.ts and
// validation/health.ts.

const gigPlatformSchema = z.enum(["doordash", "ubereats", "spark", "other"]);

export const gigVehicleInputSchema = z.object({
  make: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  nickname: z.string().max(100).optional(),
  license_plate_last4: z.string().max(4).regex(/^[A-Za-z0-9]*$/).optional(),
  current_odometer: z.number().nonnegative().optional(),
  insurance_expiration: z.string().date().optional(),
  registration_expiration: z.string().date().optional(),
  notes: z.string().optional(),
});
export type GigVehicleInput = z.infer<typeof gigVehicleInputSchema>;
export const gigVehicleUpdateSchema = gigVehicleInputSchema.partial();
export type GigVehicleUpdateInput = z.infer<typeof gigVehicleUpdateSchema>;

export const gigVehicleMaintenanceInputSchema = z.object({
  vehicle_id: z.string().uuid(),
  date: z.string().date(),
  type: z.enum(["oil_change", "tire_rotation", "tire_replacement", "brake_service", "repair", "other"]),
  mileage: z.number().nonnegative().optional(),
  cost: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});
export type GigVehicleMaintenanceInput = z.infer<typeof gigVehicleMaintenanceInputSchema>;
export const gigVehicleMaintenanceUpdateSchema = gigVehicleMaintenanceInputSchema.partial();
export type GigVehicleMaintenanceUpdateInput = z.infer<typeof gigVehicleMaintenanceUpdateSchema>;

// Quick Start: the fast, minimal-field flow the spec explicitly calls
// for ("the user may be standing next to their vehicle") — just
// odometer + platform(s), everything else defaults server-side.
export const gigShiftStartSchema = z.object({
  vehicle_id: z.string().uuid().optional(),
  start_odometer: z.number().nonnegative(),
  platforms: z.array(gigPlatformSchema).min(1),
  scheduled_appointment_id: z.string().uuid().optional(),
  notes: z.string().optional(),
});
export type GigShiftStartInput = z.infer<typeof gigShiftStartSchema>;

const gigShiftEarningSchema = z.object({
  platform: gigPlatformSchema,
  gross: z.number().nonnegative(),
  tips: z.number().nonnegative().optional(),
  bonuses: z.number().nonnegative().optional(),
  other: z.number().nonnegative().optional(),
});

const gigShiftExpenseSchema = z.object({
  category: z.enum(["fuel", "maintenance", "tires", "repairs", "car_wash", "parking", "tolls", "phone", "insurance", "other"]),
  amount: z.number().positive(),
  description: z.string().optional(),
  platform: gigPlatformSchema.optional(),
});

// Quick End: odometer + per-platform earnings (+ optional expenses),
// written atomically by end_gig_shift() (0050_gig_driving.sql).
export const gigShiftEndSchema = z.object({
  end_odometer: z.number().nonnegative(),
  notes: z.string().optional(),
  earnings: z.array(gigShiftEarningSchema).default([]),
  expenses: z.array(gigShiftExpenseSchema).default([]),
});
export type GigShiftEndInput = z.infer<typeof gigShiftEndSchema>;

export const gigExpenseInputSchema = z.object({
  vehicle_id: z.string().uuid().optional(),
  shift_id: z.string().uuid().optional(),
  platform: gigPlatformSchema.optional(),
  category: z.enum(["fuel", "maintenance", "tires", "repairs", "car_wash", "parking", "tolls", "phone", "insurance", "other"]),
  amount: z.number().positive(),
  date: z.string().date(),
  description: z.string().optional(),
  notes: z.string().optional(),
});
export type GigExpenseInput = z.infer<typeof gigExpenseInputSchema>;
export const gigExpenseUpdateSchema = gigExpenseInputSchema.partial();
export type GigExpenseUpdateInput = z.infer<typeof gigExpenseUpdateSchema>;

export const gigTaxSettingsInputSchema = z.object({
  tax_year: z.number().int().min(2000).max(2100),
  standard_mileage_rate: z.number().positive(),
  notes: z.string().optional(),
});
export type GigTaxSettingsInput = z.infer<typeof gigTaxSettingsInputSchema>;
export const gigTaxSettingsUpdateSchema = gigTaxSettingsInputSchema.partial();
export type GigTaxSettingsUpdateInput = z.infer<typeof gigTaxSettingsUpdateSchema>;

// Tax Filing Export -- shared filter shape for preview/csv/xlsx/pdf/package.
// vehicle_id/platforms narrow the tax-year data; tax_year is the only
// required filter.
export const gigTaxExportFilterSchema = z.object({
  tax_year: z.number().int().min(2000).max(2100),
  vehicle_id: z.string().uuid().optional(),
  platforms: z.array(gigPlatformSchema).min(1).optional(),
});
export type GigTaxExportFilterInput = z.infer<typeof gigTaxExportFilterSchema>;
