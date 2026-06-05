import type { FilterQuery, SortOrder } from "mongoose";
import { LeadModel, type LeadDocument } from "../models/lead.model.js";
import type { LeadStatus } from "../utils/leadHealth.js";
import { escapeRegExp } from "../utils/query.js";

export type SerializedLead = LeadDocument & {
  id: string;
  healthScore: number;
};

export type LeadListFilters = {
  search?: string;
  status?: LeadStatus;
  company?: string;
  priority?: "Low" | "Medium" | "High";
};

export type LeadListOptions = LeadListFilters & {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
};

function buildLeadFilter(filters: LeadListFilters): FilterQuery<LeadDocument> {
  const filter: FilterQuery<LeadDocument> = {};

  if (filters.status) filter.status = filters.status;
  if (filters.priority) filter.priority = filters.priority;
  if (filters.company) filter.company = new RegExp(escapeRegExp(filters.company), "i");

  if (filters.search) {
    const search = new RegExp(escapeRegExp(filters.search), "i");
    filter.$or = [{ name: search }, { email: search }, { company: search }];
  }

  return filter;
}

function serializeLead(document: { toObject: () => unknown }) {
  return document.toObject() as SerializedLead;
}

export const leadRepository = {
  async create(payload: Partial<LeadDocument>) {
    const lead = await LeadModel.create(payload);
    return serializeLead(lead);
  },

  async findAll(options: LeadListOptions) {
    const filter = buildLeadFilter(options);
    const skip = (options.page - 1) * options.limit;
    const sort: Record<string, SortOrder> = {
      [options.sortBy]: options.sortOrder === "asc" ? 1 : -1
    };

    const [documents, total] = await Promise.all([
      LeadModel.find(filter).sort(sort).skip(skip).limit(options.limit),
      LeadModel.countDocuments(filter)
    ]);

    return {
      data: documents.map(serializeLead),
      total
    };
  },

  async findById(id: string) {
    const lead = await LeadModel.findById(id);
    return lead ? serializeLead(lead) : null;
  },

  findDocumentById(id: string) {
    return LeadModel.findById(id);
  },

  async deleteById(id: string) {
    return LeadModel.findByIdAndDelete(id);
  },

  async getStats() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [total, statusCounts, newThisMonth, pipelineValueAgg, recentDocuments] = await Promise.all([
      LeadModel.countDocuments(),
      LeadModel.aggregate<{ _id: LeadStatus; count: number }>([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      LeadModel.countDocuments({ createdAt: { $gte: startOfMonth } }),
      LeadModel.aggregate<{ _id: null; value: number }>([
        { $match: { status: { $nin: ["Lost"] } } },
        { $group: { _id: null, value: { $sum: "$estimatedValue" } } }
      ]),
      LeadModel.find().sort({ createdAt: -1 }).limit(5)
    ]);

    const counts = {
      New: 0,
      Contacted: 0,
      Qualified: 0,
      Converted: 0,
      Lost: 0
    } satisfies Record<LeadStatus, number>;

    statusCounts.forEach((item) => {
      counts[item._id] = item.count;
    });

    const converted = counts.Converted;
    const qualified = counts.Qualified + counts.Converted;

    return {
      total,
      newThisMonth,
      statusCounts: counts,
      conversionRate: total ? Math.round((converted / total) * 1000) / 10 : 0,
      qualificationRate: total ? Math.round((qualified / total) * 1000) / 10 : 0,
      pipelineValue: pipelineValueAgg[0]?.value ?? 0,
      recentLeads: recentDocuments.map(serializeLead)
    };
  }
};
