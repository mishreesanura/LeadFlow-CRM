export const leadStatuses = ["New", "Contacted", "Qualified", "Converted", "Lost"] as const;
export type LeadStatus = (typeof leadStatuses)[number];

export const leadPriorities = ["Low", "Medium", "High"] as const;
export type LeadPriority = (typeof leadPriorities)[number];

export type StatusHistoryEntry = {
  fromStatus?: LeadStatus;
  status: LeadStatus;
  changedAt: string;
  note?: string;
};

export type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: LeadStatus;
  notes: string;
  source?: string;
  priority: LeadPriority;
  estimatedValue: number;
  lastContactedAt?: string;
  statusHistory: StatusHistoryEntry[];
  healthScore: number;
  createdAt: string;
  updatedAt: string;
};

export type LeadInput = {
  name: string;
  email: string;
  phone: string;
  company: string;
  status: LeadStatus;
  notes: string;
  source?: string;
  priority: LeadPriority;
  estimatedValue: number;
  lastContactedAt?: string;
};

export type LeadListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
};

export type LeadListResponse = {
  data: Lead[];
  meta: LeadListMeta;
};

export type LeadStats = {
  total: number;
  newThisMonth: number;
  statusCounts: Record<LeadStatus, number>;
  conversionRate: number;
  qualificationRate: number;
  pipelineValue: number;
  trend: LeadStatsTrendPoint[];
  recentLeads: Lead[];
};

export type LeadStatsTrendPoint = {
  month: string;
  label: string;
  total: number;
  newLeads: number;
  conversionRate: number;
  qualificationRate: number;
  pipelineValue: number;
};

export type LeadImportIssue = {
  line: number;
  field: string;
  severity: "error" | "warning";
  message: string;
  value?: string;
};

export type LeadImportPreviewRow = {
  line: number;
  name?: string;
  email?: string;
  company?: string;
  status?: string;
  priority?: string;
  estimatedValue?: number;
  issues: LeadImportIssue[];
  data?: Partial<LeadInput>;
};

export type LeadImportPreview = {
  rowsScanned: number;
  rowsLoaded: number;
  rowsWithIssues: number;
  warnings: number;
  errors: number;
  canImport: boolean;
  issues: LeadImportIssue[];
  rows: LeadImportPreviewRow[];
};

export type LeadImportCommitResult = {
  inserted: number;
  rowsLoaded: number;
  rowsWithIssues: number;
  warnings: number;
  errors: number;
};

export type Activity = {
  id: string;
  lead: string;
  type: "created" | "updated" | "status_changed" | "deleted";
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type LeadQuery = {
  page: number;
  limit: number;
  search?: string;
  status?: LeadStatus;
  company?: string;
  priority?: LeadPriority;
  sortBy: "name" | "email" | "company" | "status" | "createdAt" | "updatedAt" | "lastContactedAt" | "estimatedValue";
  sortOrder: "asc" | "desc";
};
