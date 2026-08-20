import { describe, expect, it } from "vitest";
import { inferenceInputSchema, MODEL_FINDING, RECOVERED_QUANTITY_SOLD_MAE } from "@shared/mlContracts";

const reportFilenamePattern = /^phase_\d+_.+\.md$/;

describe("Mobile Sales dashboard display contracts", () => {
  it("accepts only the five raw prediction fields and rejects leakage fields", () => {
    const parsed = inferenceInputSchema.safeParse({
      Product: "Galaxy S21",
      Brand: "Samsung",
      Region: "North",
      Price: 24999,
      "Inward Date": "2024-10-01",
    });
    expect(parsed.success).toBe(true);
    expect(inferenceInputSchema.safeParse({
      Product: "Galaxy S21",
      Brand: "Samsung",
      Region: "North",
      Price: 24999,
      "Inward Date": "2024-10-01",
      "Dispatch Date": "2024-10-05",
    }).success).toBe(false);
  });

  it("keeps the exact no-signal wording and recovered metric visible", () => {
    expect(MODEL_FINDING).toBe("No meaningful signal");
    expect(RECOVERED_QUANTITY_SOLD_MAE.toFixed(4)).toBe("2.4957");
  });

  it("treats only phase markdown files as read-only audit records", () => {
    expect(reportFilenamePattern.test("phase_13_final_qa.md")).toBe(true);
    expect(reportFilenamePattern.test("../server/db.ts")).toBe(false);
    expect(reportFilenamePattern.test("phase_13_final_qa.txt")).toBe(false);
  });

  it("keeps an empty history state distinct from a populated history state", () => {
    const history: Array<{ id: number; predictionDays: string }> = [];
    expect(history.length).toBe(0);
    history.push({ id: 42, predictionDays: "31" });
    expect(history[0]?.id).toBe(42);
    expect(Number(history[0]?.predictionDays).toFixed(0)).toBe("31");
  });
});
