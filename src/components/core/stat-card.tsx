export function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-card border border-surface bg-white p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-secondary">{value}</p>
    </div>
  );
}
