"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Columns3,
  Filter,
  LayoutDashboard,
  ListFilter,
  Plus,
  RefreshCcw,
  Search,
  SlidersHorizontal
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CommandPalette, type Command } from "@/components/CommandPalette";
import { LeadDetailDrawer } from "@/components/LeadDetailDrawer";
import { LeadForm } from "@/components/LeadForm";
import { LeadTable } from "@/components/LeadTable";
import { PipelineBoard } from "@/components/PipelineBoard";
import { StatsPanel } from "@/components/StatsPanel";
import { createLead, deleteLead, getLeads, getLeadStats, updateLead } from "@/lib/api";
import { useDebouncedValue } from "@/lib/hooks";
import type { Lead, LeadInput, LeadQuery, LeadStatus } from "@/types/lead";
import { leadStatuses } from "@/types/lead";

type ViewMode = "table" | "pipeline";

const initialQuery: LeadQuery = {
  page: 1,
  limit: 8,
  sortBy: "createdAt",
  sortOrder: "desc"
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function LeadDashboard() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState<LeadQuery>(initialQuery);
  const [searchInput, setSearchInput] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    setQuery((current) => ({
      ...current,
      page: 1,
      search: debouncedSearch.trim() || undefined
    }));
  }, [debouncedSearch]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsCommandOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const leadsQuery = useQuery({
    queryKey: ["leads", query],
    queryFn: () => getLeads(query)
  });

  const statsQuery = useQuery({
    queryKey: ["lead-stats"],
    queryFn: getLeadStats
  });

  const invalidateLeadData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["leads"] }),
      queryClient.invalidateQueries({ queryKey: ["lead-stats"] }),
      queryClient.invalidateQueries({ queryKey: ["lead-activity"] })
    ]);
  };

  const createMutation = useMutation({
    mutationFn: createLead,
    onSuccess: async () => {
      setIsFormOpen(false);
      setEditingLead(null);
      await invalidateLeadData();
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateLead,
    onSuccess: async (lead) => {
      setSelectedLead((current) => (current?.id === lead.id ? lead : current));
      setIsFormOpen(false);
      setEditingLead(null);
      await invalidateLeadData();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: async () => {
      setSelectedLead(null);
      setIsFormOpen(false);
      setEditingLead(null);
      await invalidateLeadData();
    }
  });

  const leads = leadsQuery.data?.data ?? [];
  const meta = leadsQuery.data?.meta;

  const openCreate = () => {
    setEditingLead(null);
    setIsFormOpen(true);
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setIsFormOpen(true);
  };

  const handleSubmitLead = (payload: LeadInput) => {
    if (editingLead) {
      updateMutation.mutate({ id: editingLead.id, payload });
      return;
    }
    createMutation.mutate(payload);
  };

  const handleDeleteLead = (lead: Lead) => {
    const confirmed = window.confirm(`Delete ${lead.name}? This cannot be undone.`);
    if (confirmed) deleteMutation.mutate(lead.id);
  };

  const handleStatusChange = (lead: Lead, status: LeadStatus) => {
    if (lead.status === status) return;
    updateMutation.mutate({ id: lead.id, payload: { status } });
  };

  const handleSort = (field: LeadQuery["sortBy"]) => {
    setQuery((current) => ({
      ...current,
      page: 1,
      sortBy: field,
      sortOrder: current.sortBy === field && current.sortOrder === "asc" ? "desc" : "asc"
    }));
  };

  const setStatusFilter = (status?: LeadStatus) => {
    setQuery((current) => ({
      ...current,
      page: 1,
      status
    }));
  };

  const resetFilters = () => {
    setSearchInput("");
    setQuery(initialQuery);
  };

  const commands = useMemo<Command[]>(() => {
    const leadCommands = leads.slice(0, 6).map((lead) => ({
      id: `lead-${lead.id}`,
      label: `Open ${lead.name}`,
      section: lead.company,
      action: () => setSelectedLead(lead)
    }));

    return [
      { id: "create", label: "Create lead", section: "Lead", action: openCreate },
      { id: "table", label: "Table view", section: "View", action: () => setViewMode("table") },
      { id: "pipeline", label: "Pipeline view", section: "View", action: () => setViewMode("pipeline") },
      { id: "all-status", label: "Show all statuses", section: "Filter", action: () => setStatusFilter(undefined) },
      ...leadStatuses.map((status) => ({
        id: `status-${status}`,
        label: `Filter ${status}`,
        section: "Filter",
        action: () => setStatusFilter(status)
      })),
      ...leadCommands
    ];
  }, [leads]);

  const formError = getErrorMessage(editingLead ? updateMutation.error : createMutation.error);
  const shouldShowFormError = Boolean(editingLead ? updateMutation.error : createMutation.error);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">
          <span>LF</span>
        </div>
        <nav aria-label="Workspace navigation">
          <button className="nav-item active" type="button" title="Dashboard" aria-label="Dashboard">
            <LayoutDashboard size={18} />
          </button>
          <button
            className="nav-item"
            type="button"
            title="Pipeline"
            aria-label="Pipeline"
            onClick={() => setViewMode("pipeline")}
          >
            <Columns3 size={18} />
          </button>
          <button
            className="nav-item"
            type="button"
            title="Filters"
            aria-label="Filters"
            onClick={() => setStatusFilter(undefined)}
          >
            <Filter size={18} />
          </button>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p>LeadFlow CRM</p>
            <h1>Sales pipeline</h1>
          </div>
          <div className="topbar-actions">
            <button className="button secondary" type="button" onClick={() => setIsCommandOpen(true)}>
              <Search size={16} />
              Command
              <kbd>⌘K</kbd>
            </button>
            <button className="button primary" type="button" onClick={openCreate}>
              <Plus size={16} />
              New lead
            </button>
          </div>
        </header>

        <StatsPanel stats={statsQuery.data} isLoading={statsQuery.isLoading} />

        <section className="control-bar" aria-label="Lead controls">
          <label className="search-box">
            <Search size={18} />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search name, email, company"
            />
          </label>

          <div className="segmented" role="group" aria-label="View mode">
            <button className={viewMode === "table" ? "active" : ""} type="button" onClick={() => setViewMode("table")}>
              <ListFilter size={16} /> Table
            </button>
            <button
              className={viewMode === "pipeline" ? "active" : ""}
              type="button"
              onClick={() => setViewMode("pipeline")}
            >
              <Columns3 size={16} /> Pipeline
            </button>
          </div>

          <button className="icon-button" type="button" onClick={resetFilters} aria-label="Reset filters" title="Reset filters">
            <RefreshCcw size={16} />
          </button>
        </section>

        <section className="status-tabs" aria-label="Status filters">
          <button className={!query.status ? "active" : ""} type="button" onClick={() => setStatusFilter(undefined)}>
            All
          </button>
          {leadStatuses.map((status) => (
            <button
              className={query.status === status ? "active" : ""}
              type="button"
              key={status}
              onClick={() => setStatusFilter(status)}
            >
              <span className={`status-dot status-${status.toLowerCase()}`} />
              {status}
            </button>
          ))}
        </section>

        {leadsQuery.isError ? (
          <div className="error-state">
            <SlidersHorizontal size={22} />
            <div>
              <h3>API unavailable</h3>
              <p>{getErrorMessage(leadsQuery.error)}</p>
            </div>
          </div>
        ) : viewMode === "table" ? (
          <LeadTable
            leads={leads}
            isLoading={leadsQuery.isLoading}
            sortBy={query.sortBy}
            sortOrder={query.sortOrder}
            onSort={handleSort}
            onEdit={openEdit}
            onDelete={handleDeleteLead}
            onSelect={setSelectedLead}
            onStatusChange={handleStatusChange}
          />
        ) : (
          <PipelineBoard
            leads={leads}
            onEdit={openEdit}
            onSelect={setSelectedLead}
            onStatusChange={handleStatusChange}
          />
        )}

        <footer className="pagination-bar">
          <span>
            {meta ? `${meta.total} leads · Page ${meta.page} of ${meta.totalPages}` : "Loading leads"}
          </span>
          <div>
            <button
              className="button secondary"
              type="button"
              disabled={!meta || meta.page <= 1}
              onClick={() => setQuery((current) => ({ ...current, page: Math.max(1, current.page - 1) }))}
            >
              Previous
            </button>
            <button
              className="button secondary"
              type="button"
              disabled={!meta || meta.page >= meta.totalPages}
              onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}
            >
              Next
            </button>
          </div>
        </footer>
      </section>

      {isFormOpen ? (
        <div className="drawer-layer" role="presentation" onMouseDown={() => setIsFormOpen(false)}>
          <aside className="drawer" aria-label={editingLead ? "Edit lead" : "Create lead"} onMouseDown={(event) => event.stopPropagation()}>
            <LeadForm
              lead={editingLead}
              isSaving={createMutation.isPending || updateMutation.isPending}
              error={shouldShowFormError ? formError : undefined}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingLead(null);
              }}
              onSubmit={handleSubmitLead}
            />
          </aside>
        </div>
      ) : null}

      {selectedLead ? (
        <div className="drawer-layer" role="presentation" onMouseDown={() => setSelectedLead(null)}>
          <div onMouseDown={(event) => event.stopPropagation()}>
            <LeadDetailDrawer
              lead={selectedLead}
              onClose={() => setSelectedLead(null)}
              onEdit={openEdit}
              onDelete={handleDeleteLead}
            />
          </div>
        </div>
      ) : null}

      <CommandPalette isOpen={isCommandOpen} commands={commands} onClose={() => setIsCommandOpen(false)} />

      {deleteMutation.isPending || updateMutation.isPending ? <div className="toast">Updating lead...</div> : null}
    </main>
  );
}
