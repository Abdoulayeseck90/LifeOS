"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Condition } from "@/types/health/entities";
import type { Document } from "@/types/core/entities";
import type { DiagnosticTestCategory } from "@/types/health/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";
import { DIAGNOSTIC_CATEGORIES, DIAGNOSTIC_CATEGORY_ICON } from "@/components/health/diagnostic-test-category-config";
import { DiagnosticTestForm } from "@/components/health/diagnostic-test-form";

// The "+ Add Diagnostic Test" flow (Spec Section 4): first ask which
// category, then show the matching form — one modal, two steps, not
// five separate add flows. `key={category}` forces the form to remount
// fresh if the user goes back and picks a different category.
export function DiagnosticTestRecordForm({
  conditions,
  documents,
  ...props
}: { conditions: Condition[]; documents: Document[] } & RecordFormRenderProps) {
  const t = useTranslations("diagnosticTests");
  const [category, setCategory] = useState<DiagnosticTestCategory | null>(null);

  if (!category) {
    return (
      <div>
        <p className="mb-4 text-sm text-secondary">{t("form.pickCategoryPrompt")}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {DIAGNOSTIC_CATEGORIES.map((cat) => {
            const Icon = DIAGNOSTIC_CATEGORY_ICON[cat];
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-card border border-surface bg-white p-4 text-center hover:border-primary hover:bg-primary/5"
              >
                <Icon size={22} className="text-primary" />
                <span className="text-sm font-medium text-secondary">{t(`categories.${cat}.label`)}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <button type="button" onClick={() => setCategory(null)} className="mb-3 text-xs text-primary hover:underline">
        ← {t("form.changeCategory")}
      </button>
      <DiagnosticTestForm key={category} category={category} conditions={conditions} documents={documents} {...props} />
    </div>
  );
}
