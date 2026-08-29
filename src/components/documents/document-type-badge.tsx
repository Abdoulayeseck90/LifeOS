import { useTranslations } from "next-intl";
import type { PersonalDocumentType } from "@/types/core/entities";

export function DocumentTypeBadge({ type }: { type: PersonalDocumentType }) {
  const t = useTranslations("personalDocuments.types");
  return <span className="rounded bg-surface px-2 py-0.5 text-xs font-medium text-secondary">{t(type)}</span>;
}
