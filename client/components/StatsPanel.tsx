"use client";

import { Info } from "lucide-react";
import { useId } from "react";
import { compactNumber, currency } from "@/lib/format";
import type { LeadStats, LeadStatsTrendPoint } from "@/types/lead";

type StatsPanelProps = {
  stats?: LeadStats;
  isLoading: boolean;
};

type SparkPoint = {
  label: string;
  value: number;
};

type SparkType = "line" | "bar";

type TooltipRow = {
  label: string;
  value: string;
};

const emptyTrend: LeadStatsTrendPoint[] = Array.from({ length: 6 }, (_, index) => ({
  month: `empty-${index}`,
  label: "",
  total: 0,
  newLeads: 0,
  conversionRate: 0,
  qualificationRate: 0,
  pipelineValue: 0
}));

function getSmoothPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  const segments = [`M ${points[0].x} ${points[0].y}`];

  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    segments.push(`Q ${current.x} ${current.y} ${midX} ${midY}`);
  }

  const penultimate = points[points.length - 2];
  const last = points[points.length - 1];
  segments.push(`Q ${penultimate.x} ${penultimate.y} ${last.x} ${last.y}`);

  return segments.join(" ");
}

function SparkChart({ points, type }: { points: SparkPoint[]; type: SparkType }) {
  const gradientId = `spark-gradient-${useId().replace(/:/g, "")}`;
  const width = 126;
  const height = 82;
  const padding = 10;
  const values = points.map((point) => point.value);
  const rawMax = values.length ? Math.max(...values) : 0;
  const rawMin = values.length ? Math.min(...values) : 0;
  const rawRange = rawMax - rawMin;
  const linePadding = rawRange ? rawRange * 0.14 : Math.max(Math.abs(rawMax) * 0.1, 1);
  const max = type === "bar" ? Math.max(rawMax * 1.15, 1) : rawMax + linePadding;
  const min = type === "bar" ? 0 : rawMin - linePadding;
  const range = max - min || 1;
  const xStep = (width - padding * 2) / Math.max(points.length - 1, 1);
  const getY = (value: number) => height - padding - ((value - min) / range) * (height - padding * 2);
  const coordinates = points.map((point, index) => ({
    x: padding + index * xStep,
    y: getY(point.value),
    label: point.label,
    value: point.value
  }));
  const linePath = getSmoothPath(coordinates);
  const areaPath = `${linePath} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;
  const barGap = 7;
  const barWidth = Math.max(7, (width - padding * 2 - barGap * (points.length - 1)) / points.length);

  return (
    <svg className={`stat-spark stat-spark-${type}-chart`} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop className="stat-spark-gradient-start" offset="0%" />
          <stop className="stat-spark-gradient-end" offset="100%" />
        </linearGradient>
      </defs>
      {type === "line" ? (
        <>
          <path className="stat-spark-area" d={areaPath} fill={`url(#${gradientId})`} />
          <path className="stat-spark-line" d={linePath} />
        </>
      ) : (
        coordinates.map((point, index) => {
          const barHeight = Math.max(4, height - padding - point.y);
          return (
            <rect
              className={index === coordinates.length - 1 ? "last" : ""}
              height={barHeight}
              key={`${point.label}-${index}`}
              rx="4"
              width={barWidth}
              x={padding + index * (barWidth + barGap)}
              y={height - padding - barHeight}
            />
          );
        })
      )}
    </svg>
  );
}

export function StatsPanel({ stats, isLoading }: StatsPanelProps) {
  const trend = stats?.trend?.length ? stats.trend : emptyTrend;
  const latestTrend = trend[trend.length - 1] ?? emptyTrend[emptyTrend.length - 1];
  const firstTrend = trend[0] ?? emptyTrend[0];
  const sixMonthLeadGrowth = Math.max(0, (latestTrend?.total ?? 0) - (firstTrend?.total ?? 0));
  const qualifiedOrConverted = stats ? stats.statusCounts.Qualified + stats.statusCounts.Converted : 0;
  const trendPoint = (key: keyof Pick<LeadStatsTrendPoint, "total" | "conversionRate" | "qualificationRate" | "pipelineValue">) =>
    trend.map((point) => ({ label: point.label, value: point[key] }));

  const cards = [
    {
      key: "total",
      label: "Total leads",
      value: stats ? compactNumber.format(stats.total) : "--",
      helper: stats ? `${stats.newThisMonth} new this month` : "Loading",
      chartType: "line" as const,
      chartPoints: trendPoint("total"),
      chartTitle: "Cumulative leads",
      chartSummary: stats ? `+${compactNumber.format(sixMonthLeadGrowth)} over 6 months` : "Waiting for trend",
      tooltipRows: [
        { label: "Formula", value: "Total active lead records in the CRM." },
        { label: "Current", value: stats ? `${stats.total} total leads` : "--" },
        { label: "Chart", value: "Cumulative monthly lead count." }
      ]
    },
    {
      key: "conversion",
      label: "Conversion",
      value: stats ? `${stats.conversionRate}%` : "--",
      helper: "Converted over total",
      chartType: "line" as const,
      chartPoints: trendPoint("conversionRate"),
      chartTitle: "Conversion rate",
      chartSummary: stats ? `${latestTrend?.conversionRate ?? 0}% latest trend point` : "Waiting for trend",
      tooltipRows: [
        { label: "Formula", value: "Converted leads divided by total leads." },
        { label: "Current", value: stats ? `${stats.statusCounts.Converted}/${stats.total} converted` : "--" },
        { label: "Chart", value: "Cumulative month-end conversion rate." }
      ]
    },
    {
      key: "qualification",
      label: "Qualification",
      value: stats ? `${stats.qualificationRate}%` : "--",
      helper: "Qualified or converted",
      chartType: "line" as const,
      chartPoints: trendPoint("qualificationRate"),
      chartTitle: "Qualified pipeline",
      chartSummary: stats ? `${latestTrend?.qualificationRate ?? 0}% latest trend point` : "Waiting for trend",
      tooltipRows: [
        { label: "Formula", value: "Qualified plus converted leads divided by total leads." },
        { label: "Current", value: stats ? `${qualifiedOrConverted}/${stats.total} qualified or converted` : "--" },
        { label: "Chart", value: "Cumulative month-end qualification rate." }
      ]
    },
    {
      key: "pipeline",
      label: "Pipeline value",
      value: stats ? currency.format(stats.pipelineValue) : "--",
      helper: "Open expected value",
      chartType: "bar" as const,
      chartPoints: trendPoint("pipelineValue"),
      chartTitle: "Monthly open value",
      chartSummary: stats ? `${currency.format(latestTrend?.pipelineValue ?? 0)} latest month` : "Waiting for trend",
      tooltipRows: [
        { label: "Formula", value: "Sum of estimated value for leads not marked Lost." },
        { label: "Current", value: stats ? currency.format(stats.pipelineValue) : "--" },
        { label: "Chart", value: "Monthly open expected value by lead creation month." }
      ]
    }
  ];

  return (
    <section className="stats-grid" aria-label="Lead statistics">
      {cards.map((card, index) => {
        const isPrimary = index === 0;
        const tooltipId = `stat-tooltip-${card.key}`;

        return (
          <article
            className={`stat-card stat-${card.key} ${isPrimary ? "primary" : ""}`}
            key={card.label}
            aria-busy={isLoading}
          >
            <div className="stat-card-body">
              <div className="stat-card-header">
                <p>{card.label}</p>
                <div className="stat-hint">
                  <span
                    className="stat-hint-icon"
                    aria-label={`How ${card.label} is calculated`}
                    aria-describedby={tooltipId}
                  >
                    <Info size={16} />
                  </span>
                  <div className="stat-tooltip" id={tooltipId} role="tooltip">
                    <strong>Calculation</strong>
                    <dl>
                      {card.tooltipRows.map((row) => (
                        <div key={row.label}>
                          <dt>{row.label}</dt>
                          <dd>{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              </div>

              <div className="stat-content">
                <strong>{card.value}</strong>
                <span>{card.helper}</span>
              </div>
            </div>

            <div className="stat-chart-panel">
              <SparkChart points={card.chartPoints} type={card.chartType} />
              <div className="stat-chart-caption">
                <span>{card.chartTitle}</span>
                <strong>{card.chartSummary}</strong>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
