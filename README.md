# Mobile Sales ML

> A transparent audit and inference interface for a frozen dispatch-duration benchmark.

[![CI](https://github.com/ms467154-coder/mobile-sales-ml-product/actions/workflows/ci.yml/badge.svg)](https://github.com/ms467154-coder/mobile-sales-ml-product/actions/workflows/ci.yml)

Mobile Sales ML turns a 14-phase machine-learning audit into an inspectable product. It exposes the approved prediction-time input contract, serves exact evaluation metrics from frozen artifacts, records inference requests, and preserves the full audit trail as read-only reports.

The central result is intentionally modest: **the available features contain no meaningful signal for Dispatch Duration beyond the historical median benchmark**. The application communicates that limitation directly instead of presenting a weak model as operational certainty.

## Product overview

The application provides a single workspace for four related activities:

| Area | What it provides |
| --- | --- |
| Overview | Frozen model status, target definition, prediction point, exact test metrics, and limitations |
| Inference | Raw-input prediction using only `Product`, `Brand`, `Region`, `Price`, and `Inward Date` |
| Performance | Candidate comparison for Dispatch Duration and the recovered Quantity Sold result |
| Audit trail | Fourteen read-only phase reports documenting the dataset, leakage checks, modeling, trust review, and final QA |
| History | Database-backed records of submitted inputs, estimates, and timestamps |

## Model card

| Field | Frozen value |
| --- | --- |
| Target | `Dispatch Duration = Dispatch Date - Inward Date` |
| Prediction point | At inward receipt, before dispatch |
| Model | `sklearn.dummy.DummyRegressor(strategy="median")` |
| Training rows | 39,957 |
| Test rows | 10,043 |
| Test MAE | 15.0858 days |
| Test RMSE | 17.3923 days |
| Test R² | -0.0008 |
| Historical median estimate | 31 days |
| Finding | **No meaningful signal** |

The recovered Quantity Sold comparison is shown only for historical transparency. Its reproduced MAE is **2.4957**, but it is a different target and is not evidence of Dispatch Duration performance.

## Architecture

```text
React + Vite frontend
        │
        │ typed tRPC calls
        ▼
Express + tRPC server
        ├── model metadata and read-only report procedures
        ├── strict raw-input validation via shared Zod contract
        ├── durable inference-history persistence through Drizzle ORM
        └── Python bridge
                └── frozen inference_pipeline.joblib
```

The shared contract in `shared/mlContracts.ts` is consumed by both the server and the client. The Python bridge loads the serialized artifact without retraining or duplicating preprocessing in the UI. Successful prediction responses require a persisted history record; database failures are surfaced instead of being silently represented as successful estimates.

## Repository structure

```text
client/                 React application and dashboard UI
server/                 tRPC procedures, database helpers, and tests
shared/                 Shared inference and metadata contracts
drizzle/                Drizzle schema and SQL migrations
ml_artifacts/           Frozen model, metrics, metadata, and configuration
ml_pipeline/            Reproducible pipeline source used by the artifact
scripts/                Python inference bridge and runtime requirements
reports/                Fourteen read-only phase reports
src/                    Python preprocessing and feature modules
```

## Local development

### Requirements

- Node.js 22 or a compatible modern Node.js runtime
- pnpm
- Python 3.11+
- A MySQL/TiDB database for durable inference history

### Install dependencies

```bash
pnpm install
python3 -m pip install -r scripts/requirements.txt
```

### Configure environment

The full-stack application expects the environment variables supplied by the hosting environment, including `DATABASE_URL` and the Manus authentication variables. Do not commit `.env` files or credentials. For local development, provide the required values through your shell or an ignored `.env` file.

### Run the application

```bash
pnpm dev
```

The development server serves the React application and the tRPC API together.

### Validate the project

```bash
pnpm check
pnpm test
pnpm build
```

The test suite covers server contracts, frozen inference persistence semantics, metadata and report catalog behavior, raw-input validation, exact metrics, and history-state display contracts.

## Frozen inference example

The Python bridge accepts one JSON object on standard input and returns one JSON object:

```bash
printf '%s' '{"Product":"Galaxy S21","Brand":"Samsung","Region":"North","Price":24999,"Inward Date":"2024-10-01"}' \
  | python3 scripts/predict.py
```

Expected benchmark output:

```json
{"predictionDays":31.0,"modelEstimate":true,"artifact":"inference_pipeline.joblib"}
```

## Evidence and limitations

The application is an audit interface, not a promise engine. Dispatch timing is affected by operational variables that are absent from the dataset, including fulfillment-center conditions, inventory availability, supplier and carrier behavior, backlog, staffing, stockouts, order priority, and promotion context. The frozen artifact should not be used for individual customer commitments, automated escalation, staffing decisions, or service guarantees.

All fourteen phase reports are retained under `reports/`. They are the source of truth for the decisions that led to the frozen benchmark. The artifact is not retrained by the application.

## Deployment notes

The deployment image installs the Node and Python dependencies before running `pnpm build`. `scripts/requirements.txt` intentionally pins `numpy==2.4.6`, which is compatible with the deployment image’s Python 3.11 runtime. The repository contains the joblib artifact and its import-compatible pipeline module so production inference can reload the frozen model.

The live application is hosted at [mobilesales-f9r3y3ru.manus.space](https://mobilesales-f9r3y3ru.manus.space).

## Responsible use

This project prioritizes reproducibility, explicit uncertainty, and honest model communication. A weak predictive result is still a useful finding when it prevents an unsupported operational decision.
