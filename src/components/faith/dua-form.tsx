"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Dua, DuaCategory, DuaScheduleType } from "@/types/core/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";
import { FormField } from "@/components/core/form/form-field";
import { LifeOSInput } from "@/components/core/form/lifeos-input";
import { LifeOSSelect } from "@/components/core/form/lifeos-select";
import { LifeOSTextarea } from "@/components/core/form/lifeos-textarea";
import { LifeOSCheckbox } from "@/components/core/form/lifeos-checkbox";
import { LifeOSFormActions } from "@/components/core/form/lifeos-form-actions";

// Section 8's personal-Dua categories — a deliberately different,
// smaller list from the built-in Section 3 taxonomy (both are valid
// values of the same duas.category column, see the migration comment).
const PERSONAL_CATEGORIES: DuaCategory[] = [
  "personal",
  "family",
  "health",
  "work",
  "business",
  "finance",
  "guidance",
  "forgiveness",
  "protection",
  "marriage",
  "travel",
  "goals",
  "other",
];

const SCHEDULE_TYPES: DuaScheduleType[] = ["morning", "evening", "before_sleep", "daily", "custom"];

// Section 7: personal Dua create/edit. "Dua text" is the one required
// content field (stored as `translation` — the same field the detail
// page shows prominently for every Dua, built-in or personal) rather
// than a separate redundant "Translation" field, since for a personal
// Dua both would just be the same English text. Arabic/transliteration
// stay optional (Section 7: "Do NOT require Arabic for personal Duas").
// "Reminder" isn't a per-Dua field here — reminders are configured once
// per named block (Morning/Evening/Before Sleep) on the Dua Overview
// page, not duplicated per Dua.
export function DuaForm({ dua, closeAfterSave, requestClose, registerDirty }: { dua?: Dua } & RecordFormRenderProps) {
  const t = useTranslations("faith.dua.form");
  const tCategories = useTranslations("faith.dua.categories");
  const tSchedule = useTranslations("faith.dua");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [title, setTitle] = useState(dua?.title ?? "");
  const [text, setText] = useState(dua?.translation ?? "");
  const [arabicText, setArabicText] = useState(dua?.arabic_text ?? "");
  const [transliteration, setTransliteration] = useState(dua?.transliteration ?? "");
  const [category, setCategory] = useState<DuaCategory>(dua?.category ?? "personal");
  const [notes, setNotes] = useState(dua?.notes ?? "");
  const [addToRoutine, setAddToRoutine] = useState(false);
  const [scheduleType, setScheduleType] = useState<DuaScheduleType>("daily");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fieldValues = { title, text, arabicText, transliteration, category, notes, addToRoutine, scheduleType };
  const initialSnapshot = useRef(JSON.stringify(fieldValues));
  useEffect(() => {
    registerDirty(JSON.stringify(fieldValues) !== initialSnapshot.current);
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError(t("titleRequired"));
      return;
    }
    if (!text.trim()) {
      setError(t("textRequired"));
      return;
    }

    setSubmitting(true);

    const body = JSON.stringify({
      title: title.trim(),
      translation: text.trim(),
      arabic_text: arabicText.trim() || undefined,
      transliteration: transliteration.trim() || undefined,
      category,
      notes: notes.trim() || undefined,
    });

    const response = dua
      ? await fetch(`/api/faith/duas/${dua.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body })
      : await fetch("/api/faith/duas", { method: "POST", headers: { "Content-Type": "application/json" }, body });

    if (!response.ok) {
      setSubmitting(false);
      setError(t("saveError"));
      return;
    }

    if (!dua && addToRoutine) {
      const { data: newDua } = await response.json();
      await fetch("/api/faith/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dua_id: newDua.id, schedule_type: scheduleType }),
      });
    }

    setSubmitting(false);
    registerDirty(false);
    closeAfterSave();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <p className="text-sm text-status-urgent">{error}</p>}

      <FormField label={t("title")} htmlFor="dua-title" required>
        <LifeOSInput id="dua-title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("titlePlaceholder")} />
      </FormField>

      <FormField label={t("text")} htmlFor="dua-text" required>
        <LifeOSTextarea id="dua-text" required value={text} onChange={(e) => setText(e.target.value)} rows={3} />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("arabicText")} htmlFor="dua-arabic" optional>
          <LifeOSInput id="dua-arabic" type="text" dir="rtl" lang="ar" value={arabicText} onChange={(e) => setArabicText(e.target.value)} />
        </FormField>

        <FormField label={t("transliteration")} htmlFor="dua-transliteration" optional>
          <LifeOSInput id="dua-transliteration" type="text" value={transliteration} onChange={(e) => setTransliteration(e.target.value)} />
        </FormField>

        <FormField label={t("category")} htmlFor="dua-category">
          <LifeOSSelect id="dua-category" value={category} onChange={(e) => setCategory(e.target.value as DuaCategory)}>
            {PERSONAL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {tCategories(c)}
              </option>
            ))}
          </LifeOSSelect>
        </FormField>
      </div>

      {!dua && (
        <div className="flex flex-col gap-3 rounded-card border border-surface p-3">
          <LifeOSCheckbox label={t("addToRoutine")} checked={addToRoutine} onChange={(e) => setAddToRoutine(e.target.checked)} />
          {addToRoutine && (
            <FormField label={t("schedule")} htmlFor="dua-schedule">
              <LifeOSSelect id="dua-schedule" value={scheduleType} onChange={(e) => setScheduleType(e.target.value as DuaScheduleType)}>
                {SCHEDULE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {tSchedule(`scheduleTypes.${type}`)}
                  </option>
                ))}
              </LifeOSSelect>
            </FormField>
          )}
        </div>
      )}

      <FormField label={t("notes")} htmlFor="dua-notes" optional>
        <LifeOSTextarea id="dua-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </FormField>

      <LifeOSFormActions onCancel={requestClose} submitting={submitting} submitLabel={tCommon("save")} />
    </form>
  );
}
