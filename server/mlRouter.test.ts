import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const ctx = {
  user: undefined,
  req: {} as TrpcContext["req"],
  res: {} as TrpcContext["res"],
} as TrpcContext;

describe("ml product contracts", () => {
  it("returns the frozen target and exact signal finding", async () => {
    const result = await appRouter.createCaller(ctx).ml.metadata();
    expect(result.exactFinding).toBe("No meaningful signal");
    expect(result.metadata.target).toBe("Dispatch Duration = Dispatch Date - Inward Date");
  });

  it("exposes the fourteen read-only phase reports", async () => {
    const reports = await appRouter.createCaller(ctx).ml.reports();
    expect(reports).toHaveLength(14);
    expect(reports[0]?.filename).toBe("phase_0_reconnaissance.md");
    expect(reports.at(-1)?.filename).toBe("phase_13_final_qa.md");
  });

  it("rejects forbidden and malformed prediction inputs at the contract boundary", async () => {
    const caller = appRouter.createCaller(ctx);
    await expect(caller.ml.predict({ Product: "", Brand: "A", Region: "North", Price: 12, "Inward Date": "2024-01-01" })).rejects.toThrow();
    await expect(caller.ml.predict({ Product: "Phone", Brand: "A", Region: "North", Price: 12, "Inward Date": "2024-01-01", "Dispatch Date": "2024-01-03" } as never)).rejects.toThrow();
  });
});
