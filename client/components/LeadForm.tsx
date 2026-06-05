"use client";

import { useEffect, useState } from "react";
import { Calendar, Mail, NotebookText, Phone, UserRound, Building2 } from "lucide-react";
import type { Lead, LeadInput, LeadPriority, LeadStatus } from "@/types/lead";
import { leadPriorities, leadStatuses } from "@/types/lead";

const emptyForm: LeadInput = {
  name: "",
  email: "",
  phone: "",
  company: "",
  status: "New",
  notes: "",
  source: "",
  priority: "Medium",
  estimatedValue: 0
};

type LeadFormProps = {
  lead?: Lead | null;
  isSaving: boolean;
  error?: string;
  onCancel: () => void;
  onSubmit: (payload: LeadInput) => void;
};

function toDateInput(value?: string) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function LeadForm({ lead, isSaving, error, onCancel, onSubmit }: LeadFormProps) {
  const [form, setForm] = useState<LeadInput>(emptyForm);

  useEffect(() => {
    if (!lead) {
      setForm(emptyForm);
      return;
    }

    setForm({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      status: lead.status,
      notes: lead.notes,
      source: lead.source ?? "",
      priority: lead.priority,
      estimatedValue: lead.estimatedValue,
      lastContactedAt: toDateInput(lead.lastContactedAt)
    });
  }, [lead]);

  const updateField = <K extends keyof LeadInput>(key: K, value: LeadInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <form
      className="lead-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          ...form,
          estimatedValue: Number(form.estimatedValue || 0),
          lastContactedAt: form.lastContactedAt || undefined
        });
      }}
    >
      <div className="drawer-header">
        <div>
          <p>{lead ? "Edit lead" : "New lead"}</p>
          <h2>{lead ? lead.name : "Add lead"}</h2>
        </div>
        <button className="icon-button" type="button" onClick={onCancel} aria-label="Close form" title="Close">
          ×
        </button>
      </div>

      {error ? <div className="form-error">{error}</div> : null}

      <label className="field">
        <span>
          <UserRound size={15} /> Name
        </span>
        <input
          required
          value={form.name}
          onChange={(event) => updateField("name", event.target.value)}
          placeholder="Maya Shah"
        />
      </label>

      <label className="field">
        <span>
          <Mail size={15} /> Email
        </span>
        <input
          required
          type="email"
          value={form.email}
          onChange={(event) => updateField("email", event.target.value)}
          placeholder="maya@company.com"
        />
      </label>

      <div className="form-grid">
        <label className="field">
          <span>
            <Phone size={15} /> Phone
          </span>
          <input
            required
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            placeholder="+91 98765 43210"
          />
        </label>

        <label className="field">
          <span>
            <Building2 size={15} /> Company
          </span>
          <input
            required
            value={form.company}
            onChange={(event) => updateField("company", event.target.value)}
            placeholder="Acme Co"
          />
        </label>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>Status</span>
          <select value={form.status} onChange={(event) => updateField("status", event.target.value as LeadStatus)}>
            {leadStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Priority</span>
          <select
            value={form.priority}
            onChange={(event) => updateField("priority", event.target.value as LeadPriority)}
          >
            {leadPriorities.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>Source</span>
          <input
            value={form.source ?? ""}
            onChange={(event) => updateField("source", event.target.value)}
            placeholder="Website"
          />
        </label>

        <label className="field">
          <span>Estimated value</span>
          <input
            min="0"
            type="number"
            value={form.estimatedValue}
            onChange={(event) => updateField("estimatedValue", Number(event.target.value))}
          />
        </label>
      </div>

      <label className="field">
        <span>
          <Calendar size={15} /> Last contacted
        </span>
        <input
          type="date"
          value={form.lastContactedAt ?? ""}
          onChange={(event) => updateField("lastContactedAt", event.target.value)}
        />
      </label>

      <label className="field">
        <span>
          <NotebookText size={15} /> Notes
        </span>
        <textarea
          required
          value={form.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          placeholder="Add buying intent, context, or follow-up notes."
          rows={5}
        />
      </label>

      <div className="form-actions">
        <button className="button secondary" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="button primary" type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : lead ? "Save lead" : "Create lead"}
        </button>
      </div>
    </form>
  );
}
