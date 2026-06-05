import { leadRepository } from "../repositories/lead.repository.js";
import { activityRepository } from "../repositories/activity.repository.js";
import { conflict, notFound } from "../utils/errors.js";
import { createLeadSchema, leadIdSchema, leadQuerySchema, updateLeadSchema } from "./lead.schemas.js";

export const leadService = {
  async createLead(payload: unknown) {
    const data = createLeadSchema.parse(payload);
    const lead = await leadRepository.create({
      ...data,
      statusHistory: [
        {
          status: data.status,
          changedAt: new Date(),
          note: "Lead created"
        }
      ]
    });

    await activityRepository.create({
      lead: lead.id,
      type: "created",
      message: `Lead created in ${data.status} stage.`,
      metadata: { status: data.status }
    });

    return lead;
  },

  async listLeads(query: unknown) {
    const options = leadQuerySchema.parse(query);
    const { data, total } = await leadRepository.findAll(options);
    const totalPages = Math.max(1, Math.ceil(total / options.limit));

    return {
      data,
      meta: {
        page: options.page,
        limit: options.limit,
        total,
        totalPages,
        sortBy: options.sortBy,
        sortOrder: options.sortOrder
      }
    };
  },

  async searchLeads(query: unknown) {
    return this.listLeads(query);
  },

  async getLead(params: unknown) {
    const { id } = leadIdSchema.parse(params);
    const lead = await leadRepository.findById(id);
    if (!lead) throw notFound("Lead");
    return lead;
  },

  async updateLead(params: unknown, payload: unknown) {
    const { id } = leadIdSchema.parse(params);
    const data = updateLeadSchema.parse(payload);
    const lead = await leadRepository.findDocumentById(id);
    if (!lead) throw notFound("Lead");

    const previousStatus = lead.status;
    const changedFields = Object.keys(data);

    if (data.status && data.status !== previousStatus) {
      lead.statusHistory.push({
        fromStatus: previousStatus,
        status: data.status,
        changedAt: new Date(),
        note: `Status changed from ${previousStatus} to ${data.status}`
      });
    }

    Object.assign(lead, data);

    if (data.status && ["Contacted", "Qualified", "Converted"].includes(data.status) && !data.lastContactedAt) {
      lead.lastContactedAt = new Date();
    }

    try {
      const saved = await lead.save();

      await activityRepository.create({
        lead: saved.id,
        type: data.status && data.status !== previousStatus ? "status_changed" : "updated",
        message:
          data.status && data.status !== previousStatus
            ? `Status changed from ${previousStatus} to ${data.status}.`
            : `Lead updated: ${changedFields.join(", ")}.`,
        metadata: { changedFields, previousStatus, nextStatus: data.status }
      });

      return saved.toObject();
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === 11000) {
        throw conflict("A lead with this email already exists.");
      }
      throw error;
    }
  },

  async deleteLead(params: unknown) {
    const { id } = leadIdSchema.parse(params);
    const lead = await leadRepository.deleteById(id);
    if (!lead) throw notFound("Lead");

    await activityRepository.deleteByLead(id);

    return {
      id,
      deleted: true
    };
  },

  async getLeadActivity(params: unknown) {
    const { id } = leadIdSchema.parse(params);
    const lead = await leadRepository.findById(id);
    if (!lead) throw notFound("Lead");
    return activityRepository.findByLead(id);
  },

  getStats() {
    return leadRepository.getStats();
  }
};
