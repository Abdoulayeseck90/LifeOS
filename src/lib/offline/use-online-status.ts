"use client";

import { useEffect, useState } from "react";

// Initial state is always `true` — reading navigator.onLine in the
// useState initializer would run during SSR (no `navigator`) and could
// mismatch the client's real first render; the real value is set in an
// effect instead, same pattern already used for timezone detection in
// notification-preferences-form.tsx.
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return online;
}
