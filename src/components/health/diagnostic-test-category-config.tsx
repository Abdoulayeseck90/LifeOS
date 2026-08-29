import { Scan, HeartPulse, Microscope, Bug, FlaskConical, type LucideIcon } from "lucide-react";
import type { DiagnosticTestCategory } from "@/types/health/entities";

// Single source of truth for the 5 fixed diagnostic categories — icons,
// tab order, and each category's test_type dropdown options — shared by
// the category picker, the tab navigation, the form, the card, and the
// history filters, so adding/renaming a category later means editing
// this one file (same pattern as vital-type-config.tsx).
export const DIAGNOSTIC_CATEGORIES: DiagnosticTestCategory[] = ["imaging", "cardiology", "pathology", "microbiology", "other"];

export const DIAGNOSTIC_CATEGORY_ICON: Record<DiagnosticTestCategory, LucideIcon> = {
  imaging: Scan,
  cardiology: HeartPulse,
  pathology: Microscope,
  microbiology: Bug,
  other: FlaskConical,
};

// "other" has no fixed test_type list — Section 9 asks for a free-text
// test NAME there instead of a dropdown, which test_type's already-free-
// text column supports natively (no schema change). "fibroscan"/"dexa"
// are pre-existing test types (Addendum Section 3's FibroScan feature
// predates this redesign) folded into Imaging rather than dropped.
export const TEST_TYPE_OPTIONS_BY_CATEGORY: Record<Exclude<DiagnosticTestCategory, "other">, string[]> = {
  imaging: ["ultrasound", "xray", "mri", "ct", "pet", "fibroscan", "dexa", "other"],
  cardiology: ["ecg", "echocardiogram", "stress_test", "holter_monitor", "other"],
  pathology: ["biopsy", "other"],
  microbiology: ["culture", "microbiology_testing", "other"],
};
