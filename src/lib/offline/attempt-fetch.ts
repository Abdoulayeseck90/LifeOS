// The one shared primitive every offline-aware mutation uses: try the
// real request, and report a *connectivity* failure distinctly from a
// real HTTP response. `navigator.onLine` alone isn't trustworthy (Wi-Fi
// with no real internet still reports "online"), so this always
// attempts the fetch and treats a thrown network error the same as
// being offline — the caller only has to branch once, on
// `networkFailure`, rather than duplicating this logic per feature.
export type FetchAttempt = { networkFailure: true } | { networkFailure: false; response: Response };

export async function attemptFetch(url: string, init: RequestInit): Promise<FetchAttempt> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { networkFailure: true };
  }
  try {
    const response = await fetch(url, init);
    return { networkFailure: false, response };
  } catch {
    return { networkFailure: true };
  }
}
