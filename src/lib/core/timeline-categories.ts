import type { TimelineEvent } from "@/types/core/entities";

// Health Timeline redesign — groups the flat event feed into a handful
// of tabs that mirror how the events are actually used, not a tab per
// sidebar sub-page (that would be 9+ tabs, most near-empty for most
// users). Classification is driven by related_entity_type (the
// polymorphic FK target — see the TimelineEvent comment in
// types/core/entities.ts), with event_type as the only fallback, for
// the one write site that leaves related_entity_type null
// (vitals-session.ts's "vitals_recorded" summary event).
export const TIMELINE_CATEGORIES = ["care", "medications", "labs", "vitals", "documents"] as const;
export type TimelineCategory = (typeof TIMELINE_CATEGORIES)[number];

const RELATED_ENTITY_TYPE_CATEGORY: Record<string, TimelineCategory> = {
  condition: "care",
  symptom_entry: "care",
  appointment: "care",
  monitoring_item: "care",
  medication: "medications",
  lab_result: "labs",
  diagnostic_test: "labs",
  vital: "vitals",
  body_metric: "vitals",
  workout: "vitals",
  document: "documents",
};

export function classifyTimelineEvent(event: Pick<TimelineEvent, "event_type" | "related_entity_type">): TimelineCategory {
  const category = event.related_entity_type ? RELATED_ENTITY_TYPE_CATEGORY[event.related_entity_type] : undefined;
  if (category) return category;
  // vitals-session.ts writes "vitals_recorded" with no
  // related_entity_type (it summarizes a whole multi-vital check-in,
  // not one record) — the only case that needs the event_type fallback.
  if (event.event_type === "vitals_recorded") return "vitals";
  return "care";
}

// Links to the relevant section page — there's no per-record detail
// page yet, so this points at the section rather than the specific
// record. Keyed by related_entity_type (what the timeline row actually
// carries), NOT event_type — a prior version of this map used
// event_type-shaped keys ("diagnosis", "medication_start", "symptom")
// that never matched the real related_entity_type values their own API
// routes wrote ("condition", "medication", "symptom_entry"), silently
// dropping the "View section" link for those three event types plus
// workout/vital entirely. Fixed here since correct classification
// depends on the same related_entity_type values being right anyway.
export const TIMELINE_ENTITY_TYPE_LINK: Record<string, string> = {
  condition: "/health/conditions",
  medication: "/health/medications",
  lab_result: "/health/labs",
  appointment: "/health/appointments",
  symptom_entry: "/health/symptoms",
  body_metric: "/health/vitals",
  vital: "/health/vitals",
  workout: "/health/exercise",
  document: "/health/documents",
  diagnostic_test: "/health/diagnostic-tests",
  monitoring_item: "/health/monitoring",
};
