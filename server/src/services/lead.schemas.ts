import { z } from "zod";
import { leadPriorities } from "../models/lead.model.js";
import { leadStatuses } from "../utils/leadHealth.js";

const trimmedString = (label: string, max = 160) =>
  z.string({ required_error: `${label} is required.` }).trim().min(1, `${label} is required.`).max(max);

function parseDateInput(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== "string") return null;

  const input = value.trim();
  if (!input) return undefined;

  const isoDate = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) {
    const [, year, month, day] = isoDate;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return date.getUTCFullYear() === Number(year) && date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day)
      ? date
      : null;
  }

  const spreadsheetDate = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (spreadsheetDate) {
    const [, day, month, rawYear] = spreadsheetDate;
    const year = rawYear.length === 2 ? 2000 + Number(rawYear) : Number(rawYear);
    const date = new Date(Date.UTC(year, Number(month) - 1, Number(day)));
    return date.getUTCFullYear() === year && date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day)
      ? date
      : null;
  }

  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

const dateInput = z
  .preprocess(parseDateInput, z.date({ invalid_type_error: "Enter a valid date." }).optional());

export const createLeadSchema = z.object({
  name: trimmedString("Name", 120),
  email: trimmedString("Email", 160).email("Enter a valid email address.").toLowerCase(),
  phone: trimmedString("Phone number", 40).min(7, "Phone number must be at least 7 characters."),
  company: trimmedString("Company name", 140),
  status: z.enum(leadStatuses).default("New"),
  notes: trimmedString("Notes", 2500),
  source: z.string().trim().max(80).optional().or(z.literal("")),
  priority: z.enum(leadPriorities).default("Medium"),
  estimatedValue: z.coerce.number().min(0).default(0),
  lastContactedAt: dateInput
});

export const updateLeadSchema = createLeadSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided."
  });

export const leadQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().optional(),
  status: z.enum(leadStatuses).optional(),
  company: z.string().trim().optional(),
  priority: z.enum(leadPriorities).optional(),
  sortBy: z
    .enum(["name", "email", "company", "status", "createdAt", "updatedAt", "lastContactedAt", "estimatedValue"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});

export const leadIdSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, "Lead id must be a valid MongoDB ObjectId.")
});
