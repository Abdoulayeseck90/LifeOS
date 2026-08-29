import { useTranslations } from "next-intl";
import { CloudOff, AlertCircle } from "lucide-react";

// First shared "offline pending sync" indicator in the app — scoped to
// exactly the 4 offline-eligible features. Never claims success until
// the server actually confirms it (Offline Strategy spec) — this badge
// is the visible proof that a record hasn't synced yet, not a "don't
// worry" reassurance.
export function PendingSyncBadge({ status = "pending" }: { status?: "pending" | "error" }) {
  const t = useTranslations("common.offline");

  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-status-urgent/10 px-2 py-0.5 text-xs font-medium text-status-urgent">
        <AlertCircle size={12} />
        {t("syncError")}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded bg-status-attention/10 px-2 py-0.5 text-xs font-medium text-status-attention">
      <CloudOff size={12} />
      {t("pendingSync")}
    </span>
  );
}
