"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";

// Same pattern as vital-saved-banner.tsx — see that file's comment.
const STORAGE_KEY = "lifeos:workout-saved";

export function markWorkoutSaved() {
  sessionStorage.setItem(STORAGE_KEY, "1");
}

export function WorkoutSavedBanner() {
  const t = useTranslations("exercise");
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
