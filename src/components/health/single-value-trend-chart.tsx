"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Generic single-line trend chart for Heart Rate / Temperature (Spec
// Section 9) — mirrors weight-trend-chart.tsx's shape exactly (same
// range presets, same "fall back to full range rather than an empty
// chart" rule) rather than being a third near-duplicate implementation.
// Only rendered by the caller once there are enough points to show an
// actual trend.

type RangeKey = "3m" | "6m" | "1y" | "all";
const RANGE_MONTHS: Record<Exclude<RangeKey, "all">, number> = { "3m": 3, "6m": 6, "1y": 12 };
const RANGES: RangeKey[] = ["3m", "6m", "1y", "all"];

export function SingleValueTrendChart({ entries }: { entries: { date: string; value: number; unit: string }[] }) {
  const t = useTranslations("vitals");
  const { locale } = useParams<{ locale: string }>();
  const [range, setRange] = useState<RangeKey>("6m");
  const unit = entries[entries.length - 1]?.unit ?? "";

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
            <Line type="monotone" dataKey="value" stroke="#0F9EA0" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
