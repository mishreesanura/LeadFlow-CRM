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
                style={{ position: 'relative' }}
              >
                <button 
                  type="button" 
                  className="icon-button" 
                  onClick={() => onEdit(lead)} 
                  aria-label="Edit lead" 
                  title="Edit"
                  style={{ position: 'absolute', top: '8px', right: '8px', width: '28px', height: '28px' }}
                >
                  <Edit3 size={14} />
                </button>
                <button type="button" onClick={() => onSelect(lead)} style={{ paddingRight: '24px', textAlign: 'left' }}>
                  <strong>{lead.name}</strong>
                  <span style={{ color: 'var(--ink)', fontSize: '13px', fontWeight: '500', opacity: 0.8, display: 'block', marginTop: '4px' }}>{lead.company}</span>
                </button>
                <div className="pipeline-meta" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                  <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary)' }}>{currency.format(lead.estimatedValue)}</span>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{formatDate(lead.createdAt)}</span>
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
