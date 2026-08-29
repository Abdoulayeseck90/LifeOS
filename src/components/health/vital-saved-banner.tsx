"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";

// Small success confirmation after any "+ Record Vital" save (Form UX
// spec: save → close → return to the Vitals page → show a brief
// confirmation) — sessionStorage is the simplest way to pass "just
// saved" across the modal-close + router.refresh() without a global
// toast system this app doesn't otherwise have. Shared by every vital
// type's form (Blood Pressure, the single-value types, and Weight/
// Height/BMI via body-metric-form.tsx) rather than one banner per type.
const STORAGE_KEY = "lifeos:vital-saved";

export function markVitalSaved() {
  sessionStorage.setItem(STORAGE_KEY, "1");
}

export function VitalSavedBanner() {
  const t = useTranslations("vitals");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem(STORAGE_KEY)) return;
    sessionStorage.removeItem(STORAGE_KEY);
    setVisible(true);
    const timeout = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <div className="mb-4 flex items-center gap-2 rounded-card border border-status-normal/30 bg-status-normal/10 px-4 py-2.5 text-sm text-status-normal">
      <CheckCircle2 size={16} />
      {t("savedConfirmation")}
    </div>
  );
}
