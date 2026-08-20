# Phase 14 — Post-Project Model Regression Audit & Performance Recovery

**Audit scope:** Forensic comparison of the earlier high-performing implementation and the current final pipeline. Existing current artifacts were preserved; all audit outputs were written under `reports/post_project_audit/`, and the recovered historical model was written under `artifacts/recovered/`.

## Executive conclusion

The apparent performance regression is primarily a **target-definition change**, not evidence that the dataset suddenly became unusable or that the historical model was invalid.

The earlier implementation solves **Quantity Sold regression** and was reproduced exactly: test MAE 2.4957, RMSE 2.8732, and R² −0.0008. The current final implementation solves **Dispatch Duration regression** and was independently reproduced: test MAE 15.0858 days, RMSE 17.3923 days, and R² −0.0008.

These are different targets with different units, support, distributions, and business meanings. Their raw MAE values cannot be compared as if they measured the same task.

> **FINAL DECISION: D — VALID PERFORMANCE RECOVERED.**

This decision applies to the historical **Quantity Sold** task. No materially stronger leakage-free Dispatch Duration model was recovered. The current Dispatch Duration benchmark remains the correct honest result for that separate task.

## 1. Historical implementation found

The strongest previous implementation is the untouched `src_pipeline.py` path in the earlier sandbox project. It defines `TARGET = 'Quantity Sold'`, predicts at inward date, excludes dispatch and identifier-like fields, engineers date parts and RAM/ROM/SSD numeric features, log price, price bands, and product/brand and RAM/ROM interactions, and compares Dummy, Ridge, Random Forest, and HistGradientBoosting models.

The historical split is chronological 70/15/15 by sorted row order: 35,000 train rows, 7,500 validation rows, and 7,500 test rows. Model selection uses validation RMSE, and the saved winning artifact is retrained on train plus validation before being serialized.

Historical HistGradientBoosting configuration:

```text
max_iter=180
learning_rate=0.06
max_leaf_nodes=31
l2_regularization=1.0
random_state=42
```

## 2. Reproduction results

| Implementation | Target | Historical reported score | Reproduced score | Difference |
|---|---|---:|---:|---:|
| Historical v1 | Quantity Sold, test MAE | 2.4957 | 2.4957481 | 0.0000 at shown precision |
| Historical v1 | Quantity Sold, test RMSE | 2.8732 | 2.8732221 | 0.0000 at shown precision |
| Historical v1 | Quantity Sold, test R² | −0.0008 | −0.0008325 | 0.0000 at shown precision |
| Current final | Dispatch Duration, holdout MAE | 15.0858 | 15.0858309 | 0.0000 at shown precision |
| Current final | Dispatch Duration, holdout RMSE | 17.3923 | 17.3923482 | 0.0000 at shown precision |
| Current final | Dispatch Duration, holdout R² | −0.0008 | −0.0008263 | 0.0000 at shown precision |

The historical reproduction was executed without rewriting the old implementation. Its outputs are isolated under `reports/post_project_audit/historical_artifacts/`.

## 3. Target regression analysis

| Property | Historical Quantity Sold | Current Dispatch Duration |
|---|---:|---:|
| Rows | 50,000 | 50,000 |
| Mean | 5.5138 | 30.5920 |
| Median | 6 | 31 |
| Standard deviation | 2.8810 | 17.3227 |
| Minimum | 1 | 1 |
| Maximum | 10 | 60 |
| Unique values | 10 | 60 |
| Unit | Units sold | Calendar days |

Quantity Sold is a bounded 1–10 target with a narrow absolute scale. Dispatch Duration is a 1–60-day target with a broad near-uniform spread. The target construction checks found no date parsing regression: both implementations use strict parsing, the dataset has no invalid dates, and dispatch duration has no negative or zero violations.

The largest root cause is therefore:

> **A — Target definition changed.**

The current final pipeline did not degrade while solving the same problem; it changed the problem from quantity prediction to fulfillment-duration prediction.

## 4. Historical protocol comparison

The historical protocol uses 35,000/7,500/7,500 chronological row-count partitions with test through 2025-03-20. The current protocol uses a date cutoff at 2024-10-25, leaving 39,957 training rows and 10,043 holdout rows. Both protocols preserve temporal order, but they are not identical.

The protocol difference does not explain the magnitude of the target gap. The historical Quantity Sold test MAE is 2.4957 under its original protocol. Under the same 2024-10-25 date cutoff used for the current duration benchmark, Quantity Sold HistGradientBoosting MAE is 2.4910, while Dispatch Duration HistGradientBoosting MAE is 15.0886.

## 5. Same-protocol A/B comparison

The same fixed HistGradientBoosting configuration was applied to both targets at the same 2024-10-25 date cutoff.

| Target | Feature set | MAE | RMSE | R² |
|---|---|---:|---:|---:|
| Quantity Sold | Compact valid features | 2.4910 | 2.8666 | −0.0002 |
| Quantity Sold | Historical engineered features | 2.4896 | 2.8680 | −0.0012 |
| Dispatch Duration | Compact valid features | 15.0886 | 17.3886 | −0.0004 |
| Dispatch Duration | Historical engineered features, Quantity Sold removed | 15.0882 | 17.3881 | −0.0003 |

Restoring historical features improves the duration MAE by only 0.0005 days, which is negligible. The earlier feature engineering is valid and reproducible for Quantity Sold, but it does not recover useful Dispatch Duration signal.

## 6. Feature regression findings

The historical implementation retained `Core Specification`, `Processor Specification`, `RAM`, `ROM`, and `SSD` as catalog attributes and derived numeric capacity features. The current duration pipeline excluded them from the frozen candidate contract after Phase 8–9 showed no stable signal and because `Core Specification` and `SSD` have structural missingness.

This feature removal is not the primary cause of the weak duration result. Controlled restoration changed duration MAE by less than one-thousandth of a day. Product, brand, region, price, date, hardware categories, specification parsing, and strict customer history all remain near-zero or unstable for duration.

High cardinality was not treated as automatic leakage. Product Code, Product Specification, Customer Name, and Customer Location were evaluated for prediction-time availability, target derivation, future information, identifier memorization, privacy, and reproducible signal. The historical model excluded them, and their exclusion does not explain the target gap.

## 7. Preprocessing and model regression findings

The historical preprocessing uses median numeric imputation, StandardScaler, most-frequent categorical imputation, one-hot encoding with `min_frequency=2`, date parts, capacity extraction, log price, price bands, and interactions. The current pipeline is more conservative and fail-closed, with explicit unknown/missing handling and a serialized raw-input contract.

The current final artifact is a median benchmark by design. This is a model-capacity difference, but it is not a hidden regression: applying the historical HistGradientBoosting capacity and feature engineering to Dispatch Duration still yields approximately 15.09-day MAE. The current weak result is signal-limited rather than caused by an underpowered estimator.

## 8. Leakage verification

The historical Quantity Sold model excludes `Dispatch Date`, dispatch duration, and target-derived aggregates. Its used features are either transaction/catalog attributes or transformations of `Inward Date`. No historical leakage was identified in the inspected implementation.

The current Dispatch Duration model constructs the target from `Dispatch Date` but rejects `Dispatch Date` at inference. Quantity Sold is removed from duration features in the same-protocol restoration experiment because its availability at inward receipt is not documented.

No audit experiment used future aggregates, test outcomes, dispatch-derived features, random splitting, or test-set tuning to create an improvement.

## 9. Root-cause classification

| Possible cause | Finding |
|---|---|
| A. Target definition changed | **Primary cause confirmed** |
| B. Feature removal | Secondary; restoration does not recover duration signal |
| C. Feature engineering regression | Not supported; historical features change duration MAE negligibly |
| D. Preprocessing regression | Not supported as primary cause |
| E. Encoding regression | Not supported as primary cause |
| F. Split/evaluation regression | Protocol differs, but same-protocol result preserves target gap |
| G. Model regression | Current model is intentionally simpler; stronger HGB still weak for duration |
| H. Dataset mismatch | Not found; SHA-256 matches expected value |
| I. Historical leakage | Not found in inspected Quantity Sold implementation |
| J. Historical result optimistic | Not supported; historical result reproduced exactly |
| K. Multiple causes | Secondary protocol/model differences exist, but target change dominates |
| L. No regression found | Correct for same-target comparison; no same-target degradation was found |

## 10. Recovery artifact

The valid historical Quantity Sold model was preserved separately at:

```text
artifacts/recovered/quantity_model/
├── inference_pipeline.joblib
├── model_metadata.json
├── model_comparison.csv
└── recovery_note.txt
```

This artifact is **not** a replacement for the current Dispatch Duration pipeline. It is a recovered model for a different target and must be integrated only if the business objective is confirmed as Quantity Sold prediction.

## 11. Current pipeline status

The current Dispatch Duration artifact and reports were not overwritten. Its independently reproduced result remains:

| Metric | Current Dispatch Duration benchmark |
|---|---:|
| MAE | 15.0858 days |
| RMSE | 17.3923 days |
| R² | −0.0008 |

No materially stronger valid Dispatch Duration model was recovered. The dataset does not contain the fulfillment operational predictors required to improve that task.

## 12. Final decision

> **D — VALID PERFORMANCE RECOVERED.**

The earlier Quantity Sold performance is valid, reproducible, and preserved as a recovered artifact. The apparent project-wide regression came from changing the target and business question, not from a mysterious loss of model quality. For Dispatch Duration, the current weak benchmark remains the strongest honest evidence.

## References

[1]: `performance_history.md` "Verified performance history"
[2]: `target_comparison.md` "Target construction and distribution comparison"
[3]: `feature_regression.md` "Historical-versus-current feature comparison"
[4]: `preprocessing_model_regression.md` "Preprocessing, split, and model regression analysis"
[5]: `leakage_verification.md` "Historical and current leakage verification"
[6]: `historical_artifacts/model_metadata.json` "Reproduced historical Quantity Sold metadata"
[7]: `current_reproduction.json` "Independently reproduced current Dispatch Duration metrics"
[8]: `same_protocol_ab.csv` "Same-protocol controlled A/B results"
[9]: `../../input/mobilesales.csv` "Verified mobile-sales dataset"
