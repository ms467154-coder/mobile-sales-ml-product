import { z } from "zod";

export const inferenceInputSchema = z.object({
  Product: z.string().trim().min(1).max(255),
  Brand: z.string().trim().min(1).max(255),
  Region: z.string().trim().min(1).max(255),
  Price: z.number().finite().nonnegative(),
  "Inward Date": z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
}).strict();

export type InferenceInput = z.infer<typeof inferenceInputSchema>;

export type FrozenInferenceResult = {
  predictionDays: number;
  modelEstimate: boolean;
  artifact: string;
};

export type PersistedInferenceResult = FrozenInferenceResult & {
  historyId: number;
  createdAt: Date;
};

export type ModelMetricSet = {
  mae: number;
  rmse: number;
  r2: number;
  median_absolute_error?: number;
  p90_absolute_error?: number;
};

export type ModelMetadata = {
  artifact_role: string;
  model_class: string;
  configuration: { strategy: string };
  dataset_sha256: string;
  training_period: { start: string; end: string; rows: number };
  validation_period: string;
  test_period: string;
  target: string;
  prediction_point: string;
  metrics: {
    test: ModelMetricSet;
    training_target_median: number;
    test_rows: number;
    training_rows: number;
    selection_note: string;
  };
  versions: Record<string, string>;
};

export type ModelComparison = {
  dispatchDuration: Record<string, ModelMetricSet & { label: string }>;
  quantitySold: { recovered: ModelMetricSet & { label: string } };
};

export type ModelMetadataResponse = {
  metadata: ModelMetadata;
  metrics: ModelMetadata["metrics"];
  comparison: ModelComparison;
  exactFinding: "No meaningful signal";
  modelEstimateLabel: "Model estimate";
};

export const MODEL_FINDING = "No meaningful signal" as const;
export const RECOVERED_QUANTITY_SOLD_MAE = 2.4957 as const;
