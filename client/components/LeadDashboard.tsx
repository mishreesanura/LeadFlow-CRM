"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BriefcaseBusiness,
  Columns3,
  ListFilter,
  Moon,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  ChevronLeft,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CommandPalette, type Command } from "@/components/CommandPalette";
import { LeadDetailDrawer } from "@/components/LeadDetailDrawer";
import { LeadForm } from "@/components/LeadForm";
import { LeadImportModal } from "@/components/LeadImportModal";
import { LeadTable } from "@/components/LeadTable";
import { PipelineBoard } from "@/components/PipelineBoard";
import { StatsPanel } from "@/components/StatsPanel";
import { createLead, deleteLead, getLeads, getLeadStats, updateLead } from "@/lib/api";
import { useDebouncedValue } from "@/lib/hooks";
import type { Lead, LeadInput, LeadQuery, LeadStatus } from "@/types/lead";
import { leadStatuses } from "@/types/lead";

type ViewMode = "table" | "pipeline";
type UndoAction = {
  message: string;
  run: () => Promise<void>;
};

const initialQuery: LeadQuery = {
  page: 1,
  limit: 25,
  sortBy: "createdAt",
  sortOrder: "desc"
};

function getPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: Array<number | "ellipsis-start" | "ellipsis-end"> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) items.push("ellipsis-start");
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < totalPages - 1) items.push("ellipsis-end");
  items.push(totalPages);

  return items;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function leadToInput(lead: Lead): LeadInput {
  return {
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    status: lead.status,
    notes: lead.notes,
    source: lead.source ?? "",
    priority: lead.priority,
    estimatedValue: lead.estimatedValue,
    lastContactedAt: lead.lastContactedAt
  };
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
}

export function LeadDashboard() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState<LeadQuery>(initialQuery);
  const [searchInput, setSearchInput] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("pipeline");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isThemeResolved, setIsThemeResolved] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const isDarkMode = theme === "dark";

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const showDummyToast = (action: string) => {
    showToast(`Dummy feature: ${action}`);
  };

  const closeTransientMenus = useCallback(() => {
    setIsNotificationMenuOpen(false);
    setIsProfileMenuOpen(false);
    setIsStatusMenuOpen(false);
  }, []);

  const clearUndo = useCallback(() => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setUndoAction(null);
  }, []);

  const showUndo = useCallback((action: UndoAction) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoAction(action);
    undoTimerRef.current = setTimeout(() => {
      setUndoAction(null);
      undoTimerRef.current = null;
    }, 9000);
  }, []);

  const executeUndo = useCallback(async () => {
    if (!undoAction) return;
    const action = undoAction;
    clearUndo();
    await action.run();
  }, [clearUndo, undoAction]);

  useEffect(() => {
    const currentTheme = document.documentElement.dataset.theme;
    if (currentTheme === "dark" || currentTheme === "light") {
      setTheme(currentTheme);
      setIsThemeResolved(true);
      return;
    }

    const storedTheme = window.localStorage.getItem("leadflow-theme");
    if (storedTheme === "dark" || storedTheme === "light") {
      setTheme(storedTheme);
      setIsThemeResolved(true);
      return;
    }

    setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setIsThemeResolved(true);
  }, []);

  useEffect(() => {
    if (!isThemeResolved) return;
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("leadflow-theme", theme);
  }, [isThemeResolved, theme]);

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
        return;
      }

      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === "z" && undoAction && !isTypingTarget(event.target)) {
        event.preventDefault();
        void executeUndo();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [executeUndo, undoAction]);

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

  const bulkStatusMutation = useMutation({
    mutationFn: ({ targetLeads, status }: { targetLeads: Lead[]; status: LeadStatus }) => {
      return Promise.all(
        targetLeads.map((lead) => updateLead({ id: lead.id, payload: { status } }))
      );
    },
    onSuccess: async (updatedLeads, variables) => {
      setSelectedLead((current) => {
        if (!current) return current;
        return updatedLeads.find((lead) => lead.id === current.id) ?? current;
      });
      showUndo({
        message: `${updatedLeads.length} leads moved to ${variables.status}.`,
        run: async () => {
          await Promise.all(
            variables.targetLeads.map((lead) => updateLead({ id: lead.id, payload: { status: lead.status } }))
          );
          await invalidateLeadData();
          showToast("Bulk move undone.");
        }
      });
      await invalidateLeadData();
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (targetLeads: Lead[]) => {
      return Promise.all(targetLeads.map((lead) => deleteLead(lead.id)));
    },
    onSuccess: async (_deleted, targetLeads) => {
      setSelectedLead((current) => {
        if (!current) return current;
        return targetLeads.some((lead) => lead.id === current.id) ? null : current;
      });
      setIsFormOpen(false);
      setEditingLead(null);
      showUndo({
        message: `${targetLeads.length} leads deleted.`,
        run: async () => {
          await Promise.all(targetLeads.map((lead) => createLead(leadToInput(lead))));
          await invalidateLeadData();
          showToast("Deleted leads restored.");
        }
      });
      await invalidateLeadData();
    }
  });

  const leads = leadsQuery.data?.data ?? [];
  const meta = leadsQuery.data?.meta;

  const derivedNotifications = useMemo(() => {
    if (!leads.length) return [];
    
    const now = new Date().getTime();
    
    const newLeads = [...leads]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(lead => ({
        id: `new-${lead.id}`,
        title: 'New Lead Added',
        message: `${lead.name} from ${lead.company} was added to the CRM.`,
        time: new Date(lead.createdAt).getTime(),
        unread: !readNotificationIds.includes(`new-${lead.id}`) && (now - new Date(lead.createdAt).getTime() < 24 * 60 * 60 * 1000)
      }));

    const statusUpdates = [...leads]
      .filter(lead => lead.status !== 'New')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
      .map(lead => ({
        id: `status-${lead.id}`,
        title: `Lead ${lead.status}`,
        message: `${lead.name}'s status was updated to ${lead.status}.`,
        time: new Date(lead.updatedAt).getTime(),
        unread: !readNotificationIds.includes(`status-${lead.id}`) && (now - new Date(lead.updatedAt).getTime() < 12 * 60 * 60 * 1000)
      }));

    const getRelativeTime = (time: number) => {
      const diffInSeconds = Math.floor((now - time) / 1000);
      if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h ago`;
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    };

    return [...newLeads, ...statusUpdates]
      .sort((a, b) => b.time - a.time)
      .slice(0, 5)
      .map(n => ({
        ...n,
        timeStr: getRelativeTime(n.time)
      }));
  }, [leads, readNotificationIds]);

  const unreadCount = derivedNotifications.filter(n => n.unread).length;

  const markAllAsRead = () => {
    setReadNotificationIds(prev => {
      const newIds = derivedNotifications.map(n => n.id).filter(id => !prev.includes(id));
      return [...prev, ...newIds];
    });
  };

  const openCreate = () => {
    closeTransientMenus();
    setSelectedLead(null);
    setEditingLead(null);
    setIsImportOpen(false);
    setIsFormOpen(true);
  };

  const openEdit = (lead: Lead) => {
    closeTransientMenus();
    setSelectedLead(null);
    setEditingLead(lead);
    setIsImportOpen(false);
    setIsFormOpen(true);
  };

  const openImport = () => {
    closeTransientMenus();
    setSelectedLead(null);
    setEditingLead(null);
    setIsFormOpen(false);
    setIsImportOpen(true);
  };

  const openLeadDetails = (lead: Lead) => {
    closeTransientMenus();
    setIsFormOpen(false);
    setEditingLead(null);
    setSelectedLead(lead);
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
    if (confirmed) {
      deleteMutation.mutate(lead.id, {
        onSuccess: () => {
          showUndo({
            message: `${lead.name} deleted.`,
            run: async () => {
              await createLead(leadToInput(lead));
              await invalidateLeadData();
              showToast("Lead restored.");
            }
          });
        }
      });
    }
    return confirmed;
  };

  const handleStatusChange = (lead: Lead, status: LeadStatus) => {
    if (lead.status === status) return;
    updateMutation.mutate(
      { id: lead.id, payload: { status } },
      {
        onSuccess: () => {
          showUndo({
            message: `${lead.name} moved to ${status}.`,
            run: async () => {
              await updateLead({ id: lead.id, payload: { status: lead.status } });
              await invalidateLeadData();
              showToast("Move undone.");
            }
          });
        }
      }
    );
  };

  const handleBulkStatusChange = (targetLeads: Lead[], status: LeadStatus) => {
    const movableLeads = targetLeads.filter((lead) => lead.status !== status);
    if (!movableLeads.length) return;
    bulkStatusMutation.mutate({ targetLeads: movableLeads, status });
  };

  const handleBulkDeleteLeads = (targetLeads: Lead[]) => {
    const confirmed = window.confirm(`Delete ${targetLeads.length} selected leads? This cannot be undone.`);
    if (confirmed) bulkDeleteMutation.mutate(targetLeads);
    return confirmed;
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

  const setRowsPerPage = (limit: number) => {
    setQuery((current) => ({
      ...current,
      page: 1,
      limit
    }));
  };

  const goToPage = (page: number) => {
    setQuery((current) => ({
      ...current,
      page
    }));
  };

  const paginationItems = meta ? getPaginationItems(meta.page, meta.totalPages) : [];

  const commands = useMemo<Command[]>(() => {
    const leadCommands = leads.slice(0, 6).map((lead) => ({
      id: `lead-${lead.id}`,
      label: `Open ${lead.name}`,
      section: lead.company,
      action: () => openLeadDetails(lead)
    }));

    return [
      { id: "create", label: "Create lead", section: "Lead", action: openCreate },
      { id: "pipeline", label: "Pipeline view", section: "View", action: () => setViewMode("pipeline") },
      { id: "table", label: "Table view", section: "View", action: () => setViewMode("table") },
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
      <section className="workspace">
        <header className="topbar">
          <div className="brand-mark" aria-label="LeadFlow">
            <svg className="brand-logo" viewBox="0 0 44 44" role="img" aria-label="LeadFlow logo">
              <path d="M10 29.5C17 18 25.5 34 34 12" />
              <circle cx="10" cy="29.5" r="4.5" />
              <circle cx="22" cy="23" r="4.5" />
              <circle cx="34" cy="12" r="4.5" />
            </svg>
            <span className="brand-name">LeadFlow</span>
          </div>

          <div className="topbar-actions">
            <button
              className="icon-button theme-toggle"
              type="button"
              onClick={() => {
                setIsNotificationMenuOpen(false);
                setIsProfileMenuOpen(false);
                setIsStatusMenuOpen(false);
                setTheme((current) => (current === "dark" ? "light" : "dark"));
              }}
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div style={{ position: 'relative' }}>
              <button 
                className="icon-button" 
                type="button" 
                aria-label="Open notifications"
                title="Notifications"
                style={{ border: '1px solid var(--border)', background: 'var(--surface)', position: 'relative' }} 
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  setIsStatusMenuOpen(false);
                  setIsNotificationMenuOpen((current) => !current);
                }}
                onBlur={(e) => {
                  if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) {
                    setIsNotificationMenuOpen(false);
                  }
                }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: 'var(--primary)',
                    color: 'var(--primary-contrast)',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid var(--background)'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotificationMenuOpen && (
                <div 
                  tabIndex={-1}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: '0',
                    marginTop: '8px',
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    boxShadow: 'var(--popover-shadow)',
                    width: '320px',
                    zIndex: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    animation: 'modalIn 150ms ease-out'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: 'var(--ink)' }}>Notifications</h3>
                    {unreadCount > 0 && (
                      <button 
                        type="button" 
                        onClick={markAllAsRead}
                        onMouseDown={(e) => e.preventDefault()}
                        style={{ fontSize: '12px', color: 'var(--primary)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {derivedNotifications.length > 0 ? derivedNotifications.map(notif => (
                      <div 
                        key={notif.id} 
                        style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '12px', background: notif.unread ? 'var(--menu-selected)' : 'transparent', cursor: 'pointer', transition: 'background 0.2s' }} 
                        onMouseOver={(e) => { e.currentTarget.style.background = 'var(--menu-hover)' }} 
                        onMouseOut={(e) => { e.currentTarget.style.background = notif.unread ? 'var(--menu-selected)' : 'transparent' }}
                      >
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: notif.unread ? 'var(--primary)' : 'transparent', marginTop: '6px', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: notif.unread ? '600' : '500', color: 'var(--ink)' }}>{notif.title}</span>
                            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{notif.timeStr}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', lineHeight: '1.4' }}>{notif.message}</p>
                        </div>
                      </div>
                    )) : (
                      <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                        No new notifications
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div
              className="profile-menu-wrap"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  setIsProfileMenuOpen(false);
                }
              }}
            >
              <button
                className="profile-trigger"
                type="button"
                aria-haspopup="menu"
                aria-expanded={isProfileMenuOpen}
                onClick={() => {
                  setIsNotificationMenuOpen(false);
                  setIsStatusMenuOpen(false);
                  setIsProfileMenuOpen((current) => !current);
                }}
              >
                <span className="profile-avatar" aria-hidden="true">JD</span>
                <span className="profile-trigger-copy">
                  <strong>Jane Doe</strong>
                  <small>jane@leadflow.com</small>
                </span>
                <ChevronDown size={14} aria-hidden="true" />
              </button>

              {isProfileMenuOpen ? (
                <aside className="profile-card" role="menu" aria-label="Profile menu">
                  <div className="profile-card-header">
                    <span className="profile-avatar large" aria-hidden="true">JD</span>
                    <div>
                      <strong>Jane Doe</strong>
                      <small>Workspace Owner</small>
                    </div>
                  </div>

                  <div className="profile-card-body">
                    <div>
                      <BriefcaseBusiness size={15} />
                      <span>LeadFlow CRM</span>
                    </div>
                    <div>
                      <ShieldCheck size={15} />
                      <span>Admin access</span>
                    </div>
                  </div>

                  <button type="button" role="menuitem" onClick={() => showDummyToast("Profile settings")}>
                    <Settings size={15} />
                    Profile settings
                  </button>
                </aside>
              ) : null}
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
            <button className="button secondary" type="button" onClick={openImport}>
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
              onClick={() => {
                setIsNotificationMenuOpen(false);
                setIsProfileMenuOpen(false);
                setIsStatusMenuOpen((current) => !current);
              }}
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
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                boxShadow: 'var(--popover-shadow)',
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
                  style={{ textAlign: 'left', padding: '8px 12px', fontSize: '13px', borderRadius: '8px', background: !query.status ? 'var(--menu-selected)' : 'transparent', color: !query.status ? 'var(--ink)' : 'var(--muted)', fontWeight: !query.status ? '600' : '400', border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}
                  onClick={() => { setStatusFilter(undefined); setIsStatusMenuOpen(false); }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'var(--menu-hover)'}
                  onMouseOut={(e) => e.currentTarget.style.background = !query.status ? 'var(--menu-selected)' : 'transparent'}
                >
                  All Statuses
                </button>
                {leadStatuses.map(status => (
                  <button 
                    key={status}
                    type="button"
                    style={{ textAlign: 'left', padding: '8px 12px', fontSize: '13px', borderRadius: '8px', background: query.status === status ? 'var(--menu-selected)' : 'transparent', color: query.status === status ? 'var(--ink)' : 'var(--muted)', fontWeight: query.status === status ? '600' : '400', border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}
                    onClick={() => { setStatusFilter(status); setIsStatusMenuOpen(false); }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'var(--menu-hover)'}
                    onMouseOut={(e) => e.currentTarget.style.background = query.status === status ? 'var(--menu-selected)' : 'transparent'}
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
            <button
              className={viewMode === "pipeline" ? "active" : ""}
              type="button"
              onClick={() => setViewMode("pipeline")}
            >
              <Columns3 size={16} /> Pipeline
            </button>
            <button className={viewMode === "table" ? "active" : ""} type="button" onClick={() => setViewMode("table")}>
              <ListFilter size={16} /> Table
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
            onSelect={openLeadDetails}
          />
        ) : (
          <PipelineBoard
            leads={leads}
            onEdit={openEdit}
            onDelete={handleDeleteLead}
            onSelect={openLeadDetails}
            onStatusChange={handleStatusChange}
            onBulkStatusChange={handleBulkStatusChange}
            onBulkDelete={handleBulkDeleteLeads}
            isBulkActionPending={updateMutation.isPending || deleteMutation.isPending || bulkStatusMutation.isPending || bulkDeleteMutation.isPending}
          />
        )}

        <footer className="pagination-bar">
          <div className="pagination-info">
            <span>{meta ? `${meta.total} leads` : "Loading leads"}</span>
            <label className="rows-per-page">
              <span>Rows per page</span>
              <select
                value={query.limit}
                onChange={(event) => setRowsPerPage(Number(event.target.value))}
                aria-label="Rows per page"
              >
                {[10, 25, 50].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <nav className="pagination-pages" aria-label="Lead pagination">
            <button
              className="pagination-nav"
              type="button"
              disabled={!meta || meta.page <= 1}
              onClick={() => meta && goToPage(Math.max(1, meta.page - 1))}
            >
              <ChevronLeft size={18} />
              Previous
            </button>

            {paginationItems.map((item) =>
              typeof item === "number" ? (
                <button
                  className={`page-number ${meta?.page === item ? "active" : ""}`}
                  type="button"
                  key={item}
                  aria-current={meta?.page === item ? "page" : undefined}
                  onClick={() => goToPage(item)}
                >
                  {item}
                </button>
              ) : (
                <span className="page-ellipsis" key={item} aria-hidden="true">
                  ...
                </span>
              )
            )}

            <button
              className="pagination-nav"
              type="button"
              disabled={!meta || meta.page >= meta.totalPages}
              onClick={() => meta && goToPage(Math.min(meta.totalPages, meta.page + 1))}
            >
              Next
              <ChevronRight size={18} />
            </button>
          </nav>
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

      {isImportOpen ? (
        <LeadImportModal
          onClose={() => setIsImportOpen(false)}
          onImported={invalidateLeadData}
        />
      ) : null}

      <CommandPalette isOpen={isCommandOpen} commands={commands} onClose={() => setIsCommandOpen(false)} />

      {deleteMutation.isPending || updateMutation.isPending || bulkStatusMutation.isPending || bulkDeleteMutation.isPending ? <div className="toast">Updating lead...</div> : null}

      {undoAction ? (
        <div className="toast undo-toast">
          <span>{undoAction.message}</span>
          <button type="button" onClick={() => void executeUndo()}>
            Undo
          </button>
          <small>Ctrl/Cmd+Z</small>
        </div>
      ) : null}
      
      {toastMessage ? (
        <div className="toast">
          {toastMessage}
        </div>
      ) : null}
    </main>
  );
}
