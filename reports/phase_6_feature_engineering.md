# Phase 6 — Feature Engineering

**Project:** Mobile Sales — Need to work  
**Target:** Provisional `Dispatch Duration = Dispatch Date − Inward Date`  
**Prediction point:** At inward receipt, before dispatch  
**Reports reviewed:** Phases 0–5  
**Scope:** Leakage-safe feature investigation and fixed validation comparison. No hyperparameter optimization was performed.

## 1. Executive summary

A reusable feature-engineering module was created under:

```text
src/features/
└── engineering.py
```

The module implements prediction-time-valid calendar features, price transformations, training-fitted price-relative features, controlled low-cardinality interactions, and an optional strict as-of entity counter. It never reads `Dispatch Date` or `Dispatch Duration` while transforming predictors and raises an error if either is supplied.

A fixed chronological experiment compared the Phase 5 baseline feature set against the engineered feature set using the same `RandomForestRegressor` configuration and the same validation split. The training period ended on 2024-10-24 and validation began on 2024-10-25.

| Configuration | MAE (days) | RMSE (days) | R² | Median AE | P90 AE |
|---|---:|---:|---:|---:|---:|
| Median target baseline | 15.0858 | 17.3923 | −0.0008 | 15.0000 | 27.0000 |
| Baseline features + fixed model | 15.1221 | 17.4375 | −0.0060 | 15.2330 | 26.9348 |
| Engineered features + same fixed model | 15.0962 | 17.4044 | −0.0022 | 15.1756 | 27.0071 |

Relative to the baseline feature model, engineering improved MAE by only **0.0259 days** and RMSE by **0.0331 days**, while worsening P90 absolute error by **0.0723 days**. The engineered feature model did not materially outperform the median target baseline. The results do not justify retaining every engineered feature or increasing model complexity.

## 2. Evaluation design

The experiment uses an event-time split based on `Inward Date`, not a random split. The first 80% of unique inward dates form training data with 39,957 rows; the final 20% form validation data with 10,043 rows. The training maximum inward date is 2024-10-24 and the validation minimum is 2024-10-25.

The same fixed random forest configuration was used for both feature sets: 80 estimators, maximum depth 12, minimum leaf size 8, random state 42, and all available CPU workers. This is a controlled feature comparison rather than hyperparameter tuning. The median target baseline uses only the training-period median and is evaluated on the same validation rows.

The validation metrics are MAE, RMSE, R², median absolute error, and 90th-percentile absolute error. MAE remains the primary business metric because it is interpretable in calendar days.

## 3. Date features

The feature module derives the following from `Inward Date` only:

| Feature | Purpose | Leakage status |
|---|---|---|
| Year, month, quarter, day | Calendar position | Valid at inward time |
| Day of week, ISO week | Weekly and operational calendar effects | Valid at inward time |
| Sine/cosine month | Cyclical annual seasonality | Valid at inward time |
| Sine/cosine weekday | Cyclical weekly seasonality | Valid at inward time |

Phase 4 showed that monthly target means vary by approximately 1.78 days and weekday means by approximately 0.52 days. The engineered model did not show a material validation improvement, so date features should be retained only as low-cost candidate inputs rather than treated as strong explanatory variables.

No feature is derived from `Dispatch Date`. This is enforced by the feature transformer’s input validation.

## 4. Product and specification features

The implementation retains the audited low-cardinality product attributes as categorical inputs: `Product`, `Brand`, `Region`, `Core Specification`, `Processor Specification`, `RAM`, `ROM`, and `SSD`. Missing structural laptop fields are preserved through the Phase 5 preprocessing pipeline rather than globally imputed.

### Product and brand statistics

Training-fitted frequency features were investigated for `Product` and `Brand`. These are **training-distribution frequencies**, not target statistics: they count category occurrences in the training frame and map unseen validation categories to zero. They do not use dispatch duration. Because the dataset is nearly balanced and category frequencies are stable, their expected value is limited.

Training-fitted price medians by product and brand were also implemented. These support relative-price features without using target values or validation-period information. They are learned only from the training partition in the experiment.

`Product Code` and `Product Specification` remain excluded. `Product Code` is unique in all 50,000 rows, and `Product Specification` is unique generic-looking text. No product-level historical target statistics were created because the current data lacks a stable repeated product identifier.

## 5. Price features

The following price features were implemented:

| Feature | Definition | Leakage control |
|---|---|---|
| `log_price` | `log1p(Price)` | Uses current price only; no target information |
| `price_band` | Five training-derived empirical price cut points | Quantile cut points learned from training only |
| `price_vs_product_median` | Current price divided by training product median price | Training-only group medians; unseen products use global training median |
| `price_vs_brand_median` | Current price divided by training brand median price | Training-only group medians; unseen brands use global training median |

Phase 4 found Pearson and Spearman price-duration correlations near zero, and the price-duration visualization showed no obvious monotonic or nonlinear pattern. The fixed validation result provides no evidence that these transformations materially improve performance. They should be kept only if later time-aware validation across additional periods shows stable benefit.

No price target encoding or future price average was used.

## 6. Interaction features

Only a small set of semantically motivated interactions was implemented:

| Interaction | Rationale | Evaluation status |
|---|---|---|
| `Product × Brand` | Brand behavior may differ by product type | Included in engineered set; no material measured gain |
| `Product × Region` | Fulfillment behavior may vary by product-region combination | Included; no material measured gain |
| `Processor Specification × RAM` | Hardware configuration may identify operational handling groups | Included; no material measured gain |
| Product × price band | Investigated through generated analysis table | Not retained as a proven improvement |
| RAM × price band | Investigated through generated analysis table | Not retained as a proven improvement |

The feature set contains 28 columns before one-hot encoding, including 16 numeric features and 12 categorical features. This is intentionally limited; thousands of arbitrary interactions were not generated.

## 7. Customer features and historical aggregates

Raw `Customer Name` and `Customer Location` remain excluded because of privacy, cardinality, and generalization risks. No customer-frequency or customer-history feature was used in the validation experiment because the dataset does not establish that customer identity is available at inward receipt or that the fields represent valid operational entities.

An optional `AsOfEntityCounter` was implemented for future approved repeated entities. It sorts training events by timestamp and counts only strictly earlier events for each entity. Events at the same timestamp are excluded from one another, and future validation records can receive only counts learned from prior training events. It does not read target values.

Customer historical count, quantity, and average-duration features are therefore **not retained** in the current feature set. Before they can be considered, the project needs a verified customer ID, event-time availability, privacy approval, and a broader chronological history.

## 8. Feature impact decision

The engineered set improved the fixed baseline feature model slightly in MAE and RMSE, but the magnitude is negligible relative to the target scale and the model remained worse than the median target baseline in MAE and RMSE. The P90 error also became slightly worse.

| Decision | Features |
|---|---|
| Retain as low-cost candidates | Inward calendar features, low-cardinality product attributes, structural missingness representation |
| Retain only with future stability evidence | `log_price`, price bands, relative-price features, low-order interactions, training-only category frequencies |
| Remove by default | Raw `Product Code`, raw `Product Specification`, raw customer fields, target-derived aggregates, dispatch-derived features |
| Defer pending data and governance | Customer history, product history, target encoding, customer quantity averages, customer duration averages |

The current evidence supports a conservative feature set and stronger data collection rather than more feature complexity.

## 9. Reproducibility and leakage checks

The implementation and tests verify:

- The feature transformer rejects `Dispatch Date` and `Dispatch Duration`.
- The price-band cut points and product/brand price medians are fitted on training data only.
- Validation rows are transformed using the fitted training feature engineer without refitting.
- The optional as-of counter excludes the current row and future events.
- The experiment uses chronological splitting by inward time.
- Raw high-cardinality and unresolved fields are removed before model preprocessing.

The combined preprocessing and feature tests passed:

```text
6 passed in 5.15s
```

## 10. Recommendations for Phase 7 modeling

Phase 7 should begin with the median-duration baseline and a simple model using the conservative feature set. Any engineered feature should be retained only if it improves MAE consistently across multiple chronological validation windows and does not worsen tail error or segment stability.

The current dataset does not support reliable historical customer or product features. To make those features meaningful, obtain stable repeated product/customer identifiers, event timestamps, order history, inventory availability, warehouse, supplier, carrier, channel, priority, and backlog information.

## 11. Quality gate

| Requirement | Status |
|---|---:|
| Meaningful features investigated | Complete |
| Leakage-safe aggregates used | Complete; training-only price/category statistics and strict as-of counter implemented |
| Temporal features validated | Complete; inward-date-only features evaluated chronologically |
| Feature impact measured | Complete; baseline and engineered validation metrics recorded |
| Unhelpful features removed or deferred | Complete; high-cardinality, unresolved, and unsupported historical features excluded |
| Models trained | **Only fixed comparison models for feature impact; no final model selected** |
| Hyperparameter optimization performed | **Not performed** |

> **PHASE 6 COMPLETE**

## References

[1]: `phase_0_reconnaissance.md` "Phase 0 project and dataset reconnaissance"
[2]: `phase_1_data_audit.md` "Phase 1 data audit and data-quality report"
[3]: `phase_2_problem_definition.md` "Phase 2 business problem and target definition"
[4]: `phase_3_leakage_audit.md` "Phase 3 leakage and prediction-time audit"
[5]: `phase_4_eda.md` "Phase 4 exploratory data analysis"
[6]: `phase_5_preprocessing.md` "Phase 5 preprocessing architecture"
[7]: `../mobilesales.csv` "Supplied mobile-sales dataset"
