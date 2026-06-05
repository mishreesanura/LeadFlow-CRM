import { describe, expect, it, vi } from "vitest";
import { calculateLeadHealthScore } from "../src/utils/leadHealth.js";

describe("calculateLeadHealthScore", () => {
  it("scores converted leads at the top of the range", () => {
    const score = calculateLeadHealthScore({
      status: "Converted",
      email: "maya@example.com",
      phone: "+91 98765 43210",
      company: "Acme",
      notes: "Closed after a successful proof of concept.",
      estimatedValue: 15000,
      updatedAt: new Date()
    });

    expect(score).toBe(100);
  });

  it("penalizes stale active leads", () => {
    vi.setSystemTime(new Date("2026-06-03T00:00:00.000Z"));

    const score = calculateLeadHealthScore({
      status: "Qualified",
      email: "lead@example.com",
      phone: "+1 555 111 2222",
      company: "Northstar",
      notes: "Qualified buyer with clear need.",
      updatedAt: new Date("2026-05-01T00:00:00.000Z")
    });

    expect(score).toBeLessThan(76);
    vi.useRealTimers();
  });
});
