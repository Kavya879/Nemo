import { describe, expect, it } from "vitest";
import { computeEligibility } from "@/services/orders/orders.service";

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000; // fixed reference

describe("orders.computeEligibility", () => {
  it("is eligible when delivered recently and within the window", () => {
    const delivered = new Date(NOW - 5 * DAY);
    const r = computeEligibility(delivered, "DELIVERED", 30, NOW);
    expect(r.eligible).toBe(true);
    expect(r.daysLeft).toBe(25);
  });

  it("is NOT eligible once the return window has closed", () => {
    const delivered = new Date(NOW - 45 * DAY);
    const r = computeEligibility(delivered, "DELIVERED", 30, NOW);
    expect(r.eligible).toBe(false);
    expect(r.reason).toMatch(/window closed/i);
  });

  it("is NOT eligible if not delivered yet", () => {
    const r = computeEligibility(new Date(NOW), "SHIPPED", 30, NOW);
    expect(r.eligible).toBe(false);
    expect(r.reason).toMatch(/not delivered/i);
  });

  it("is NOT eligible if a return is already in progress", () => {
    const r = computeEligibility(new Date(NOW - 2 * DAY), "RETURN_REQUESTED", 30, NOW);
    expect(r.eligible).toBe(false);
    expect(r.reason).toMatch(/already in progress/i);
  });
});
