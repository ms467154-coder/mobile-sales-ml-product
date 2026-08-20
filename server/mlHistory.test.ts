import { beforeEach, describe, expect, it, vi } from "vitest";

const { createInferenceHistory, getInferenceHistory } = vi.hoisted(() => ({
  createInferenceHistory: vi.fn(),
  getInferenceHistory: vi.fn(),
}));

vi.mock("./db", () => ({
  createInferenceHistory,
  getInferenceHistory,
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const ctx = {
  user: undefined,
  req: {} as TrpcContext["req"],
  res: {} as TrpcContext["res"],
} as TrpcContext;

describe("inference history persistence contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createInferenceHistory.mockResolvedValue({
      id: 42,
      product: "Galaxy S21",
      brand: "Samsung",
      region: "North",
      price: "24999",
      inwardDate: "2024-10-01",
      predictionDays: "31",
      requestPayload: { Product: "Galaxy S21", Brand: "Samsung", Region: "North", Price: 24999, "Inward Date": "2024-10-01" },
      createdAt: new Date("2026-08-21T00:00:00.000Z"),
    });
    getInferenceHistory.mockResolvedValue([{ id: 42, product: "Galaxy S21", brand: "Samsung", region: "North", price: "24999", inwardDate: "2024-10-01", predictionDays: "31", requestPayload: { Product: "Galaxy S21" }, createdAt: new Date("2026-08-21T00:00:00.000Z") }]);
  });

  it("returns a durable history id only after the insert helper resolves a record", async () => {
    const result = await appRouter.createCaller(ctx).ml.predict({
      Product: "Galaxy S21",
      Brand: "Samsung",
      Region: "North",
      Price: 24999,
      "Inward Date": "2024-10-01",
    });

    expect(result.historyId).toBe(42);
    expect(result.predictionDays).toBe(31);
    expect(createInferenceHistory).toHaveBeenCalledOnce();
    const history = await appRouter.createCaller(ctx).ml.history({ limit: 30 });
    expect(history).toHaveLength(1);
    expect(history[0]?.id).toBe(result.historyId);
    expect(history[0]?.predictionDays).toBe("31");
  });
});
