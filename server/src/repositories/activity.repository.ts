import { ActivityModel, type ActivityType } from "../models/activity.model.js";

export const activityRepository = {
  async create(payload: {
    lead: string;
    type: ActivityType;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    const activity = await ActivityModel.create(payload);
    return activity.toObject();
  },

  async findByLead(leadId: string) {
    const activities = await ActivityModel.find({ lead: leadId }).sort({ createdAt: -1 }).limit(100);
    return activities.map((activity) => activity.toObject());
  },

  async deleteByLead(leadId: string) {
    await ActivityModel.deleteMany({ lead: leadId });
  }
};
