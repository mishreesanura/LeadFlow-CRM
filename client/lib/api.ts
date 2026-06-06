import type {
  Activity,
  Lead,
  LeadImportCommitResult,
  LeadImportPreview,
  LeadInput,
  LeadListResponse,
  LeadQuery,
  LeadStats
} from "@/types/lead";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api";

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export class ApiError extends Error {
  code?: string;
  details?: unknown;

  constructor(message: string, code?: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers
    }
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    throw new ApiError(
      payload.error?.message ?? "The request failed.",
      payload.error?.code,
      payload.error?.details
    );
  }

  return response.json() as Promise<T>;
}

function toQueryString(query: Partial<LeadQuery>) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });
  return params.toString();
}

export function getLeads(query: LeadQuery) {
  return request<LeadListResponse>(`/leads?${toQueryString(query)}`);
}

export function getLeadStats() {
  return request<{ data: LeadStats }>("/leads/stats").then((response) => response.data);
}

export function getLeadActivity(leadId: string) {
  return request<{ data: Activity[] }>(`/leads/${leadId}/activity`).then((response) => response.data);
}

export function createLead(payload: LeadInput) {
  return request<{ data: Lead }>("/leads", {
    method: "POST",
    body: JSON.stringify(payload)
  }).then((response) => response.data);
}

export function updateLead({ id, payload }: { id: string; payload: Partial<LeadInput> }) {
  return request<{ data: Lead }>(`/leads/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  }).then((response) => response.data);
}

export function deleteLead(id: string) {
  return request<{ id: string; deleted: boolean }>(`/leads/${id}`, {
    method: "DELETE"
  });
}

export function previewLeadImport(csv: string) {
  return request<{ data: LeadImportPreview }>("/leads/import/preview", {
    method: "POST",
    body: JSON.stringify({ csv })
  }).then((response) => response.data);
}

export function commitLeadImport(csv: string) {
  return request<{ data: LeadImportCommitResult }>("/leads/import/commit", {
    method: "POST",
    body: JSON.stringify({ csv })
  }).then((response) => response.data);
}
