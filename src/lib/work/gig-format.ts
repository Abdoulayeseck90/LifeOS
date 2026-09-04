// Shared display formatting for the Gig Driving tabs — small enough
// that duplicating it eight times across tab components would be worse
// than one shared file (unlike most one-off formatting in this app).

export function formatCurrency(amount: number): string {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

export function formatMiles(miles: number): string {
  return `${miles.toLocaleString(undefined, { maximumFractionDigits: 1 })} mi`;
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

export function formatPerUnit(value: number | null, unit: string): string {
  return value === null ? "—" : `${formatCurrency(value)}/${unit}`;
}
