import { useTranslations } from "next-intl";
import { getDaysUntilExpiration } from "@/lib/documents/expiration-status";

// Section 76: "Expires in 45 days" / "Expires tomorrow" / "Expired" —
// all computed live from expiration_date, never stored. Renders nothing
// for a document with no expiration_date, since Section 76 explicitly
// doesn't require one.
export function DocumentExpirationBadge({ expirationDate }: { expirationDate: string | null }) {
  const t = useTranslations("personalDocuments.expiration");
  if (!expirationDate) return null;

  const daysUntil = getDaysUntilExpiration(expirationDate);

  if (daysUntil < 0) {
    return <span className="rounded bg-status-urgent/10 px-2 py-0.5 text-xs font-medium text-status-urgent">{t("expired")}</span>;
  }
  if (daysUntil === 0) {
    return <span className="rounded bg-status-attention/10 px-2 py-0.5 text-xs font-medium text-status-attention">{t("expiresToday")}</span>;
  }
  if (daysUntil === 1) {
    return <span className="rounded bg-status-attention/10 px-2 py-0.5 text-xs font-medium text-status-attention">{t("expiresTomorrow")}</span>;
  }
  const className =
    daysUntil <= 30 ? "bg-status-attention/10 text-status-attention" : "bg-status-normal/10 text-status-normal";
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${className}`}>{t("expiresInDays", { days: daysUntil })}</span>;
}
