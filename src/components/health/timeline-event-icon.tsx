import { Activity, Pill, Dumbbell, FileText, HeartPulse, TestTube, CalendarDays, MonitorCheck, Stethoscope, type LucideIcon } from "lucide-react";
import type { IconCategory } from "@/components/core/category-icon";

// Visual Hierarchy Redesign spec, Section 13: "use icons to distinguish
// [timeline] events." Shared by the Dashboard's "Recent activity" list
// and (eventually) the Health Timeline page itself, so the same event
// always gets the same icon/tint everywhere it's shown — see the
// event_type values actually written by services/core/timeline.ts's
// callers (labs/medications/appointments/etc. API routes).
const EVENT_TYPE_ICON: Record<string, LucideIcon> = {
  lab_result: TestTube,
  medication_start: Pill,
  appointment: CalendarDays,
  document: FileText,
  diagnosis: HeartPulse,
  workout: Dumbbell,
  symptom: Stethoscope,
  monitoring_completed: MonitorCheck,
  vitals_recorded: Activity,
  vital: Activity,
  body_metric: Activity,
};

const EVENT_TYPE_CATEGORY: Record<string, IconCategory> = {
  lab_result: "labs",
  medication_start: "medications",
  appointment: "appointments",
  document: "documents",
  vitals_recorded: "vitals",
  vital: "vitals",
  body_metric: "vitals",
};

export function getTimelineEventIcon(eventType: string): LucideIcon {
  return EVENT_TYPE_ICON[eventType] ?? Activity;
}

export function getTimelineEventCategory(eventType: string): IconCategory {
  return EVENT_TYPE_CATEGORY[eventType] ?? "neutral";
}
