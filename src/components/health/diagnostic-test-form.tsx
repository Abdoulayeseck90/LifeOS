"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { sanitizeFileName } from "@/lib/files";
import type { Condition, DiagnosticTest, DiagnosticTestCategory } from "@/types/health/entities";
import type { Document } from "@/types/core/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";
import { TEST_TYPE_OPTIONS_BY_CATEGORY } from "@/components/health/diagnostic-test-category-config";
import { markDiagnosticTestSaved } from "@/components/health/diagnostic-test-saved-banner";

// Mirrors document-upload-form.tsx exactly — same bucket, same limits.
const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

function measurementString(measurements: DiagnosticTest["measurements"] | undefined, key: string): string {
  const value = measurements?.[key];
  return typeof value === "number" ? String(value) : "";
}

// Which optional fields make sense for a given category (Spec Sections
// 5-9) — body_part is relabeled per category rather than getting 3
// separate DB columns, since it's the same underlying concept (where on/
// in the body the test was performed) with different vocabulary.
function showBodyPart(category: DiagnosticTestCategory): boolean {
  return category === "imaging" || category === "pathology" || category === "microbiology";
}
function bodyPartLabelKey(category: DiagnosticTestCategory): string {
  if (category === "microbiology") return "specimenSource";
  if (category === "pathology") return "bodySite";
  return "bodyArea";
}
function showImpression(category: DiagnosticTestCategory): boolean {
  return category !== "microbiology";
}
function impressionLabelKey(category: DiagnosticTestCategory): string {
  if (category === "pathology") return "diagnosisImpression";
  if (category === "other") return "impressionResult";
  return "impression";
}
function findingsLabelKey(category: DiagnosticTestCategory): string {
  return category === "microbiology" ? "findingsResults" : "findings";
}

// Hosted inside RecordFormModal — see appointment-form.tsx for the
// pattern. `category` scopes the test-type dropdown (or, for "other", a
// free-text test-name input — Section 9) and which optional fields show.
// Passing `diagnosticTest` switches to edit mode; its own category never
// changes in edit mode (categorizing is a create-time decision made via
// diagnostic-test-category-picker.tsx, not something you flip after the
// fact for an existing record).
export function DiagnosticTestForm({
  category,
  conditions,
  documents,
  diagnosticTest,
  closeAfterSave,
  requestClose,
  registerDirty,
}: {
  category: DiagnosticTestCategory;
  conditions: Condition[];
  documents: Document[];
} & Partial<{ diagnosticTest: DiagnosticTest }> &
  RecordFormRenderProps) {
  const t = useTranslations("diagnosticTests.form");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOther = category === "other";
  const testTypeOptions = isOther ? [] : TEST_TYPE_OPTIONS_BY_CATEGORY[category];

  const [testType, setTestType] = useState<string>(diagnosticTest?.test_type ?? (isOther ? "" : (testTypeOptions[0] ?? "other")));
  const [studyDate, setStudyDate] = useState(diagnosticTest?.study_date ?? new Date().toISOString().slice(0, 10));
  const [facility, setFacility] = useState(diagnosticTest?.facility ?? "");
  const [provider, setProvider] = useState(diagnosticTest?.provider ?? "");
  const [bodyPart, setBodyPart] = useState(diagnosticTest?.body_part ?? "");
  const [indication, setIndication] = useState(diagnosticTest?.indication ?? "");
  const [findings, setFindings] = useState(diagnosticTest?.findings ?? "");
  const [impression, setImpression] = useState(diagnosticTest?.impression ?? "");
  const [followUp, setFollowUp] = useState(diagnosticTest?.follow_up ?? "");
  const [notes, setNotes] = useState(diagnosticTest?.notes ?? "");
  const [relatedConditionId, setRelatedConditionId] = useState(diagnosticTest?.related_condition_id ?? "");
  const [sourceDocumentId, setSourceDocumentId] = useState(diagnosticTest?.source_document_id ?? "");
  const [fileName, setFileName] = useState("");

  // FibroScan keeps its own structured measurement fields (Addendum
  // Section 3) regardless of which category it's filed under.
  const [liverStiffness, setLiverStiffness] = useState(measurementString(diagnosticTest?.measurements, "liver_stiffness_kpa"));
  const [cap, setCap] = useState(measurementString(diagnosticTest?.measurements, "cap_dbm"));
  const [iqr, setIqr] = useState(measurementString(diagnosticTest?.measurements, "iqr"));
  const [iqrMedianPercent, setIqrMedianPercent] = useState(measurementString(diagnosticTest?.measurements, "iqr_median_percent"));
  const [validMeasurements, setValidMeasurements] = useState(measurementString(diagnosticTest?.measurements, "valid_measurements"));
  const [totalMeasurements, setTotalMeasurements] = useState(measurementString(diagnosticTest?.measurements, "total_measurements"));
  const [successRate, setSuccessRate] = useState(measurementString(diagnosticTest?.measurements, "success_rate_percent"));
  const [fasting, setFasting] = useState(Boolean(diagnosticTest?.measurements?.fasting_status));

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fieldValues = {
    testType,
    studyDate,
    facility,
    provider,
    bodyPart,
    indication,
    findings,
    impression,
    followUp,
    notes,
    relatedConditionId,
    sourceDocumentId,
    fileName,
    liverStiffness,
    cap,
    iqr,
    iqrMedianPercent,
    validMeasurements,
    totalMeasurements,
    successRate,
    fasting,
  };
  const initialSnapshot = useRef(JSON.stringify(fieldValues));
  useEffect(() => {
    registerDirty(JSON.stringify(fieldValues) !== initialSnapshot.current);
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (isOther && !testType.trim()) {
      setError(t("testNameRequired"));
      return;
    }

    const file = fileInputRef.current?.files?.[0];
    if (file) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        setError(t("fileTypeInvalid"));
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(t("fileTooLarge"));
        return;
      }
    }

    setSubmitting(true);

    // Upload only if a NEW file was picked — otherwise reuse whatever's
    // already selected in sourceDocumentId (an existing document), never
    // creating a duplicate (Spec Section 15).
    let uploadedDocumentId: string | null = null;
    let uploadedStoragePath: string | null = null;
    if (file) {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSubmitting(false);
        setError(t("saveError"));
        return;
      }

      const documentId = crypto.randomUUID();
      uploadedStoragePath = `${user.id}/${documentId}/${sanitizeFileName(file.name)}`;

      const { error: uploadError } = await supabase.storage.from("medical-documents").upload(uploadedStoragePath, file);
      if (uploadError) {
        setSubmitting(false);
        setError(t("uploadError"));
        return;
      }

      const testLabel = isOther ? testType : t(`testTypeOptions.${testType}`);
      const documentResponse = await fetch("/api/health/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${testLabel} — ${studyDate}`,
          type: category === "imaging" ? "imaging" : "other",
          storage_path: uploadedStoragePath,
          mime_type: file.type,
          file_size: file.size,
          document_date: studyDate,
          provider: provider.trim() || undefined,
          related_condition_id: relatedConditionId || undefined,
        }),
      });

      if (!documentResponse.ok) {
        await supabase.storage.from("medical-documents").remove([uploadedStoragePath]);
        setSubmitting(false);
        setError(t("uploadError"));
        return;
      }

      const { data: newDocument } = await documentResponse.json();
      uploadedDocumentId = newDocument.id;
    }

    const measurements: Record<string, string | number | boolean> = {};
    if (testType === "fibroscan") {
      if (liverStiffness) measurements.liver_stiffness_kpa = Number(liverStiffness);
      if (cap) measurements.cap_dbm = Number(cap);
      if (iqr) measurements.iqr = Number(iqr);
      if (iqrMedianPercent) measurements.iqr_median_percent = Number(iqrMedianPercent);
      if (validMeasurements) measurements.valid_measurements = Number(validMeasurements);
      if (totalMeasurements) measurements.total_measurements = Number(totalMeasurements);
      if (successRate) measurements.success_rate_percent = Number(successRate);
      measurements.fasting_status = fasting;
    }

    const body = JSON.stringify({
      test_type: testType.trim(),
      category,
      study_date: studyDate,
      facility: facility.trim() || undefined,
      provider: provider.trim() || undefined,
      body_part: bodyPart.trim() || undefined,
      indication: indication.trim() || undefined,
      findings: findings.trim() || undefined,
      impression: impression.trim() || undefined,
      measurements,
      follow_up: followUp.trim() || undefined,
      notes: notes.trim() || undefined,
      related_condition_id: relatedConditionId || undefined,
      source_document_id: uploadedDocumentId ?? (sourceDocumentId || undefined),
    });

    const response = diagnosticTest
      ? await fetch(`/api/health/diagnostic-tests/${diagnosticTest.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body,
        })
      : await fetch("/api/health/diagnostic-tests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });

    setSubmitting(false);

    if (!response.ok) {
      // Metadata write failed after the file made it to storage — clean
      // up rather than leave an orphaned object behind.
      if (uploadedStoragePath) {
        const supabase = createClient();
        await supabase.storage.from("medical-documents").remove([uploadedStoragePath]);
      }
      setError(t("saveError"));
      return;
    }

    registerDirty(false);
    markDiagnosticTestSaved();
    closeAfterSave();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <p className="text-sm text-status-urgent">{error}</p>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {isOther ? t("testName") : t("testType")}
          {isOther ? (
            <input
              type="text"
              required
              value={testType}
              onChange={(e) => setTestType(e.target.value)}
              placeholder={t("testNamePlaceholder")}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          ) : (
            <select
              value={testType}
              onChange={(e) => setTestType(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            >
              {testTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {t(`testTypeOptions.${type}`)}
                </option>
              ))}
            </select>
          )}
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("studyDate")}
          <input
            type="date"
            required
            value={studyDate}
            onChange={(e) => setStudyDate(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("facility")}
          <input
            type="text"
            value={facility}
            onChange={(e) => setFacility(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          />
        </label>
      </div>

      {showBodyPart(category) && (
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t(bodyPartLabelKey(category))}
          <input
            type="text"
            value={bodyPart}
            onChange={(e) => setBodyPart(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary md:max-w-xs"
          />
        </label>
      )}

      {testType === "fibroscan" && (
        <div className="rounded border border-surface bg-surface p-3">
          <p className="mb-2 text-xs font-medium text-muted">{t("fibroscanMeasurements")}</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <label className="flex flex-col gap-1.5 text-sm text-muted">
              {t("liverStiffness")}
              <input
                type="number"
                step="any"
                value={liverStiffness}
                onChange={(e) => setLiverStiffness(e.target.value)}
                className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-muted">
              {t("cap")}
              <input
                type="number"
                step="any"
                value={cap}
                onChange={(e) => setCap(e.target.value)}
                className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-muted">
              {t("iqr")}
              <input
                type="number"
                step="any"
                value={iqr}
                onChange={(e) => setIqr(e.target.value)}
                className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-muted">
              {t("iqrMedianPercent")}
              <input
                type="number"
                step="any"
                value={iqrMedianPercent}
                onChange={(e) => setIqrMedianPercent(e.target.value)}
                className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-muted">
              {t("validMeasurements")}
              <input
                type="number"
                value={validMeasurements}
                onChange={(e) => setValidMeasurements(e.target.value)}
                className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-muted">
              {t("totalMeasurements")}
              <input
                type="number"
                value={totalMeasurements}
                onChange={(e) => setTotalMeasurements(e.target.value)}
                className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-muted">
              {t("successRate")}
              <input
                type="number"
                step="any"
                value={successRate}
                onChange={(e) => setSuccessRate(e.target.value)}
                className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
              />
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-muted">
              <input type="checkbox" checked={fasting} onChange={(e) => setFasting(e.target.checked)} />
              {t("fastingStatus")}
            </label>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t(findingsLabelKey(category))}
          <textarea
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
            rows={3}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          />
        </label>
        {showImpression(category) && (
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t(impressionLabelKey(category))}
            <textarea
              value={impression}
              onChange={(e) => setImpression(e.target.value)}
              rows={3}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
        )}
      </div>

      <label className="flex flex-col gap-1.5 text-sm text-muted">
        {t("uploadReport")}
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_MIME_TYPES.join(",")}
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary file:mr-3 file:rounded file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-sm file:text-secondary"
        />
      </label>

      <button type="button" onClick={() => setExpanded((v) => !v)} className="w-fit text-sm text-primary hover:underline">
        {expanded ? t("fewerDetails") : t("moreDetails")}
      </button>

      {expanded && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("provider")}
            <input
              type="text"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("relatedCondition")}
            <select
              value={relatedConditionId}
              onChange={(e) => setRelatedConditionId(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            >
              <option value="">{t("none")}</option>
              {conditions.map((condition) => (
                <option key={condition.id} value={condition.id}>
                  {condition.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("existingDocument")}
            <select
              value={sourceDocumentId}
              onChange={(e) => setSourceDocumentId(e.target.value)}
              disabled={Boolean(fileName)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary disabled:opacity-50"
            >
              <option value="">{t("none")}</option>
              {documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted md:col-span-3">
            {t("indication")}
            <input
              type="text"
              value={indication}
              onChange={(e) => setIndication(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted md:col-span-3">
            {t("followUp")}
            <input
              type="text"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted md:col-span-3">
            {t("notes")}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
        </div>
      )}

      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={requestClose} className="rounded border border-surface px-4 py-2 text-sm text-secondary">
          {tCommon("cancel")}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {submitting ? t("saving") : tCommon("save")}
        </button>
      </div>
    </form>
  );
}
