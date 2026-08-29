"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function MonitoringItemActions({ itemId }: { itemId: string }) {
  const t = useTranslations("monitoring.actions");
  const router = useRouter();

  const [completing, setCompleting] = useState(false);
  const [completionNote, setCompletionNote] = useState("");
  const [editingDue, setEditingDue] = useState(false);
  const [nextDue, setNextDue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete() {
    setSubmitting(true);
    setError(null);

    const response = await fetch(`/api/health/monitoring/items/${itemId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: completionNote.trim() || undefined }),
    });

    setSubmitting(false);

    if (!response.ok) {
      setError(t("error"));
      return;
    }

    setCompleting(false);
    setCompletionNote("");
    router.refresh();
  }

  async function handleSaveNextDue() {
    if (!nextDue) return;
    setSubmitting(true);
    setError(null);

    const response = await fetch(`/api/health/monitoring/items/${itemId}/next-due`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ next_due_at: nextDue }),
    });

    setSubmitting(false);

    if (!response.ok) {
      setError(t("error"));
      return;
    }

    setEditingDue(false);
    setNextDue("");
    router.refresh();
  }

  if (completing) {
    return (
      <div className="flex flex-col gap-2">
        {error && <p className="text-xs text-status-urgent">{error}</p>}
        <input
          type="text"
          value={completionNote}
          onChange={(e) => setCompletionNote(e.target.value)}
          placeholder={t("notePlaceholder")}
          className="rounded border border-surface bg-white px-2 py-1 text-sm text-secondary"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleComplete}
            disabled={submitting}
            className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {t("confirm")}
          </button>
          <button
            type="button"
            onClick={() => setCompleting(false)}
            className="rounded border border-surface px-3 py-1 text-xs text-muted"
          >
            {t("cancel")}
          </button>
        </div>
      </div>
    );
  }

  if (editingDue) {
    return (
      <div className="flex flex-col gap-2">
        {error && <p className="text-xs text-status-urgent">{error}</p>}
        <input
          type="date"
          value={nextDue}
          onChange={(e) => setNextDue(e.target.value)}
          className="rounded border border-surface bg-white px-2 py-1 text-sm text-secondary"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSaveNextDue}
            disabled={submitting}
            className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {t("save")}
          </button>
          <button
            type="button"
            onClick={() => setEditingDue(false)}
            className="rounded border border-surface px-3 py-1 text-xs text-muted"
          >
            {t("cancel")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => setCompleting(true)}
        className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
      >
        {t("markCompleted")}
      </button>
      <button
        type="button"
        onClick={() => setEditingDue(true)}
        className="rounded border border-surface px-3 py-1 text-xs text-secondary"
      >
        {t("editNextDue")}
      </button>
    </div>
  );
}
