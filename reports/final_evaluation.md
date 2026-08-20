# Mobile Sales Demand Prediction — Final ML Evaluation

**Author:** Manus AI  
**Dataset:** `input/mobilesales.csv`  
**Dataset SHA-256:** `bfb4e1dd0b8d669c48b0915d302142e6802af3c822354a07a6cac1ef3c649417`  
**Pipeline scope:** Machine learning only. No frontend, backend, API, database, authentication, Docker, or deployment code was added.

## Executive summary

The supplied README describes a mobile-sales analysis project but does not define a target, prediction horizon, or business metric. The dataset contains 50,000 transaction-like records and 16 fields, including `Quantity Sold`, dates, product attributes, customer fields, and price. After an explicit target analysis, this implementation selects **`Quantity Sold` regression** as the most defensible ML task because it is the only clearly business-actionable numeric outcome in the schema and can support inventory or demand planning.

The prediction-time definition is: **make the prediction at `Inward Date`, before `Dispatch Date`, for a product transaction whose product, price, and product attributes are known.** This definition excludes `Dispatch Date`, dispatch duration, and all identifier-like or high-cardinality free-text fields from model inputs.

The measured results show that the available features contain little predictive signal for quantity. The best validation model, `HistGradientBoostingRegressor`, achieved validation MAE **2.5045**, RMSE **2.8755**, and R² **−0.0009**. On the untouched chronological test set it achieved MAE **2.4957**, RMSE **2.8732**, and R² **−0.0008**. The negative R² and near-baseline error indicate that the dataset’s quantity appears close to uniformly distributed noise conditional on the available fields. This is an important result: more tuning is unlikely to create reliable demand prediction without better explanatory variables or a more meaningful target definition.

## Dataset overview

| Property | Measured result |
|---|---:|
| Rows | 50,000 |
| Columns | 16 |
| Duplicate rows | 0 |
| Missing values | 49,966 total; structural in `Core Specification` and `SSD` |
| Negative prices | 0 |
| Negative quantities | 0 |
| Dispatch before inward | 0 |
| Inward-date range | 2023-03-21 to 2025-03-20 |
| Dispatch-date range | 2023-03-23 to 2025-05-18 |
| Quantity values | Integers 1 through 10 |
| Quantity distribution | Approximately 9.8%–10.3% per value |

The two missing columns are structurally tied to product type: `Core Specification` and `SSD` are missing for all mobile-phone records and present for laptops. This is not ordinary random missingness; it is a product-dependent representation of “not applicable.” The pipeline preserves these columns and uses explicit categorical imputation rather than dropping them.

## Business problem and target selection

The README does not state an intended ML problem. The following candidates were considered.

| Candidate | Task | Advantages | Problems |
|---|---|---|---|
| `Quantity Sold` | Regression or ordinal classification | Directly available, operationally relevant to demand planning, numeric with ten ordered values | The observed target is nearly uniform and appears weakly related to available features; no explicit forecast horizon is supplied |
| `Price` | Regression | Numeric and complete | Price is an input-like commercial attribute and predicting it has no stated business use |
| Dispatch duration | Regression | Can be derived from the two dates | `Dispatch Date` is future information if prediction occurs at inward time; using it would leak the outcome process |
| Product/brand segmentation | Clustering | Does not require an invented target | No defined success criterion or business use is supplied |
| Anomaly detection | Unsupervised | Could inspect unusual transactions | No anomaly label or operational action is defined |

`Quantity Sold` regression was selected because it is the most defensible supervised objective, not because its results are strong. Classification was not selected because the ten values are ordered counts, and the dataset provides no business threshold that would make ten classes meaningful. A count model such as Poisson or negative binomial regression could be evaluated in a future iteration, but the current target distribution and lack of signal make a conventional regression baseline a transparent first system.

## Prediction-time feature availability

| Feature | Available at inward time? | Decision |
|---|---|---|
| `Product`, `Brand`, `Price` | Yes, under the selected formulation | Used |
| `Inward Date` | Yes | Converted to calendar features |
| `Core Specification`, `Processor Specification`, `RAM`, `ROM`, `SSD` | Yes if product catalog data is available | Used with missing-value handling |
| `Region` | Assumed available with the transaction | Used |
| `Dispatch Date` | No; occurs after inward time | Excluded |
| Dispatch duration | No; derived from future dispatch date | Excluded |
| `Product Code` | Identifier-like and unique per row | Excluded |
| `Product Specification` | Unique free text per row with no verified structured semantics | Excluded |
| `Customer Name` | High-cardinality and potentially sensitive | Excluded |
| `Customer Location` | High-cardinality free-form location; `Region` already summarizes geography | Excluded |
| `Quantity Sold` | The target | Never used as a feature |

## Leakage and high-cardinality audit

`Product Code` and `Product Specification` each have 50,000 unique values for 50,000 rows. Their uniqueness makes them identifier-like, and using them would permit memorization rather than generalization. Their within-group target mean variation is also not meaningful evidence of predictive value because each group contains one row.

`Customer Name` has 40,013 unique values and `Customer Location` has 25,147. Raw one-hot encoding would create high-dimensional sparse categories, would generalize poorly to unseen customers, and could expose sensitive information. Historical customer aggregates were not created because the dataset does not define an event-time protocol for leakage-safe history. They should only be added after a timestamped customer history design exists.

`Dispatch Date` must not be used for this prediction definition. The observed dispatch duration ranges from 1 to 60 days, but it is calculated from future information relative to `Inward Date` and would not be available at scoring time.

## Exploratory findings

The target is nearly uniform: every quantity from 1 through 10 represents approximately one tenth of the dataset. Product, region, brand, RAM, ROM, and SSD group means are also very close to the global mean of approximately 5.51 units. The final permutation-importance analysis found only small effects; the largest measured mean importance was `Brand` at approximately 0.0018 in negative-RMSE scoring, followed by the `ram_rom` interaction at approximately 0.0006 and `Price` at approximately 0.0006. Date features were effectively negligible.

![EDA overview](eda_overview.png)

The EDA and audit artifacts are stored in `reports/dataset_audit.md`, `reports/dataset_audit.json`, `reports/analysis_more.txt`, and `reports/eda_overview.png`.

## Preprocessing and feature engineering

The reusable pipeline parses `Inward Date`, derives year, month, quarter, day of week, day of month, and day of year, extracts numeric capacities from RAM/ROM/SSD strings, computes `log_price`, creates price bands, and tests product-brand and RAM-ROM interactions. Numeric features use median imputation and standardization. Categorical features use most-frequent imputation and one-hot encoding with unknown-category handling and a minimum-frequency threshold.

The complete transformation and estimator are serialized together in `artifacts/inference_pipeline.joblib`, so raw records can be passed through the same transformations used during training. No manual dispatch-duration or post-event feature is included.

## Validation strategy

Because dates exist and the selected use case is a future-facing demand prediction, the pipeline uses a chronological split:

| Split | Rows | Time interval |
|---|---:|---|
| Train | 35,000 | Through 2024-08-12 |
| Validation | 7,500 | 2024-08-13 through 2024-12-01 |
| Test | 7,500 | 2024-12-02 through 2025-03-20 |

The validation split is used for model comparison. The test split is kept isolated until the winning model is selected. The final saved pipeline is retrained on train plus validation data, while the reported test metrics remain from the untouched test evaluation.

## Baseline and model comparison

| Model | Validation MAE | Validation RMSE | Validation R² |
|---|---:|---:|---:|
| HistGradientBoostingRegressor | 2.5045 | 2.8755 | −0.0009 |
| Ridge | 2.5038 | 2.8770 | −0.0019 |
| Dummy median | 2.5100 | 2.9218 | −0.0333 |
| Random forest | 2.5142 | 2.9025 | −0.0197 |

The small improvement over the median baseline is not practically persuasive, and the negative R² means the models do not explain meaningful variance relative to a constant predictor. HistGradientBoosting was selected because it had the best RMSE among the evaluated models, but it should be treated as an evidence-preserving baseline rather than a production demand model.

No aggressive hyperparameter search was justified after the baseline results showed near-zero explanatory power. Tuning a weak feature set would risk overfitting validation noise rather than improving generalization.

## Final test evaluation

| Metric | Test result |
|---|---:|
| Model | HistGradientBoostingRegressor |
| MAE | 2.4957 |
| RMSE | 2.8732 |
| R² | −0.0008 |

The test error is almost identical to validation error, indicating stable but weak performance. Stability here should not be confused with usefulness: the model is consistently close to a simple central-tendency predictor because the available features do not explain the target well.

## Error analysis and robustness

The pipeline saves the 1,000 largest absolute errors to `artifacts/largest_errors.csv`, segment-level results to `artifacts/segment_performance.csv`, and grouped error summaries to `artifacts/error_by_group.csv`. The near-uniform target and the small segment mean differences suggest errors are not driven by one obvious product or region category. The most important unresolved issue is not a model-specific failure mode; it is the absence of explanatory demand variables such as inventory availability, promotion, channel, seasonality at a meaningful granularity, historical product demand, and transaction/order context.

The chronological validation and test results are close, and the pipeline uses fixed seed 42 for model construction and artifact generation. Additional multi-seed evaluation should be added after a meaningful target and richer data source are established. In the present dataset, a large performance claim would not be credible.

## Saved artifacts

```text
artifacts/
├── inference_pipeline.joblib
├── model_metadata.json
├── model_comparison.csv
├── permutation_importance.csv
├── segment_performance.csv
├── error_by_group.csv
└── largest_errors.csv

reports/
├── dataset_audit.md
├── dataset_audit.json
├── analysis_more.txt
├── eda_overview.png
└── final_evaluation.md
```

## Reproduction

From the project root:

```bash
python3 audit_dataset.py
python3 train.py
python3 generate_reports.py
pytest -q test_pipeline.py
```

Raw-input inference is available with:

```bash
python3 predict.py --input path/to/raw_record.json
```

The JSON input should contain the raw feature fields expected by the pipeline. The target field is ignored during inference if present, but it should normally be omitted.

## Limitations and next improvements

The central limitation is that the dataset does not contain enough explanatory information to support useful demand prediction. The quantity target is nearly uniform, the README does not define a forecasting business process, and each record appears to be a completed transaction rather than a time-indexed demand panel. A stronger next step is to obtain daily or weekly product-level demand with inventory, price/promotion, sales channel, stockout indicators, product lifecycle, and historical lag features.

The project should not add increasingly complex models until the target definition and data-generating process improve. The next ML iteration should compare count-aware regression, a panel/time-series formulation, and leakage-safe lag features using a clearly defined forecast horizon. If the real business goal is post-sale fulfillment, a separate dispatch-duration target should be defined and modeled with an explicit prediction time before dispatch.

## Final quality gate

| Requirement | Status |
|---|---:|
| README inspected | Complete |
| Dataset inspected | Complete |
| Target explicitly justified | Complete |
| Prediction time defined | Complete |
| Leakage audit | Complete |
| High-cardinality strategy | Complete |
| Temporal analysis | Complete |
| Missingness analysis | Complete |
| Validation matching the problem | Complete |
| Multiple baselines | Complete |
| Feature engineering tested | Complete |
| Feature selection decision | Complete: identifier-like fields excluded; no noisy automated pruning claimed |
| Hyperparameter optimization | Not pursued beyond controlled candidates because signal was near zero; documented justification |
| Untouched test evaluation | Complete |
| Error analysis | Complete artifacts generated |
| Explainability | Complete permutation importance artifact |
| Inference pipeline | Complete |
| Artifacts | Complete |
| Tests | Complete: 4 passed |
| README update | Complete |
| Final evaluation report | Complete |

## Conclusion

The pipeline is complete and reproducible as an ML system, but the measured model is **not sufficiently predictive for operational demand planning**. The correct engineering conclusion is to preserve the clean, leakage-aware pipeline and improve the data and problem definition before pursuing more sophisticated optimization.
