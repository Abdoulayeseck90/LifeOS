"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// One test's numeric history over time (Redesign Lab Results Spec,
// Section 4) — same shape as weight-trend-chart.tsx (range presets,
// fallback to the full range rather than an empty chart), plus a
// shaded reference-range band so "is this in range?" reads at a
// glance. Only rendered by the caller once there are >=2 numeric points
// (Section 4: "do not create a chart if there is insufficient
// historical data").
//
// Reference Range Source System spec, Section 8: the band is only ever
// drawn when every historical lab-provided range agrees (or when
// falling back to a single unambiguous external range) — the caller
// (labs/[testDefinitionId]/page.tsx) does that consistency check and
// passes `band: { kind: "changed" }` instead of a value whenever the
// lab's own range moved over time, so this component never pretends
// one band applied throughout when it didn't.
type RangeKey = "3m" | "6m" | "1y" | "all";
const RANGE_MONTHS: Record<Exclude<RangeKey, "all">, number> = { "3m": 3, "6m": 6, "1y": 12 };
const RANGES: RangeKey[] = ["3m", "6m", "1y", "all"];

export type LabTrendBand =
  | { kind: "value"; low: number | null; high: number | null; label: string }
  | { kind: "changed"; note: string }
  | { kind: "none" };

export function LabTrendChart({
  entries,
  unit,
  band,
}: {
  entries: { date: string; value: number }[];
  unit: string;
  band: LabTrendBand;
}) {
  const referenceLow = band.kind === "value" ? band.low : null;
  const referenceHigh = band.kind === "value" ? band.high : null;
  const t = useTranslations("labs");
  const { locale } = useParams<{ locale: string }>();
  const [range, setRange] = useState<RangeKey>("6m");

  const filteredEntries = useMemo(() => {
    if (range === "all") return entries;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - RANGE_MONTHS[range]);
    return entries.filter((entry) => new Date(entry.date) >= cutoff);
  }, [entries, range]);

  const chartData = filteredEntries.length >= 2 ? filteredEntries : entries;

  return (
    <div className="rounded-card border border-surface bg-white p-4">
      <div className="mb-2 flex justify-end gap-1">
        {RANGES.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setRange(key)}
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              range === key ? "bg-primary text-white" : "text-muted hover:bg-surface"
            }`}
          >
            {t(`chartRange.${key}`)}
          </button>
        ))}
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#64748B" }}
              tickFormatter={(value: string) => new Date(value).toLocaleDateString(locale, { month: "short", day: "numeric" })}
              axisLine={{ stroke: "#F8FAFC" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748B" }}
              width={40}
              domain={["dataMin - 2", "dataMax + 2"]}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number) => [`${value} ${unit}`, ""]}
              labelFormatter={(value: string) => new Date(value).toLocaleDateString(locale, { dateStyle: "medium" })}
              contentStyle={{ borderRadius: 8, borderColor: "#F8FAFC", fontSize: 12 }}
            />
            {referenceLow !== null && referenceHigh !== null && (
              <ReferenceArea y1={referenceLow} y2={referenceHigh} ifOverflow="extendDomain" fill="#0F9EA0" fillOpacity={0.08} strokeOpacity={0} />
            )}
            {referenceHigh !== null && (
              <ReferenceLine y={referenceHigh} ifOverflow="extendDomain" stroke="#64748B" strokeDasharray="4 4" strokeOpacity={0.6} />
            )}
            {referenceLow !== null && (
              <ReferenceLine y={referenceLow} ifOverflow="extendDomain" stroke="#64748B" strokeDasharray="4 4" strokeOpacity={0.6} />
            )}
            <Line type="monotone" dataKey="value" stroke="#0F9EA0" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {band.kind === "value" && <p className="mt-2 text-xs text-muted">{band.label}</p>}
      {band.kind === "changed" && <p className="mt-2 text-xs text-muted">{band.note}</p>}
    </div>
  );
}
