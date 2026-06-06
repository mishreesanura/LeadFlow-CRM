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

function roundPercent(part: number, total: number) {
  return total ? Math.round((part / total) * 1000) / 10 : 0;
}

function getStatsTrendMonths() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    return {
      date,
      month,
      label: date.toLocaleString("en-US", { month: "short" })
    };
  });
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

  async findExistingEmails(emails: string[]) {
    if (!emails.length) return new Set<string>();
    const documents = await LeadModel.find({ email: { $in: emails } }).select("email");
    return new Set(documents.map((document) => document.email.toLowerCase()));
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
    const trendMonths = getStatsTrendMonths();
    const trendStart = trendMonths[0].date;

    const [total, statusCounts, newThisMonth, pipelineValueAgg, recentDocuments, trendBaseAgg, trendAgg] = await Promise.all([
      LeadModel.countDocuments(),
      LeadModel.aggregate<{ _id: LeadStatus; count: number }>([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      LeadModel.countDocuments({ createdAt: { $gte: startOfMonth } }),
      LeadModel.aggregate<{ _id: null; value: number }>([
        { $match: { status: { $nin: ["Lost"] } } },
        { $group: { _id: null, value: { $sum: "$estimatedValue" } } }
      ]),
      LeadModel.find().sort({ createdAt: -1 }).limit(5),
      LeadModel.aggregate<{ _id: null; total: number; converted: number; qualified: number }>([
        { $match: { createdAt: { $lt: trendStart } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            converted: { $sum: { $cond: [{ $eq: ["$status", "Converted"] }, 1, 0] } },
            qualified: { $sum: { $cond: [{ $in: ["$status", ["Qualified", "Converted"]] }, 1, 0] } }
          }
        }
      ]),
      LeadModel.aggregate<{
        _id: string;
        newLeads: number;
        converted: number;
        qualified: number;
        pipelineValue: number;
      }>([
        { $match: { createdAt: { $gte: trendStart } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            newLeads: { $sum: 1 },
            converted: { $sum: { $cond: [{ $eq: ["$status", "Converted"] }, 1, 0] } },
            qualified: { $sum: { $cond: [{ $in: ["$status", ["Qualified", "Converted"]] }, 1, 0] } },
            pipelineValue: { $sum: { $cond: [{ $ne: ["$status", "Lost"] }, "$estimatedValue", 0] } }
          }
        },
        { $sort: { _id: 1 } }
      ])
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
    const trendByMonth = new Map(trendAgg.map((item) => [item._id, item]));
    const baseTrend = trendBaseAgg[0] ?? { total: 0, converted: 0, qualified: 0 };
    let runningTotal = baseTrend.total;
    let runningConverted = baseTrend.converted;
    let runningQualified = baseTrend.qualified;
    const trend = trendMonths.map(({ month, label }) => {
      const item = trendByMonth.get(month);
      const newLeads = item?.newLeads ?? 0;
      runningTotal += newLeads;
      runningConverted += item?.converted ?? 0;
      runningQualified += item?.qualified ?? 0;

      return {
        month,
        label,
        total: runningTotal,
        newLeads,
        conversionRate: roundPercent(runningConverted, runningTotal),
        qualificationRate: roundPercent(runningQualified, runningTotal),
        pipelineValue: item?.pipelineValue ?? 0
      };
    });

    return {
      total,
      newThisMonth,
      statusCounts: counts,
      conversionRate: roundPercent(converted, total),
      qualificationRate: roundPercent(qualified, total),
      pipelineValue: pipelineValueAgg[0]?.value ?? 0,
      trend,
      recentLeads: recentDocuments.map(serializeLead)
    };
  }
};
