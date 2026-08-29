"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, Plus, ChevronRight } from "lucide-react";
import type { LabCategory, TestDefinition } from "@/types/health/entities";
import { searchTestDefinitions, groupTestsByCategory, CATEGORY_ORDER } from "@/lib/health/test-search";
import { TEST_CATEGORY_ICON } from "@/components/health/test-category-config";
import { CategoryIcon } from "@/components/core/category-icon";
import { Modal } from "@/components/core/modal";

// Expand Lab Test Selection spec — replaces the old flat <select> with
// a searchable, category-grouped picker (Section 1) that always offers
// "+ Add other test" (Section 12: this option must ALWAYS be
// available), and falls into a pre-filled custom-test form when a
// search comes up empty (Section 17). Mobile-friendly via the shared
// Modal, which already goes full-screen below the sm breakpoint
// (Section 22).
export function TestSelector({
  testDefinitions,
  selectedTestId,
  onSelect,
  onCustomTestCreated,
}: {
  testDefinitions: TestDefinition[];
  selectedTestId: string;
  onSelect: (test: TestDefinition) => void;
  onCustomTestCreated: (test: TestDefinition) => void;
}) {
  const t = useTranslations("labs.form");
  const tLabs = useTranslations("labs");
  const tCommon = useTranslations("common");
  const { locale } = useParams<{ locale: string }>();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<LabCategory | "all">("all");
  const [showCustomForm, setShowCustomForm] = useState(false);

  const selectedTest = testDefinitions.find((test) => test.id === selectedTestId) ?? null;

  function testLabel(test: TestDefinition): string {
    const name = locale === "fr" ? test.name_fr : test.name_en;
    return test.code ? `${name} (${test.code})` : name;
  }

  const matches = useMemo(() => searchTestDefinitions(testDefinitions, query), [testDefinitions, query]);
  const visibleTests = query.trim() ? matches : activeCategory === "all" ? testDefinitions : testDefinitions.filter((t) => t.category === activeCategory);
  const groups = useMemo(() => groupTestsByCategory(visibleTests), [visibleTests]);
  const availableCategories = useMemo(() => CATEGORY_ORDER.filter((c) => testDefinitions.some((t) => t.category === c)), [testDefinitions]);

  function reset() {
    setQuery("");
    setActiveCategory("all");
    setShowCustomForm(false);
  }

  function handleSelect(test: TestDefinition) {
    onSelect(test);
    setOpen(false);
    reset();
  }

  function handleCustomTestSaved(test: TestDefinition) {
    onCustomTestCreated(test);
    onSelect(test);
    setOpen(false);
    reset();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 w-full items-center justify-between rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-left text-secondary"
      >
        <span className="flex items-center gap-2 truncate">
          <Search size={16} className="shrink-0 text-muted" />
          {selectedTest ? testLabel(selectedTest) : <span className="text-muted">{t("selectTest")}</span>}
        </span>
        <ChevronRight size={16} className="shrink-0 text-muted" />
      </button>

      <Modal open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }} title={t("selectTestTitle")}>
        {showCustomForm ? (
          <CustomTestForm initialName={query} onCancel={() => setShowCustomForm(false)} onSaved={handleCustomTestSaved} />
        ) : (
          <div className="flex flex-col gap-3">
            <label className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                autoFocus
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchTestPlaceholder")}
                aria-label={t("searchTestPlaceholder")}
                className="w-full rounded border border-surface bg-white py-2.5 pl-9 pr-3 text-sm text-secondary"
              />
            </label>

            {!query.trim() && availableCategories.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setActiveCategory("all")}
                  className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-3 text-xs font-medium ${
                    activeCategory === "all" ? "border-primary bg-primary text-primary-foreground" : "border-surface text-secondary hover:bg-surface"
                  }`}
                >
                  {tCommon("all")}
                </button>
                {availableCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium ${
                      activeCategory === category ? "border-primary bg-primary text-primary-foreground" : "border-surface text-secondary hover:bg-surface"
                    }`}
                  >
                    {tLabs(`categories.${category}`)}
                  </button>
                ))}
              </div>
            )}

            <div className="max-h-[50vh] overflow-y-auto">
              {groups.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted">{t("noTestFound")}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {groups.map(({ category, tests }) => (
                    <div key={category}>
                      <div className="mb-1.5 flex items-center gap-2">
                        <CategoryIcon icon={TEST_CATEGORY_ICON[category]} size="sm" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{tLabs(`categories.${category}`)}</p>
                      </div>
                      <div className="flex flex-col">
                        {tests.map((test) => (
                          <button
                            key={test.id}
                            type="button"
                            onClick={() => handleSelect(test)}
                            className="flex min-h-11 items-center justify-between rounded px-2 py-2 text-left text-sm text-secondary hover:bg-surface"
                          >
                            <span className="truncate">{testLabel(test)}</span>
                            {test.is_custom && <span className="ml-2 shrink-0 text-xs text-muted">{t("customTestTag")}</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowCustomForm(true)}
              className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <Plus size={16} />
              {t("addOtherTest")}
            </button>
          </div>
        )}
      </Modal>
    </>
  );
}

// Section 13/17: Test Name (required), Test Code/Category/Unit
// (optional) — creates a user-owned custom test, never a global one.
function CustomTestForm({
  initialName,
  onCancel,
  onSaved,
}: {
  initialName: string;
  onCancel: () => void;
  onSaved: (test: TestDefinition) => void;
}) {
  const t = useTranslations("labs.form");
  const tLabs = useTranslations("labs");
  const tCommon = useTranslations("common");
  const [name, setName] = useState(initialName);
  const [code, setCode] = useState("");
  const [category, setCategory] = useState<LabCategory>("other");
  const [unit, setUnit] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(t("customTestNameRequired"));
      return;
    }

    setSubmitting(true);
    const response = await fetch("/api/health/test-definitions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        code: code.trim() || undefined,
        category,
        default_unit: unit.trim() || undefined,
      }),
    });
    setSubmitting(false);

    if (!response.ok) {
      setError(t("saveError"));
      return;
    }

    const { data } = await response.json();
    onSaved(data as TestDefinition);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <p className="text-sm text-status-urgent">{error}</p>}

      <label className="flex flex-col gap-1.5 text-sm text-muted">
        {t("customTestName")}
        <input
          autoFocus
          required
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm text-muted">
        {t("customTestCode")}
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm text-muted">
        {t("customTestCategory")}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as LabCategory)}
          className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
        >
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>
              {tLabs(`categories.${c}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm text-muted">
        {t("customTestUnit")}
        <input
          type="text"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
        />
      </label>

      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded border border-surface px-4 py-2 text-sm text-secondary">
          {tCommon("cancel")}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {tCommon("save")}
        </button>
      </div>
    </form>
  );
}
