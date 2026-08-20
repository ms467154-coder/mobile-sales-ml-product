import { z } from "zod";
import { createInferenceHistory, getInferenceHistory } from "./db";
import { inferenceInputSchema } from "@shared/mlContracts";
import { getModelMetadata, listPhaseReports, readPhaseReport, runFrozenInference } from "./mlInference";
import { publicProcedure, router } from "./_core/trpc";

export const mlRouter = router({
  metadata: publicProcedure.query(() => getModelMetadata()),
  reports: publicProcedure.query(() => listPhaseReports()),
  report: publicProcedure.input(z.object({ filename: z.string() })).query(({ input }) => readPhaseReport(input.filename)),
  history: publicProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(50) }).optional()).query(({ input }) => getInferenceHistory(input?.limit ?? 50)),
  predict: publicProcedure.input(inferenceInputSchema).mutation(async ({ input }) => {
    const result = await runFrozenInference(input);
    const row = await createInferenceHistory({
      product: input.Product,
      brand: input.Brand,
      region: input.Region,
      price: String(input.Price),
      inwardDate: input["Inward Date"],
      predictionDays: String(result.predictionDays),
      requestPayload: input,
    });
    return { ...result, historyId: row.id, createdAt: row.createdAt };
  }),
});
