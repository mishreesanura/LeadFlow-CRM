"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, Calendar, Mail, Phone, SquarePen, Trash2 } from "lucide-react";
import { getLeadActivity } from "@/lib/api";
import { currency, formatDate, formatDateTime } from "@/lib/format";
import type { Lead } from "@/types/lead";

type LeadDetailDrawerProps = {
  lead: Lead | null;
  onClose: () => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
};

export function LeadDetailDrawer({ lead, onClose, onEdit, onDelete }: LeadDetailDrawerProps) {
  const activityQuery = useQuery({
    queryKey: ["lead-activity", lead?.id],
    queryFn: () => getLeadActivity(lead!.id),
    enabled: Boolean(lead)
  });

  if (!lead) return null;

  return (
    <aside className="drawer detail-drawer" aria-label="Lead details">
      <div className="drawer-header">
        <div>
          <p>{lead.company}</p>
          <h2>{lead.name}</h2>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Close details" title="Close">
          ×
        </button>
      </div>

      <div className="detail-actions">
        <button className="button secondary" type="button" onClick={() => onEdit(lead)}>
          <SquarePen size={16} /> Edit
        </button>
        <button className="button danger" type="button" onClick={() => onDelete(lead)}>
          <Trash2 size={16} /> Delete
        </button>
      </div>

      <section className="detail-panel">
        <div className="detail-row">
          <Mail size={16} />
          <span>{lead.email}</span>
        </div>
        <div className="detail-row">
          <Phone size={16} />
          <span>{lead.phone}</span>
        </div>
        <div className="detail-row">
          <Building2 size={16} />
          <span>{lead.company}</span>
        </div>
        <div className="detail-row">
          <Calendar size={16} />
          <span>Created {formatDate(lead.createdAt)}</span>
        </div>
      </section>

      <section className="detail-panel split">
        <div>
          <p>Status</p>
          <strong className={`badge status-${lead.status.toLowerCase()}`}>{lead.status}</strong>
        </div>
        <div>
          <p>Health</p>
          <strong>{lead.healthScore}/100</strong>
        </div>
        <div>
          <p>Value</p>
          <strong>{currency.format(lead.estimatedValue)}</strong>
        </div>
      </section>

      <section className="detail-panel">
        <h3>Notes</h3>
        <p className="notes">{lead.notes}</p>
      </section>

      <section className="detail-panel">
        <h3>Status history</h3>
        <div className="timeline">
          {lead.statusHistory?.slice().reverse().map((item, index) => (
            <div className="timeline-item" key={`${item.status}-${item.changedAt}-${index}`}>
              <span className={`status-dot status-${item.status.toLowerCase()}`} />
              <div>
                <strong>{item.status}</strong>
                <p>{item.note ?? "Status updated"}</p>
                <small>{formatDateTime(item.changedAt)}</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="detail-panel">
        <h3>Activity</h3>
        <div className="timeline">
          {activityQuery.isLoading ? <p className="muted">Loading activity...</p> : null}
          {activityQuery.data?.map((activity) => (
            <div className="timeline-item" key={activity.id}>
              <span className="timeline-pin" />
              <div>
                <strong>{activity.type.replace("_", " ")}</strong>
                <p>{activity.message}</p>
                <small>{formatDateTime(activity.createdAt)}</small>
              </div>
            </div>
          ))}
          {!activityQuery.isLoading && !activityQuery.data?.length ? <p className="muted">No activity yet.</p> : null}
        </div>
      </section>
    </aside>
  );
}
