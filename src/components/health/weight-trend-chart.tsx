"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// One chart, one purpose: "am I gaining or losing weight?" at a glance
// (Master Redesign Section 13) — no gridlines/legend/extra series, and
// only rendered when there are enough points to show an actual trend
// (the page itself decides that — see health/weight/page.tsx).
// Recharts styling props take real color values, not Tailwind classes —
// the hex values below are the exact tailwind.config.ts tokens
// (primary/muted/surface), not new colors.

type RangeKey = "3m" | "6m" | "1y" | "all";
const RANGE_MONTHS: Record<Exclude<RangeKey, "all">, number> = { "3m": 3, "6m": 6, "1y": 12 };
const RANGES: RangeKey[] = ["3m", "6m", "1y", "all"];

export function WeightTrendChart({ entries }: { entries: { date: string; value: number; unit: string }[] }) {
  const t = useTranslations("weight");
  const { locale } = useParams<{ locale: string }>();
  const [range, setRange] = useState<RangeKey>("6m");
  const unit = entries[entries.length - 1]?.unit ?? "";

  const filteredEntries = useMemo(() => {
    if (range === "all") return entries;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - RANGE_MONTHS[range]);
    return entries.filter((entry) => new Date(entry.date) >= cutoff);
  }, [entries, range]);

  // Filtering by range can leave too few points to plot a line — fall
  // back to the full set rather than showing an empty/broken chart.
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
            <Line type="monotone" dataKey="value" stroke="#0F9EA0" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
