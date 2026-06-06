import { describe, expect, it } from "vitest";
import { createLeadSchema } from "../src/services/lead.schemas.js";

const baseLead = {
  name: "Maya Shah",
  email: "maya@example.com",
  phone: "+1 415 555 0199",
  company: "Acme Co",
  status: "New",
  priority: "High",
  estimatedValue: "42000",
  source: "Website",
  notes: "Interested in replacing their current CRM."
};

describe("createLeadSchema date parsing", () => {
  it("accepts ISO and spreadsheet-style CSV dates", () => {
    const values = [
      ["2026-06-01", "2026-06-01"],
      ["01/06/26", "2026-06-01"],
      ["02/06/26", "2026-06-02"]
    ];

    values.forEach(([input, expected]) => {
      const result = createLeadSchema.parse({
        ...baseLead,
        email: `${input.replace(/\D/g, "")}@example.com`,
        lastContactedAt: input
      });

      expect(result.lastContactedAt?.toISOString().slice(0, 10)).toBe(expected);
    });
  });
});
