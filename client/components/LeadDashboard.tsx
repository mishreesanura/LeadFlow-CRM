"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart2,
  Bell,
  Calendar,
  Columns3,
  Filter,
  HelpCircle,
  LayoutDashboard,
  ListFilter,
  LogOut,
  Mail,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  SlidersHorizontal,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronDown
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const showDummyToast = (action: string) => {
    setToastMessage(`Dummy feature: ${action}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

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
    <main className={`app-shell ${isSidebarCollapsed ? "collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="brand-mark" style={{ justifyContent: 'space-between', width: '100%', marginBottom: '24px' }}>
          <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--ink)' }}>LeadFlow</span>
          <button 
            className="icon-button" 
            type="button" 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{ width: '32px', height: '32px' }}
          >
            {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
        
        <div className="sidebar-section">
          <div className="sidebar-section-title">Menu</div>
          <nav aria-label="Workspace navigation">
            <button className={`nav-item ${viewMode === "table" ? "active" : ""}`} type="button" onClick={() => setViewMode("table")}>
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </button>
            <button className={`nav-item ${viewMode === "pipeline" ? "active" : ""}`} type="button" onClick={() => setViewMode("pipeline")}>
              <Columns3 size={18} />
              <span>Pipeline</span>
            </button>
            <button className="nav-item" type="button" onClick={() => showDummyToast("Calendar view")}>
              <Calendar size={18} />
              <span>Calendar</span>
            </button>
            <button className="nav-item" type="button" onClick={() => showDummyToast("Analytics dashboard")}>
              <BarChart2 size={18} />
              <span>Analytics</span>
            </button>
            <button className="nav-item" type="button" onClick={() => showDummyToast("Team management")}>
              <Users size={18} />
              <span>Team</span>
            </button>
          </nav>
        </div>

        <div className="sidebar-section" style={{ marginTop: 'auto' }}>
          <div className="sidebar-section-title">General</div>
          <nav aria-label="General navigation">
            <button className="nav-item" type="button" onClick={() => showDummyToast("Settings")}>
              <Settings size={18} />
              <span>Settings</span>
            </button>
            <button className="nav-item" type="button" onClick={() => showDummyToast("Help & Support")}>
              <HelpCircle size={18} />
              <span>Help</span>
            </button>
            <button className="nav-item" type="button" onClick={() => showDummyToast("Logged out")}>
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </nav>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar" style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '16px' }}>
          <div className="topbar-search" style={{ flex: 1, maxWidth: '400px', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface)', padding: '0 16px', height: '44px', borderRadius: '22px', border: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => setIsCommandOpen(true)}>
            <Search size={16} color="var(--muted)" />
            <span style={{ color: 'var(--muted)', fontSize: '14px', flex: 1 }}>Search lead <kbd style={{ marginLeft: '8px', border: 'none', background: 'rgba(0,0,0,0.05)', color: 'var(--ink)' }}>⌘K</kbd></span>
          </div>

          <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="icon-button" type="button" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }} onClick={() => showDummyToast("Messages")}>
              <Mail size={18} />
            </button>
            <button className="icon-button" type="button" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }} onClick={() => showDummyToast("Notifications")}>
              <Bell size={18} />
            </button>
            <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '8px', cursor: 'pointer' }} onClick={() => showDummyToast("User Profile")}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'grid', placeItems: 'center', fontWeight: 'bold' }}>JD</div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--ink)' }}>Jane Doe</span>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>jane@leadflow.com</span>
              </div>
            </div>
          </div>
        </header>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px' }}>Dashboard</h1>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="button primary" type="button" onClick={openCreate}>
              <Plus size={16} />
              Add Lead
            </button>
            <button className="button secondary" type="button" onClick={() => showDummyToast("Importing data...")}>
              Import Data
            </button>
          </div>
        </div>

        <StatsPanel stats={statsQuery.data} isLoading={statsQuery.isLoading} />

        <section className="control-bar" aria-label="Lead controls" style={{ marginBottom: '24px' }}>
          <label className="search-box">
            <Search size={18} />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search leads..."
            />
          </label>

          <div className="status-filter" style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>Status:</span>
            
            <button
              type="button"
              className="status-dropdown"
              onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
              onBlur={() => setTimeout(() => setIsStatusMenuOpen(false), 150)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '6px 12px 6px 16px', minWidth: '130px', backgroundImage: 'none' }}
            >
              <span>{query.status || "All Statuses"}</span>
              <ChevronDown size={14} style={{ color: 'var(--muted)', transform: isStatusMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {isStatusMenuOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: '50px',
                marginTop: '8px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                padding: '6px',
                zIndex: 100,
                minWidth: '160px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                animation: 'modalIn 150ms ease-out'
              }}>
                <button 
                  type="button"
                  style={{ textAlign: 'left', padding: '8px 12px', fontSize: '13px', borderRadius: '8px', background: !query.status ? 'rgba(0,0,0,0.04)' : 'transparent', color: !query.status ? 'var(--ink)' : 'var(--muted)', fontWeight: !query.status ? '600' : '400', border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}
                  onClick={() => { setStatusFilter(undefined); setIsStatusMenuOpen(false); }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                  onMouseOut={(e) => e.currentTarget.style.background = !query.status ? 'rgba(0,0,0,0.04)' : 'transparent'}
                >
                  All Statuses
                </button>
                {leadStatuses.map(status => (
                  <button 
                    key={status}
                    type="button"
                    style={{ textAlign: 'left', padding: '8px 12px', fontSize: '13px', borderRadius: '8px', background: query.status === status ? 'rgba(0,0,0,0.04)' : 'transparent', color: query.status === status ? 'var(--ink)' : 'var(--muted)', fontWeight: query.status === status ? '600' : '400', border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}
                    onClick={() => { setStatusFilter(status); setIsStatusMenuOpen(false); }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                    onMouseOut={(e) => e.currentTarget.style.background = query.status === status ? 'rgba(0,0,0,0.04)' : 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`status-dot status-${status.toLowerCase()}`} />
                      {status}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

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
      
      {toastMessage ? (
        <div className="toast" style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'var(--ink)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          zIndex: 100,
          animation: 'modalIn 200ms ease-out'
        }}>
          {toastMessage}
        </div>
      ) : null}
    </main>
  );
}
