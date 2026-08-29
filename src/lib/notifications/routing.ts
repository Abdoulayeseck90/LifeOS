// Where a notification/reminder should take the user on click (Spec
// Section 9: "Clicking a notification should take the user to the
// relevant LifeOS page"). Shared by the notification bell and the full
// /notifications page — one mapping, not two independently-guessed ones.
const PATH_BY_ENTITY_TYPE: Record<string, string> = {
  appointment: "/health/appointments",
  monitoring_item: "/health/monitoring",
  lab_result: "/health/labs",
  medication: "/health/medications",
  body_metric: "/health/vitals",
  vital: "/health/vitals",
  workout: "/health/exercise",
  condition: "/health/conditions",
  document: "/health/documents",
  symptom_entry: "/health/symptoms",
  diagnostic_test: "/health/diagnostic-tests",
};

export function getNotificationHref(relatedEntityType: string | null): string {
  if (!relatedEntityType) return "/notifications";
  return PATH_BY_ENTITY_TYPE[relatedEntityType] ?? "/notifications";
}
