"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Edit3 } from "lucide-react";
import { currency, formatDate } from "@/lib/format";
import type { Lead, LeadStatus } from "@/types/lead";
import { leadStatuses } from "@/types/lead";

type PipelineBoardProps = {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onSelect: (lead: Lead) => void;
  onStatusChange: (lead: Lead, status: LeadStatus) => void;
};

export function PipelineBoard({ leads, onEdit, onSelect, onStatusChange }: PipelineBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    return leadStatuses.reduce<Record<LeadStatus, Lead[]>>((acc, status) => {
      acc[status] = leads.filter((lead) => lead.status === status);
      return acc;
    }, {} as Record<LeadStatus, Lead[]>);
  }, [leads]);

  return (
    <div className="pipeline-board">
      {leadStatuses.map((status) => (
        <section
          className={`pipeline-column status-${status.toLowerCase()}`}
          key={status}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const lead = leads.find((item) => item.id === draggingId);
            if (lead && lead.status !== status) onStatusChange(lead, status);
            setDraggingId(null);
          }}
        >
          <header>
            <span className={`status-dot status-${status.toLowerCase()}`} />
            <h3>{status}</h3>
            <strong>{grouped[status].length}</strong>
          </header>

          <div className="pipeline-list">
            {grouped[status].map((lead) => (
              <article
                className="pipeline-card"
                draggable
                key={lead.id}
                onDragStart={() => setDraggingId(lead.id)}
                onDragEnd={() => setDraggingId(null)}
              >
                <button type="button" onClick={() => onSelect(lead)}>
                  <strong>{lead.name}</strong>
                  <span style={{ color: 'var(--ink)', fontSize: '13px', fontWeight: '500', opacity: 0.8, display: 'block', marginTop: '4px' }}>{lead.company}</span>
                </button>
                <div className="pipeline-meta">
                  <span>{currency.format(lead.estimatedValue)}</span>
                  <span>{formatDate(lead.createdAt)}</span>
                </div>
                <div className="pipeline-actions">
                  <button type="button" className="icon-button" onClick={() => onEdit(lead)} aria-label="Edit lead" title="Edit">
                    <Edit3 size={14} />
                  </button>
                  <select
                    value={lead.status}
                    onChange={(event) => onStatusChange(lead, event.target.value as LeadStatus)}
                    aria-label={`Move ${lead.name}`}
                  >
                    {leadStatuses.map((nextStatus) => (
                      <option key={nextStatus} value={nextStatus}>
                        {nextStatus}
                      </option>
                    ))}
                  </select>
                </div>
              </article>
            ))}
            {!grouped[status].length ? (
              <div className="pipeline-empty">
                <ArrowRight size={16} />
                <span>Drop leads here</span>
              </div>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  );
}
