# Phase 12 — Final ML Pipeline & Artifacts

**Project:** Mobile Sales — Need to work  
**Target:** `Dispatch Duration = Dispatch Date − Inward Date`  
**Prediction point:** At inward receipt, before dispatch  
**Final operational benchmark:** Training-period median duration  
**Status:** Frozen after Phases 10–11; no model improvement was attempted in this phase.

## 1. Frozen decisions

| Decision | Frozen value |
|---|---|
| Target | Dispatch duration in calendar days |
| Prediction point | Inward receipt, before dispatch |
| Raw valid features | `Product`, `Brand`, `Region`, `Price`, `Inward Date` |
| Structural missing fields | `Core Specification`, `Processor Specification`, `RAM`, `ROM`, `SSD` are injected as explicit missing values because they are outside the frozen candidate contract |
| Excluded fields | `Dispatch Date`, `Dispatch Duration`, `Quantity Sold`, `Product Code`, `Product Specification`, `Customer Name`, `Customer Location` |
| Feature transformation | Shared Phase 5 feature-frame and preprocessing graph; no manual preprocessing |
| Final model | `DummyRegressor(strategy="median")` |
| Training target median | 31 days |
| Random seed | 42 in metadata; the frozen median benchmark itself is deterministic |
| Threshold | Not applicable to regression benchmark |

The final model is deliberately the target-only benchmark. Phase 10 showed that Ridge and HistGradientBoosting did not provide meaningful or stable improvement. The saved pipeline includes the complete validation, feature-frame, preprocessing, and model stages so the raw-input contract is explicit and reproducible.

## 2. Pipeline architecture

```text
Raw input DataFrame
        ↓
FrozenRawInputValidator
        ↓
Canonical frozen feature schema
        ↓
Structural missingness injection for excluded hardware fields
        ↓
build_feature_frame
        ↓
Phase 5 ColumnTransformer preprocessing
        ↓
DummyRegressor(strategy="median")
        ↓
Dispatch-duration prediction in days
```

The implementation is available in:

```text
final_pipeline.py
```

The validator rejects post-dispatch fields, target fields, identifiers, raw high-cardinality fields, and unresolved customer inputs. It canonicalizes column order, so schema-based inference does not depend on the order of input columns.

The pipeline does not require the caller to manually parse dates, impute prices, encode categories, or construct structural missingness fields.

## 3. Training protocol

The artifact was fitted only on rows before the final holdout period:

| Period | Dates | Rows | Role |
|---|---|---:|---|
| Training | 2023-03-21 through 2024-10-24 | 39,957 | Fit the frozen median and preprocessing graph |
| Validation history | 2023-10-01 through 2024-10-24 | Prior candidate selection | Used in Phases 7–11; not refit in this artifact build |
| Final holdout | 2024-10-25 through 2025-03-20 | 10,043 | Evaluation only; not used for fitting |

The final holdout was inspected in earlier project phases, so it cannot be described as globally untouched across the complete project history. Within this Phase 12 artifact build, no holdout rows were used to fit the pipeline or compute the frozen median.

No train-plus-validation retraining was performed. Because no learned model was promoted and the holdout independence caveat is material, the artifact remains trained on the approved pre-test period only.

## 4. Required artifacts

The following files were saved under `artifacts/`:

| Artifact | Purpose |
|---|---|
| `inference_pipeline.joblib` | Complete raw-input validation, feature-frame, preprocessing, and median-prediction pipeline |
| `final_model.joblib` | Fitted `DummyRegressor(strategy="median")` |
| `preprocessing_pipeline.joblib` | Input validation, feature-frame, and preprocessing stages without the model |
| `feature_metadata.json` | Frozen raw schema, exclusions, and derived-feature contract |
| `model_metadata.json` | Model class, dataset hash, periods, target, metrics, and library versions |
| `metrics.json` | Final holdout metrics and training target median |
| `training_config.json` | Frozen configuration, periods, feature lists, and retraining policy |

The dataset SHA-256 is:

```text
bfb4e1dd0b8d669c48b0915d302142e6802af3c822354a07a6cac1ef3c649417
```

The recorded environment versions are Python 3.12.3, pandas 3.0.5, NumPy 2.5.1, scikit-learn 1.5.2, and joblib 1.4.2.

## 5. Final benchmark metrics

| Metric | Final holdout value |
|---|---:|
| MAE | 15.0858 days |
| RMSE | 17.3923 days |
| R² | −0.0008 |
| Median absolute error | 15.0000 days |
| P90 absolute error | 27.0000 days |
| Training target median | 31 days |

These metrics are not presented as evidence of a useful predictive model. They characterize the expected behavior of the frozen historical-median benchmark.

## 6. Clean-process inference verification

The saved `inference_pipeline.joblib` was loaded in a separate Python process and tested with representative raw inputs. The verification script is:

```text
verify_phase12.py
```

All required checks passed:

| Check | Result |
|---|---:|
| Artifact reload | Passed |
| Deterministic repeated inference | Passed |
| Column-order invariance | Passed |
| Unknown Product, Brand, and Region handling | Passed |
| Missing numeric Price handling | Passed |
| Rejection of forbidden `Dispatch Date` | Passed |

Representative valid inputs produced the deterministic prediction `31.0` days. Unknown categories and a missing price also produced finite deterministic output through the fitted preprocessing graph.

## 7. Leakage and hidden-preprocessing controls

The validator rejects `Dispatch Date` and `Dispatch Duration` before the shared feature-frame function runs. It also rejects `Quantity Sold`, unique identifiers, raw specification text, and raw customer identity. Date parsing is performed inside the saved pipeline, and all preprocessing objects are serialized with the artifact.

The structural hardware fields are not supplied by the frozen caller; they are injected as explicit missing values so that the shared Phase 5 transformer preserves the earlier missingness contract without introducing unsupported information. No target-derived aggregate, future statistic, dispatch-derived date, or manual caller-side transformation is present.

## 8. Quality gate

| Requirement | Status |
|---|---:|
| Final pipeline frozen | Complete |
| Required artifacts saved | Complete |
| Artifacts reload successfully | Complete |
| Raw inference tested | Complete |
| Metadata complete | Complete: hash, periods, feature lists, configuration, metrics, versions |
| No hidden preprocessing | Complete: all transformations are inside serialized pipeline |
| No leakage | Complete by fail-closed input contract and pre-test-only fitting |
| Final learned model promoted | **No; historical median benchmark frozen** |

> **PHASE 12 COMPLETE**

## References

[1]: `phase_10_final_model_evaluation.md` "Phase 10 final-model evaluation report"
[2]: `phase_11_model_trust.md` "Phase 11 model-trust report"
[3]: `phase_5_preprocessing.md` "Phase 5 preprocessing architecture"
[4]: `../mobilesales.csv` "Supplied mobile-sales dataset"
