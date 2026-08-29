"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import type { Business } from "@/types/core/entities";
import { BusinessStatusBadge } from "@/components/planning/business-status-badge";
import { BusinessForm } from "@/components/planning/business-form";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { ConfirmDialog } from "@/components/core/confirm-dialog";

export function BusinessCard({ business }: { business: Business }) {
  const t = useTranslations("planning.businesses");
  const tCommon = useTranslations("common");
  const router = useRouter();

  async function handleDelete() {
    const response = await fetch(`/api/planning/businesses/${business.id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }

  return (
    <div className="rounded-card border border-surface bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href={`/business/${business.id}`} className="truncate font-medium text-secondary hover:text-primary">
            {business.name}
          </Link>
          {business.category && <p className="mt-0.5 text-xs text-muted">{business.category}</p>}
        </div>
        <BusinessStatusBadge status={business.status} />
      </div>

      {business.description && <p className="mt-2 line-clamp-2 text-sm text-muted">{business.description}</p>}

      <div className="mt-3 flex gap-4">
        <Link href={`/business/${business.id}`} className="text-xs text-primary hover:underline">
          {tCommon("view")}
        </Link>
        <RecordFormModal
          trigger={(open) => (
            <button type="button" onClick={open} className="text-xs text-primary hover:underline">
              {tCommon("edit")}
            </button>
          )}
          modalTitle={t("editTitle")}
        >
          {(modalProps) => <BusinessForm business={business} {...modalProps} />}
        </RecordFormModal>
        <ConfirmDialog
          trigger={(open) => (
            <button type="button" onClick={open} className="text-xs text-status-urgent hover:underline">
              {tCommon("delete")}
            </button>
          )}
          title={t("deleteConfirmTitle")}
          description={t("deleteConfirmMessage")}
          onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}
