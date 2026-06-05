import { Schema, model, Types } from "mongoose";

export const activityTypes = ["created", "updated", "status_changed", "deleted"] as const;
export type ActivityType = (typeof activityTypes)[number];

export type ActivityDocument = {
  lead: Types.ObjectId;
  type: ActivityType;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

const activitySchema = new Schema<ActivityDocument>(
  {
    lead: { type: Schema.Types.ObjectId, ref: "Lead", required: true, index: true },
    type: { type: String, enum: activityTypes, required: true, index: true },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    metadata: { type: Schema.Types.Mixed }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

activitySchema.index({ lead: 1, createdAt: -1 });

activitySchema.set("toJSON", {
  virtuals: true,
  transform(_doc, ret) {
    const output = ret as Record<string, unknown>;
    output.id = String(output._id);
    delete output._id;
    delete output.__v;
  }
});

activitySchema.set("toObject", {
  virtuals: true,
  transform(_doc, ret) {
    const output = ret as Record<string, unknown>;
    output.id = String(output._id);
    delete output._id;
    delete output.__v;
  }
});

export const ActivityModel = model<ActivityDocument>("Activity", activitySchema);
