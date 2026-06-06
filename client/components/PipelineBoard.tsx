"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Edit3, Eye, Trash2, X } from "lucide-react";
import { currency, formatDate } from "@/lib/format";
import type { Lead, LeadStatus } from "@/types/lead";
import { leadStatuses } from "@/types/lead";

type PipelineBoardProps = {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => boolean | void;
  onSelect: (lead: Lead) => void;
  onStatusChange: (lead: Lead, status: LeadStatus) => void;
  onBulkStatusChange: (leads: Lead[], status: LeadStatus) => void;
  onBulkDelete: (leads: Lead[]) => boolean | void;
  isBulkActionPending?: boolean;
};

export function PipelineBoard({
  leads,
  onEdit,
  onDelete,
  onSelect,
  onStatusChange,
  onBulkStatusChange,
  onBulkDelete,
  isBulkActionPending = false
}: PipelineBoardProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [draggingIds, setDraggingIds] = useState<string[]>([]);

  const grouped = useMemo(() => {
    return leadStatuses.reduce<Record<LeadStatus, Lead[]>>((acc, status) => {
      acc[status] = leads.filter((lead) => lead.status === status);
      return acc;
    }, {} as Record<LeadStatus, Lead[]>);
  }, [leads]);

  const selectedLeads = useMemo(() => {
    return leads.filter((lead) => selectedIds.has(lead.id));
  }, [leads, selectedIds]);

  useEffect(() => {
    setSelectedIds((current) => {
      const visibleLeadIds = new Set(leads.map((lead) => lead.id));
      const next = new Set([...current].filter((id) => visibleLeadIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [leads]);

  const clearSelection = () => setSelectedIds(new Set());

  const toggleSelection = (leadId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(leadId)) {
        next.delete(leadId);
      } else {
        next.add(leadId);
      }
      return next;
    });
  };

  const handleCardKeyDown = (leadId: string, event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggleSelection(leadId);
  };

  const moveLeadsToStatus = (targetLeads: Lead[], status: LeadStatus) => {
    const movableLeads = targetLeads.filter((lead) => lead.status !== status);
    if (!movableLeads.length) return;

    if (movableLeads.length === 1) {
      onStatusChange(movableLeads[0], status);
    } else {
      onBulkStatusChange(movableLeads, status);
    }

    const movedIds = new Set(movableLeads.map((lead) => lead.id));
    if ([...selectedIds].some((id) => movedIds.has(id))) {
      clearSelection();
    }
  };

  const deleteSingleLead = (lead: Lead) => {
    const shouldClear = onDelete(lead);
    if (shouldClear === false) return;

    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(lead.id);
      return next;
    });
  };

  const deleteSelectedLeads = () => {
    if (!selectedLeads.length) return;
    const shouldClear = onBulkDelete(selectedLeads);
    if (shouldClear !== false) clearSelection();
  };

  const handleDragStart = (lead: Lead, event: React.DragEvent<HTMLElement>) => {
    const ids = selectedIds.has(lead.id) ? [...selectedIds] : [lead.id];
    setDraggingIds(ids);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", ids.join(","));
  };

  const handleDrop = (status: LeadStatus, event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    const transferIds = event.dataTransfer.getData("text/plain").split(",").filter(Boolean);
    const ids = draggingIds.length ? draggingIds : transferIds;
    const draggedLeads = leads.filter((lead) => ids.includes(lead.id));

    moveLeadsToStatus(draggedLeads, status);
    setDraggingIds([]);
  };

  return (
    <>
      <div className="pipeline-toolbar" aria-live="polite">
        <div>
          <strong>{selectedLeads.length ? `${selectedLeads.length} selected` : "Bulk actions"}</strong>
          <span>
            {selectedLeads.length
              ? "Drag a selected card or choose a status."
              : "Click cards to select them for group moves and deletes."}
          </span>
        </div>

        {selectedLeads.length ? (
          <div className="bulk-actions">
            <select
              className="bulk-move-select"
              defaultValue=""
              disabled={isBulkActionPending}
              aria-label="Move selected leads to status"
              onChange={(event) => {
                const status = event.target.value as LeadStatus;
                if (status) moveLeadsToStatus(selectedLeads, status);
                event.currentTarget.value = "";
              }}
            >
              <option value="" disabled>
                Move to...
              </option>
              {leadStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button
              className="button danger compact"
              type="button"
              disabled={isBulkActionPending}
              onClick={deleteSelectedLeads}
            >
              <Trash2 size={15} />
              Delete selected
            </button>
            <button className="icon-button compact" type="button" onClick={clearSelection} aria-label="Clear selection" title="Clear selection">
              <X size={15} />
            </button>
          </div>
        ) : null}
      </div>

      <div className="pipeline-board">
        {leadStatuses.map((status) => (
          <section
            className={`pipeline-column status-${status.toLowerCase()} ${draggingIds.length ? "drop-ready" : ""}`}
            key={status}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(status, event)}
          >
            <header>
              <span className={`status-dot status-${status.toLowerCase()}`} />
              <h3>{status}</h3>
              <strong>{grouped[status].length}</strong>
            </header>

            <div className="pipeline-list">
              {grouped[status].map((lead) => {
                const isSelected = selectedIds.has(lead.id);
                const isDragging = draggingIds.includes(lead.id);

                return (
                  <article
                    className={`pipeline-card ${isSelected ? "selected" : ""} ${isDragging ? "dragging" : ""}`}
                    draggable={!isBulkActionPending}
                    key={lead.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`${isSelected ? "Deselect" : "Select"} ${lead.name}`}
                    onClick={() => toggleSelection(lead.id)}
                    onKeyDown={(event) => handleCardKeyDown(lead.id, event)}
                    onDragStart={(event) => handleDragStart(lead, event)}
                    onDragEnd={() => setDraggingIds([])}
                  >
                    <div className="pipeline-card-main">
                      <strong>{lead.name}</strong>
                      <span>{lead.company}</span>
                    </div>

                    <div className="pipeline-meta">
                      <span>{currency.format(lead.estimatedValue)}</span>
                      <span>{formatDate(lead.createdAt)}</span>
                    </div>

                    <div className="pipeline-card-toolbar" aria-label={`${lead.name} actions`}>
                      <div className="pipeline-card-actions">
                        <button
                          type="button"
                          className="icon-button compact"
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelect(lead);
                          }}
                          aria-label={`View ${lead.name}`}
                          title="View details"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          className="icon-button compact"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEdit(lead);
                          }}
                          aria-label={`Edit ${lead.name}`}
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          className="icon-button danger compact"
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteSingleLead(lead);
                          }}
                          aria-label={`Delete ${lead.name}`}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
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
    </>
  );
}
