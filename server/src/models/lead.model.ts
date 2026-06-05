import { Schema, model, type HydratedDocument } from "mongoose";
import { calculateLeadHealthScore, leadStatuses, type LeadStatus } from "../utils/leadHealth.js";

export const leadPriorities = ["Low", "Medium", "High"] as const;
export type LeadPriority = (typeof leadPriorities)[number];

type StatusHistoryEntry = {
  fromStatus?: LeadStatus;
  status: LeadStatus;
  changedAt: Date;
  note?: string;
};

export type LeadDocument = {
  name: string;
  email: string;
  phone: string;
  company: string;
  status: LeadStatus;
  notes: string;
  source?: string;
  priority: LeadPriority;
  estimatedValue: number;
  lastContactedAt?: Date;
  statusHistory: StatusHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
};

const statusHistorySchema = new Schema<StatusHistoryEntry>(
  {
    fromStatus: { type: String, enum: leadStatuses },
    status: { type: String, enum: leadStatuses, required: true },
    changedAt: { type: Date, required: true, default: Date.now },
    note: { type: String, trim: true, maxlength: 500 }
  },
  { _id: false }
);

const leadSchema = new Schema<LeadDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    phone: { type: String, required: true, trim: true, maxlength: 40 },
    company: { type: String, required: true, trim: true, maxlength: 140 },
    status: { type: String, enum: leadStatuses, required: true, default: "New", index: true },
    notes: { type: String, required: true, trim: true, maxlength: 2500 },
    source: { type: String, trim: true, maxlength: 80 },
    priority: { type: String, enum: leadPriorities, default: "Medium", index: true },
    estimatedValue: { type: Number, min: 0, default: 0 },
    lastContactedAt: { type: Date },
    statusHistory: { type: [statusHistorySchema], default: [] }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

leadSchema.index({ email: 1 }, { unique: true });
leadSchema.index({ name: "text", email: "text", company: "text", notes: "text" });
leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ company: 1 });
leadSchema.index({ createdAt: -1 });

leadSchema.virtual("healthScore").get(function (this: HydratedDocument<LeadDocument>) {
  return calculateLeadHealthScore({
    status: this.status,
    email: this.email,
    phone: this.phone,
    company: this.company,
    notes: this.notes,
    estimatedValue: this.estimatedValue,
    lastContactedAt: this.lastContactedAt,
    updatedAt: this.updatedAt
  });
});

function transformDocument(_doc: unknown, ret: Record<string, unknown>) {
  ret.id = String(ret._id);
  delete ret._id;
  delete ret.__v;
}

leadSchema.set("toJSON", { virtuals: true, transform: transformDocument });
leadSchema.set("toObject", { virtuals: true, transform: transformDocument });

export const LeadModel = model<LeadDocument>("Lead", leadSchema);
