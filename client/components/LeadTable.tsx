"use client";

import { ArrowDown, ArrowUp, Edit3, Trash2 } from "lucide-react";
import { currency, formatDate } from "@/lib/format";
import type { Lead, LeadQuery } from "@/types/lead";

type LeadTableProps = {
  leads: Lead[];
  isLoading: boolean;
  sortBy: LeadQuery["sortBy"];
  sortOrder: LeadQuery["sortOrder"];
  onSort: (field: LeadQuery["sortBy"]) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onSelect: (lead: Lead) => void;
};

const columns: Array<{ key: LeadQuery["sortBy"]; label: string }> = [
  { key: "name", label: "Lead" },
  { key: "company", label: "Company" },
  { key: "status", label: "Status" },
  { key: "estimatedValue", label: "Value" },
  { key: "createdAt", label: "Created" }
];

export function LeadTable({
  leads,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onEdit,
  onDelete,
  onSelect
}: LeadTableProps) {
  if (isLoading) {
    return (
      <div className="table-shell">
        <div className="loading-list">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="skeleton-row" key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (!leads.length) {
    return (
      <div className="empty-state">
        <h3>No leads found</h3>
        <p>Change filters or add a new lead.</p>
      </div>
    );
  }

  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>
                <button className="sort-button" type="button" onClick={() => onSort(column.key)}>
                  {column.label}
                  {sortBy === column.key ? (
                    sortOrder === "asc" ? (
                      <ArrowUp size={14} />
                    ) : (
                      <ArrowDown size={14} />
                    )
                  ) : null}
                </button>
              </th>
            ))}
            <th>Health</th>
            <th aria-label="Lead actions" />
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id}>
              <td data-label="Lead">
                <button className="lead-cell" type="button" onClick={() => onSelect(lead)}>
                  <strong>{lead.name}</strong>
                  <span>{lead.email}</span>
                </button>
              </td>
              <td data-label="Company">
                <div className="company-cell">
                  <strong>{lead.company}</strong>
                  <span>{lead.phone}</span>
                </div>
              </td>
              <td data-label="Status">
                <span className={`badge status-${lead.status.toLowerCase()}`}>{lead.status}</span>
              </td>
              <td data-label="Value">{currency.format(lead.estimatedValue)}</td>
              <td data-label="Created">{formatDate(lead.createdAt)}</td>
              <td data-label="Health">
                <div 
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    background: lead.healthScore >= 70 ? 'rgba(16, 185, 129, 0.15)' : lead.healthScore >= 40 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: lead.healthScore >= 70 ? '#059669' : lead.healthScore >= 40 ? '#d97706' : '#dc2626'
                  }}
                  aria-label={`Health score ${lead.healthScore}`}
                >
                  {lead.healthScore >= 70 ? 'Good' : lead.healthScore >= 40 ? 'Fair' : 'Poor'} - {lead.healthScore}
                </div>
              </td>
              <td data-label="Actions">
                <div className="row-actions">
                  <button className="icon-button" type="button" onClick={() => onEdit(lead)} aria-label="Edit lead" title="Edit">
                    <Edit3 size={16} />
                  </button>
                  <button
                    className="icon-button danger"
                    type="button"
                    onClick={() => onDelete(lead)}
                    aria-label="Delete lead"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
