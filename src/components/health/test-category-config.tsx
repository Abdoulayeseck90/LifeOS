import { Biohazard, Activity, Droplets, TestTube, Gauge, CircleDot, Apple, Shield, Droplet, HeartPulse, FlaskConical, type LucideIcon } from "lucide-react";
import type { LabCategory } from "@/types/health/entities";

// Expand Lab Test Selection spec, Section 23. "Virus" doesn't exist in
// the installed lucide-react version (confirmed via a Node check, same
// substitution pattern as SpO2's icon earlier this session) — Biohazard
// substitutes for Hepatitis B / Virology. Inflammation/Immune, Iron/
// Nutrition, Pancreas, and Cardiovascular aren't in the spec's icon
// list (only 7 of the 11 categories are named there); their icons were
// picked to stay visually distinct from every other assigned icon.
export const TEST_CATEGORY_ICON: Record<LabCategory, LucideIcon> = {
  hepatitis_b: Biohazard,
  liver: Activity,
  kidney_renal: Droplets,
  blood_cbc: TestTube,
  metabolic: Gauge,
  thyroid: CircleDot,
  iron_nutrition: Apple,
  inflammation_immune: Shield,
  pancreas: Droplet,
  cardiovascular: HeartPulse,
  other: FlaskConical,
};
