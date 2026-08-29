"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Business, Goal, Note, Project } from "@/types/core/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";
import { FormField } from "@/components/core/form/form-field";
import { LifeOSInput } from "@/components/core/form/lifeos-input";
import { LifeOSSelect } from "@/components/core/form/lifeos-select";
import { LifeOSTextarea } from "@/components/core/form/lifeos-textarea";
import { LifeOSFormActions } from "@/components/core/form/lifeos-form-actions";
import { attemptFetch } from "@/lib/offline/attempt-fetch";
import { getDB } from "@/lib/offline/db";
import { enqueue, SYNC_UPDATED_EVENT } from "@/lib/offline/sync-queue";

const CATEGORIES = ["health", "planning", "finance", "business", "personal", "general"] as const;

function toArray(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

// Notes spec, Section 35: title + content is the fast path — category/
// tags/relations sit behind "More details" so the editor prioritizes
// typing space, especially on a phone.
export function NoteForm({
  note,
  projects,
  goals,
  businesses,
  defaultProjectId,
  defaultGoalId,
  defaultBusinessId,
  closeAfterSave,
  requestClose,
  registerDirty,
}: {
  note?: Note;
  projects: Project[];
  goals: Goal[];
  businesses: Business[];
  defaultProjectId?: string;
  defaultGoalId?: string;
  defaultBusinessId?: string;
} & RecordFormRenderProps) {
  const t = useTranslations("notes.form");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [category, setCategory] = useState(note?.related_domain ?? "");
  const [tags, setTags] = useState(note?.tags.join(", ") ?? "");
  const [projectId, setProjectId] = useState(note?.related_project_id ?? defaultProjectId ?? "");
  const [goalId, setGoalId] = useState(note?.related_goal_id ?? defaultGoalId ?? "");
  const [businessId, setBusinessId] = useState(note?.related_business_id ?? defaultBusinessId ?? "");
  const [expanded, setExpanded] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fieldValues = { title, content, category, tags, projectId, goalId, businessId };
  const initialSnapshot = useRef(JSON.stringify(fieldValues));
  useEffect(() => {
    registerDirty(JSON.stringify(fieldValues) !== initialSnapshot.current);
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!content.trim()) {
      setError(t("contentRequired"));
      return;
    }

    setSubmitting(true);

    const bodyObject = {
      title: title.trim() || undefined,
      content: content.trim(),
      related_domain: category || undefined,
      tags: toArray(tags),
      related_project_id: projectId || undefined,
      related_goal_id: goalId || undefined,
      related_business_id: businessId || undefined,
    };
    const body = JSON.stringify(bodyObject);

    const attempt = note
      ? await attemptFetch(`/api/notes/${note.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body })
      : await attemptFetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body });

    // Offline (or a Wi-Fi network with no real internet): queue the
    // change and show it locally instead of failing outright — never
    // claimed as synced until the queue actually confirms it later.
    if (attempt.networkFailure) {
      const db = await getDB();
      const localId = note?.id ?? crypto.randomUUID();
      const localNote: Note = {
        id: localId,
        user_id: note?.user_id ?? "",
        title: bodyObject.title ?? null,
        content: bodyObject.content,
        folder: note?.folder ?? null,
        tags: bodyObject.tags,
        related_domain: bodyObject.related_domain ?? null,
        related_project_id: bodyObject.related_project_id ?? null,
        related_appointment_id: note?.related_appointment_id ?? null,
        related_condition_id: note?.related_condition_id ?? null,
        related_goal_id: bodyObject.related_goal_id ?? null,
        related_business_id: bodyObject.related_business_id ?? null,
        pinned: note?.pinned ?? false,
        created_at: note?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.put("notes", { ...localNote, _pendingSync: true }, localId);
      await enqueue({
        feature: "note",
        operation: note ? "update" : "create",
        entityId: localId,
        payload: bodyObject,
      });

      setSubmitting(false);
      registerDirty(false);
      closeAfterSave();
      window.dispatchEvent(new Event(SYNC_UPDATED_EVENT));
      return;
    }

    setSubmitting(false);

    if (!attempt.response.ok) {
      setError(t("saveError"));
      return;
    }

    registerDirty(false);
    closeAfterSave();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
      {error && <p className="text-sm text-status-urgent">{error}</p>}

      <FormField label={t("title")} htmlFor="note-title" optional>
        <LifeOSInput id="note-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("titlePlaceholder")} />
      </FormField>

      <FormField label={t("content")} htmlFor="note-content" required className="flex-1">
        <LifeOSTextarea
          id="note-content"
          required
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          className="min-h-[40vh]"
          placeholder={t("contentPlaceholder")}
        />
      </FormField>

      <button type="button" onClick={() => setExpanded((v) => !v)} className="w-fit text-sm font-medium text-primary hover:underline">
        {expanded ? t("fewerDetails") : t("moreDetails")}
      </button>

      {expanded && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t("category")} htmlFor="note-category" optional>
            <LifeOSSelect id="note-category" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">{tCommon("none")}</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`categories.${c}`)}
                </option>
              ))}
            </LifeOSSelect>
          </FormField>

          <FormField label={t("tags")} htmlFor="note-tags" optional helperText={t("tagsHelper")}>
            <LifeOSInput id="note-tags" type="text" value={tags} onChange={(e) => setTags(e.target.value)} />
          </FormField>

          <FormField label={t("relatedProject")} htmlFor="note-project" optional>
            <LifeOSSelect id="note-project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">{tCommon("none")}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </LifeOSSelect>
          </FormField>

          <FormField label={t("relatedGoal")} htmlFor="note-goal" optional>
            <LifeOSSelect id="note-goal" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
              <option value="">{tCommon("none")}</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </LifeOSSelect>
          </FormField>

          <FormField label={t("relatedBusiness")} htmlFor="note-business" optional>
            <LifeOSSelect id="note-business" value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
              <option value="">{tCommon("none")}</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </LifeOSSelect>
          </FormField>
        </div>
      )}

      <LifeOSFormActions onCancel={requestClose} submitting={submitting} submitLabel={tCommon("save")} />
    </form>
  );
}
