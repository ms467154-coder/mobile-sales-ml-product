import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import type { InferenceInput, ModelMetadata, ModelComparison, ModelMetadataResponse } from "@shared/mlContracts";

const root = process.cwd();
const metadataPath = path.join(root, "ml_artifacts", "model_metadata.json");
const metricsPath = path.join(root, "ml_artifacts", "metrics.json");
const comparisonPath = path.join(root, "ml_artifacts", "comparison.json");

export async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

export async function getModelMetadata(): Promise<ModelMetadataResponse> {
  const [metadata, metrics, comparison] = await Promise.all([
    readJsonFile<ModelMetadata>(metadataPath),
    readJsonFile<ModelMetadata["metrics"]>(metricsPath),
    readJsonFile<ModelComparison>(comparisonPath),
  ]);
  return { metadata, metrics, comparison, exactFinding: "No meaningful signal", modelEstimateLabel: "Model estimate" };
}

export async function runFrozenInference(input: InferenceInput) {
  return new Promise<{ predictionDays: number; modelEstimate: boolean; artifact: string }>((resolve, reject) => {
    const child = spawn("python3", [path.join(root, "scripts", "predict.py")], { cwd: root });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk.toString(); });
    child.stderr.on("data", chunk => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", code => {
      if (code !== 0) return reject(new Error(stderr || `Inference process exited with code ${code}`));
      try { resolve(JSON.parse(stdout)); } catch { reject(new Error("Inference process returned invalid JSON")); }
    });
    child.stdin.end(JSON.stringify(input));
  });
}

export async function listPhaseReports() {
  const entries = await fs.readdir(path.join(root, "reports"), { withFileTypes: true });
  return entries
    .filter(entry => /^phase_\d+_.+\.md$/.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .map(entry => ({
      slug: entry.name.replace(/\.md$/, ""),
      filename: entry.name,
      title: entry.name.replace(/^phase_\d+_/, "").replace(/_/g, " ").replace(/\.md$/, ""),
    }));
}

export async function readPhaseReport(filename: string) {
  if (!/^phase_\d+_.+\.md$/.test(filename)) throw new Error("Invalid report filename");
  return fs.readFile(path.join(root, "reports", filename), "utf8");
}
