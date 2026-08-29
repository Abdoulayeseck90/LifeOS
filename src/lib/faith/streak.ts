// Zero Supabase imports — a client component can import this directly
// without pulling a server-only module into the client bundle (same
// pattern as bill-status.ts/expiration-status.ts).
//
// Section 13: streaks stay subtle ("7-day routine", never "you lost your
// streak"). A day counts toward a streak only when every item scheduled
// that day was completed — partial days break the streak but are never
// presented with shame-based copy; that's a UI-copy concern, not this
// function's.
export interface DailyCompletionRate {
  date: string;
  rate: number;
}

export function computeStreak(dailyRates: DailyCompletionRate[]): { current: number; best: number } {
  const sorted = [...dailyRates].sort((a, b) => a.date.localeCompare(b.date));

  let best = 0;
  let running = 0;
  for (const day of sorted) {
    if (day.rate >= 1) {
      running += 1;
      best = Math.max(best, running);
    } else {
      running = 0;
    }
  }

  let current = 0;
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const day = sorted[i];
    if (day && day.rate >= 1) current += 1;
    else break;
  }

  return { current, best };
}
