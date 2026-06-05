export const leadStatuses = ["New", "Contacted", "Qualified", "Converted", "Lost"] as const;
export type LeadStatus = (typeof leadStatuses)[number];

const statusWeights: Record<LeadStatus, number> = {
  New: 35,
  Contacted: 55,
  Qualified: 76,
  Converted: 100,
  Lost: 12
};

export type LeadHealthInput = {
  status: LeadStatus;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  estimatedValue?: number;
  lastContactedAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

export function calculateLeadHealthScore(lead: LeadHealthInput) {
  let score = statusWeights[lead.status];

  if (lead.email) score += 4;
  if (lead.phone) score += 4;
  if (lead.company) score += 4;
  if (lead.notes && lead.notes.trim().length >= 20) score += 6;
  if (typeof lead.estimatedValue === "number" && lead.estimatedValue > 0) score += 6;

  const reference = lead.lastContactedAt ?? lead.updatedAt;
  if (reference) {
    const lastTouch = new Date(reference).getTime();
    const ageInDays = (Date.now() - lastTouch) / (1000 * 60 * 60 * 24);
    if (ageInDays > 21 && !["Converted", "Lost"].includes(lead.status)) score -= 18;
    if (ageInDays > 7 && ["Contacted", "Qualified"].includes(lead.status)) score -= 8;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}
