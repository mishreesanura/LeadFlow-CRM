"use client";

import { ArrowUpRight, BarChart3, CircleDollarSign, Gauge, Target } from "lucide-react";
import { compactNumber, currency } from "@/lib/format";
import type { LeadStats } from "@/types/lead";

type StatsPanelProps = {
  stats?: LeadStats;
  isLoading: boolean;
};

export function StatsPanel({ stats, isLoading }: StatsPanelProps) {
  const cards = [
    {
      label: "Total leads",
      value: stats ? compactNumber.format(stats.total) : "--",
      helper: stats ? `${stats.newThisMonth} new this month` : "Loading",
      icon: BarChart3
    },
    {
      label: "Conversion",
      value: stats ? `${stats.conversionRate}%` : "--",
      helper: "Converted over total",
      icon: Target
    },
    {
      label: "Qualification",
      value: stats ? `${stats.qualificationRate}%` : "--",
      helper: "Qualified or converted",
      icon: Gauge
    },
    {
      label: "Pipeline value",
      value: stats ? currency.format(stats.pipelineValue) : "--",
      helper: "Open expected value",
      icon: CircleDollarSign
    }
  ];

  return (
    <section className="stats-grid" aria-label="Lead statistics">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const isPrimary = index === 0;
        return (
          <article className={`stat-card ${isPrimary ? "primary" : ""}`} key={card.label} aria-busy={isLoading}>
            <div className="stat-card-header">
              <p>{card.label}</p>
              <div className="stat-icon" aria-hidden="true">
                <ArrowUpRight size={16} />
              </div>
            </div>
            <div>
              <strong>{card.value}</strong>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {card.helper}
              </span>
            </div>
          </article>
        );
      })}
    </section>
  );
}
