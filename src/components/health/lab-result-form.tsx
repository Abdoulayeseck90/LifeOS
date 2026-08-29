"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, Plus } from "lucide-react";
import type { LabResult, TestDefinition } from "@/types/health/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";
import { TestSelector } from "@/components/health/test-selector";
import { FormField } from "@/components/core/form/form-field";
import { LifeOSInput } from "@/components/core/form/lifeos-input";
import { LifeOSSelect } from "@/components/core/form/lifeos-select";
import { LifeOSTextarea } from "@/components/core/form/lifeos-textarea";
import { LifeOSFormSection } from "@/components/core/form/lifeos-form-section";
import { LifeOSFormActions } from "@/components/core/form/lifeos-form-actions";

// Hosted inside RecordFormModal — see appointment-form.tsx for the
// pattern this follows. Passing `labResult` switches to edit mode
// (PATCH against /api/health/labs/[id]).
//
// Form Redesign spec, Section 8/24 — this is the reference/flagship
// migration to the shared LifeOSInput family: real visible borders,
// section-divided layout matching the spec's own worked example (Test
// Information / Reference Information / Additional Information), and a
// real field-level error state on Result (Section 17).
export function LabResultForm({
  testDefinitions,
  labResult,
  closeAfterSave,
  requestClose,
  registerDirty,
}: {
  testDefinitions: TestDefinition[];
} & Partial<{ labResult: LabResult }> &
  RecordFormRenderProps) {
  const t = useTranslations("labs.form");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();

  const initialValue = labResult ? String(labResult.value_numeric ?? labResult.value_text ?? "") : "";
  const todayDate = new Date().toISOString().slice(0, 10);

  // Local + mutable so a custom test created via TestSelector is
  // immediately searchable/selectable within this same form session,
  // without waiting on a full page reload (Expand Lab Test Selection
  // spec, Section 13).
  const [localTestDefinitions, setLocalTestDefinitions] = useState(testDefinitions);
  const [selectedTest, setSelectedTest] = useState<TestDefinition | null>(
    testDefinitions.find((test) => test.id === labResult?.test_definition_id) ?? null
  );
  const [testDefinitionId, setTestDefinitionId] = useState(labResult?.test_definition_id ?? "");
  const [value, setValue] = useState(initialValue);
  const [unit, setUnit] = useState(labResult?.unit ?? "");
  const [referenceLow, setReferenceLow] = useState(labResult?.reference_low?.toString() ?? "");
  const [referenceHigh, setReferenceHigh] = useState(labResult?.reference_high?.toString() ?? "");
  const [resultStatus, setResultStatus] = useState(labResult?.result_status ?? "");
  const [collectionDate, setCollectionDate] = useState(labResult?.collection_date ?? todayDate);
  const [resultDate, setResultDate] = useState(labResult?.result_date ?? "");
  const [orderingProvider, setOrderingProvider] = useState(labResult?.ordering_provider ?? "");
  const [facility, setFacility] = useState(labResult?.facility ?? "");
  const [notes, setNotes] = useState(labResult?.notes ?? "");

  const [error, setError] = useState<string | null>(null);
  // Field-level errors (Section 17: red border + short message right
  // under the specific field, not just a banner) — separate from the
  // top-of-form `error` banner, which stays for save/network failures.
  const [fieldErrors, setFieldErrors] = useState<{ test?: string; value?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // "+ Add another result" (Spec Section 15) — only ever used in
  // create mode; editing an existing result always closes on save.
  const [savedSummary, setSavedSummary] = useState<{ testName: string; value: string; unit: string; date: string } | null>(null);

  useEffect(() => {
    const dirty =
      testDefinitionId !== (labResult?.test_definition_id ?? "") ||
      value !== initialValue ||
      unit !== (labResult?.unit ?? "") ||
      referenceLow !== (labResult?.reference_low?.toString() ?? "") ||
      referenceHigh !== (labResult?.reference_high?.toString() ?? "") ||
      resultStatus !== (labResult?.result_status ?? "") ||
      collectionDate !== (labResult?.collection_date ?? new Date().toISOString().slice(0, 10)) ||
      resultDate !== (labResult?.result_date ?? "") ||
      orderingProvider !== (labResult?.ordering_provider ?? "") ||
      facility !== (labResult?.facility ?? "") ||
      notes !== (labResult?.notes ?? "");
    registerDirty(dirty);
  }, [
    testDefinitionId,
    value,
    unit,
    referenceLow,
    referenceHigh,
    resultStatus,
    collectionDate,
    resultDate,
    orderingProvider,
    facility,
    notes,
    labResult,
    initialValue,
    registerDirty,
  ]);

  function handleTestSelect(test: TestDefinition) {
    setSelectedTest(test);
    setTestDefinitionId(test.id);
    if (test.default_unit) setUnit(test.default_unit);
    setFieldErrors((prev) => ({ ...prev, test: undefined }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const nextFieldErrors: { test?: string; value?: string } = {};
    if (!testDefinitionId) nextFieldErrors.test = t("testRequired");
    if (!value.trim()) nextFieldErrors.value = t("valueRequired");
    setFieldErrors(nextFieldErrors);
    if (nextFieldErrors.test || nextFieldErrors.value) return;

    const numericValue = Number(value);
    const isNumeric = value.trim() !== "" && Number.isFinite(numericValue);

    setSubmitting(true);

    const body = JSON.stringify({
      test_definition_id: testDefinitionId,
      ...(isNumeric ? { value_numeric: numericValue, value_text: undefined } : { value_text: value.trim() }),
      unit: unit.trim() || undefined,
      reference_low: referenceLow.trim() ? Number(referenceLow) : undefined,
      reference_high: referenceHigh.trim() ? Number(referenceHigh) : undefined,
      result_status: resultStatus || undefined,
      collection_date: collectionDate,
      result_date: resultDate.trim() || undefined,
      ordering_provider: orderingProvider.trim() || undefined,
      facility: facility.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    const response = labResult
      ? await fetch(`/api/health/labs/${labResult.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body,
        })
      : await fetch("/api/health/labs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });

    setSubmitting(false);

    if (!response.ok) {
      setError(t("saveError"));
      return;
    }

    registerDirty(false);
    router.refresh();

    if (labResult) {
      // Editing an existing result — same behavior as before.
      closeAfterSave();
      return;
    }

    // Create mode: show an inline saved confirmation with "+ Add
    // another result" instead of closing immediately (Section 15) —
    // lets the user quickly enter AST, ALT, ALP, Bilirubin... without
    // reopening the modal each time.
    const testName = selectedTest ? (locale === "fr" ? selectedTest.name_fr : selectedTest.name_en) : "";
    setSavedSummary({
      testName: selectedTest?.code ? `${testName} (${selectedTest.code})` : testName,
      value: value.trim(),
      unit: unit.trim(),
      date: collectionDate,
    });
  }

  function handleAddAnother() {
    setSavedSummary(null);
    setSelectedTest(null);
    setTestDefinitionId("");
    setValue("");
    setUnit("");
    setReferenceLow("");
    setReferenceHigh("");
    setResultStatus("");
    setCollectionDate(todayDate);
    setResultDate("");
    setOrderingProvider("");
    setFacility("");
    setNotes("");
    setError(null);
    setFieldErrors({});
    registerDirty(false);
  }

  if (savedSummary) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 rounded-card border border-status-normal/30 bg-status-normal/10 px-4 py-2.5 text-sm text-status-normal">
          <CheckCircle2 size={16} />
          {t("savedConfirmation")}
        </div>
        <div className="rounded-card border border-surface bg-white p-4">
          <p className="font-medium text-secondary">{savedSummary.testName}</p>
          <p className="mt-1 text-lg font-semibold text-secondary">
            {savedSummary.value}
            {savedSummary.unit ? ` ${savedSummary.unit}` : ""}
          </p>
          <p className="mt-1 text-xs text-muted">{savedSummary.date}</p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={closeAfterSave}
            className="min-h-11 rounded border border-slate-300 px-4 py-2 text-sm font-medium text-secondary hover:bg-surface"
          >
            {tCommon("done")}
          </button>
          <button
            type="button"
            onClick={handleAddAnother}
            className="inline-flex min-h-11 items-center gap-1.5 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus size={16} />
            {t("addAnotherResult")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && <p className="text-sm text-status-urgent">{error}</p>}

      <LifeOSFormSection title={t("testInformationSection")}>
        <FormField label={t("test")} required error={fieldErrors.test}>
          <TestSelector
            testDefinitions={localTestDefinitions}
            selectedTestId={testDefinitionId}
            onSelect={handleTestSelect}
            onCustomTestCreated={(test) => setLocalTestDefinitions((prev) => [...prev, test])}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t("value")} htmlFor="lab-result-value" required error={fieldErrors.value}>
            <LifeOSInput
              id="lab-result-value"
              type="text"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setFieldErrors((prev) => ({ ...prev, value: undefined }));
              }}
              placeholder={t("valuePlaceholder")}
              error={!!fieldErrors.value}
            />
          </FormField>

          <FormField label={t("unit")} htmlFor="lab-result-unit" optional>
            <LifeOSInput id="lab-result-unit" type="text" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </FormField>
        </div>

        <FormField label={t("collectionDate")} htmlFor="lab-result-date" required>
          <LifeOSInput
            id="lab-result-date"
            type="date"
            required
            value={collectionDate}
            onChange={(e) => setCollectionDate(e.target.value)}
          />
        </FormField>
      </LifeOSFormSection>

      <LifeOSFormSection title={t("referenceInformationSection")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t("referenceLow")} htmlFor="lab-result-ref-low" optional>
            <LifeOSInput
              id="lab-result-ref-low"
              type="number"
              step="any"
              value={referenceLow}
              onChange={(e) => setReferenceLow(e.target.value)}
            />
          </FormField>
          <FormField label={t("referenceHigh")} htmlFor="lab-result-ref-high" optional>
            <LifeOSInput
              id="lab-result-ref-high"
              type="number"
              step="any"
              value={referenceHigh}
              onChange={(e) => setReferenceHigh(e.target.value)}
            />
          </FormField>
        </div>

        <FormField label={t("resultStatus")} htmlFor="lab-result-status" optional helperText={t("laboratoryReportHelper")}>
          <LifeOSSelect id="lab-result-status" value={resultStatus} onChange={(e) => setResultStatus(e.target.value)}>
            <option value="">{t("resultStatusAuto")}</option>
            <option value="normal">{t("statusOptions.normal")}</option>
            <option value="low">{t("statusOptions.low")}</option>
            <option value="high">{t("statusOptions.high")}</option>
            <option value="critical">{t("statusOptions.critical")}</option>
            <option value="abnormal">{t("statusOptions.abnormal")}</option>
          </LifeOSSelect>
        </FormField>
      </LifeOSFormSection>

      <button type="button" onClick={() => setExpanded((v) => !v)} className="w-fit text-sm font-medium text-primary hover:underline">
        {expanded ? t("fewerDetails") : t("moreDetails")}
      </button>

      {expanded && (
        <LifeOSFormSection title={t("additionalInformationSection")}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t("resultDate")} htmlFor="lab-result-result-date" optional>
              <LifeOSInput id="lab-result-result-date" type="date" value={resultDate} onChange={(e) => setResultDate(e.target.value)} />
            </FormField>
            <FormField label={t("orderingProvider")} htmlFor="lab-result-provider" optional>
              <LifeOSInput
                id="lab-result-provider"
                type="text"
                value={orderingProvider}
                onChange={(e) => setOrderingProvider(e.target.value)}
              />
            </FormField>
          </div>

          <FormField label={t("facility")} htmlFor="lab-result-facility" optional>
            <LifeOSInput id="lab-result-facility" type="text" value={facility} onChange={(e) => setFacility(e.target.value)} />
          </FormField>

          <FormField label={t("notes")} htmlFor="lab-result-notes" optional>
            <LifeOSTextarea id="lab-result-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notesPlaceholder")} />
          </FormField>
        </LifeOSFormSection>
      )}

      <LifeOSFormActions onCancel={requestClose} submitting={submitting} submitLabel={tCommon("save")} />
    </form>
  );
}
