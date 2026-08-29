"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LifeOSTextarea } from "@/components/core/form/lifeos-textarea";

// Section 20: private notes on a Dua ("Read this before starting
// work.") — visible only to the user who wrote them.
export function DuaNoteField({ duaId, initialNotes }: { duaId: string; initialNotes: string }) {
  const t = useTranslations("faith.dua");
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);

  async function handleBlur() {
    if (notes === initialNotes) return;
    setSaving(true);
    await fetch(`/api/faith/duas/${duaId}/notes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div>
      <label htmlFor="dua-private-note" className="text-sm font-medium text-secondary">
        {t("myNotes")}
      </label>
      <LifeOSTextarea
        id="dua-private-note"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={handleBlur}
        rows={2}
        placeholder={t("myNotesPlaceholder")}
        className="mt-1.5"
      />
      {saving && <p className="mt-1 text-xs text-muted">{t("saving")}</p>}
    </div>
  );
}
