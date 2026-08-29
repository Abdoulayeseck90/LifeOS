"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Mirrors weight-trend-chart.tsx (one chart, no gridlines/legend beyond
// the two series the spec explicitly asks for) with its own range set —
// Spec: "7 days / 30 days / 3 months / 6 months / 1 year". Systolic uses
// the LifeOS teal per spec; diastolic uses the secondary navy token so
// the two lines stay visually distinct without introducing a new color.

type RangeKey = "7d" | "30d" | "3m" | "6m" | "1y";
const RANGE_DAYS: Record<RangeKey, number> = { "7d": 7, "30d": 30, "3m": 90, "6m": 182, "1y": 365 };
const RANGES: RangeKey[] = ["7d", "30d", "3m", "6m", "1y"];

export function BloodPressureChart({
  entries,
}: {
  entries: { date: string; systolic: number; diastolic: number }[];
}) {
  const t = useTranslations("vitals.bloodPressure");
  const { locale } = useParams<{ locale: string }>();
  const [range, setRange] = useState<RangeKey>("30d");

  const filteredEntries = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RANGE_DAYS[range]);
    return entries.filter((entry) => new Date(entry.date) >= cutoff);
  }, [entries, range]);

  // Same fallback as the weight chart: a narrow range can leave too few
  // points to plot a trend — fall back to the full set rather than an
  // empty/broken chart.
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
            {t(`chart.range.${key}`)}
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
              width={32}
              domain={["dataMin - 10", "dataMax + 10"]}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              labelFormatter={(value: string) => new Date(value).toLocaleDateString(locale, { dateStyle: "medium" })}
              formatter={(value: number, name: string) => [`${value} ${t("unit")}`, name === "systolic" ? t("chart.systolic") : t("chart.diastolic")]}
              contentStyle={{ borderRadius: 8, borderColor: "#F8FAFC", fontSize: 12 }}
            />
            <Line type="monotone" dataKey="systolic" stroke="#0F9EA0" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="diastolic" stroke="#0F172A" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
