# Phase 5 — Preprocessing Architecture

**Project:** Mobile Sales — Need to work  
**Target:** Provisional `Dispatch Duration = Dispatch Date − Inward Date`  
**Prediction point:** At inward receipt, before dispatch  
**Scope:** Reusable preprocessing implementation and integrity verification. No model was trained and no hyperparameter optimization was performed.

## 1. Architecture summary

The preprocessing implementation is located under:

```text
src/preprocessing/
├── __init__.py
└── pipeline.py
```

The architecture is built around a single scikit-learn `ColumnTransformer` and nested `Pipeline` objects. The same fitted transformer object is intended to be serialized with a future model and reused for inference. There is no hidden manual preprocessing step between CSV input and transformed model features.

The implementation uses an explicit feature allowlist and fails closed when prohibited columns are supplied. This is important because the raw CSV includes fields that are present historically but are not proven to be available at the prediction timestamp.

## 2. Feature contract

### Default candidate inputs

| Feature group | Fields | Default treatment |
|---|---|---|
| Numerical | `Price` | Median imputation; optional standardization for linear models; no blind transformation or clipping |
| Categorical | `Product`, `Brand`, `Region`, `Core Specification`, `Processor Specification`, `RAM`, `ROM`, `SSD` | Constant missing-value token followed by one-hot encoding with unknown-category handling |
| Date | `Inward Date` | Deterministic calendar and cyclical features through `DateFeatureExtractor` |

### Explicitly excluded fields

| Field | Reason |
|---|---|
| `Dispatch Date` | Occurs after prediction and is used only to construct the training label |
| `Dispatch Duration` | The target itself; never an input |
| `Product Code` | Unique in all 50,000 rows; identifier/memorization risk |
| `Product Specification` | Unique text-like values with unclear provenance and high memorization risk |
| `Customer Name` | High-cardinality, privacy-sensitive, poor unseen-customer generalization |
| `Customer Location` | High-cardinality, privacy-sensitive, and semantically unvalidated |
| `Quantity Sold` | Availability at inward receipt is not established; may be post-event information |

The function `validate_raw_features()` rejects excluded fields by default and raises an error if required candidate fields are missing. This prevents an inference caller from silently passing a post-dispatch column into the feature graph.

## 3. Numerical preprocessing

`Price` is the only default numerical feature. Phase 1 showed positive values, no zero values, no IQR outliers, near-zero skewness, and a broad range from 5,008 to 199,999. Accordingly, the implementation does not apply log transformation, winsorization, clipping, or automatic outlier removal.

Missing numerical values are handled with a training-fitted median imputer. The imputer is part of the pipeline, so the median is learned only from the training partition and then reused unchanged for validation, test, and inference data.

The `build_preprocessor()` function supports two explicit model families:

| Model family | Numeric treatment | Rationale |
|---|---|---|
| `tree` | Median imputation; original scale retained | Tree models do not require standardization, and retaining the original unit aids interpretation |
| `linear` | Median imputation followed by `StandardScaler` | Linear and distance-sensitive models benefit from comparable numeric scales |

No transformation is applied merely because a transformation is available. The model family determines whether scaling is appropriate.

## 4. Categorical preprocessing

The default categorical pipeline uses:

1. `SimpleImputer(strategy="constant", fill_value="__MISSING__")`.
2. `OneHotEncoder(handle_unknown="ignore", sparse_output=False)`.

This design preserves the distinction between structural non-applicability and an unseen future value. In particular, `Core Specification` and `SSD` are not mode-imputed. Their missing values are retained as an explicit category because Phase 1 established that all mobile-phone rows are missing those laptop-oriented fields.

One-hot encoding is appropriate for the default categorical fields because their audited cardinalities are small: product has 2 values, region 5, RAM 6, ROM 5, processor specification 15, brand 20, and structural-missingness fields remain manageable. Unknown categories at inference produce all-zero encoded indicators for that field rather than changing the feature width or failing unexpectedly.

No ordinal encoding is used. The categories do not have a universally justified order for fulfillment duration, and imposing one could create artificial distance.

## 5. High-cardinality strategy

The architecture does not one-hot encode high-cardinality fields. The default contract excludes all four high-risk groups:

| Field | Phase 1 finding | Implemented strategy |
|---|---|---|
| `Product Code` | 50,000 unique values; every row is a singleton | Exclude by default; admit only if provenance proves a repeated stable entity key |
| `Product Specification` | 50,000 unique sentence-like values | Exclude raw text; require semantic validation and controlled structured extraction before reconsideration |
| `Customer Name` | 40,013 unique values; 33,994 singleton rows | Exclude raw identity; require privacy approval and strict as-of aggregation for any future use |
| `Customer Location` | 25,147 unique values; 16,194 singleton rows | Exclude raw field; consider only an approved coarse geography known at inward time |

An optional `FrequencyEncoder` is implemented for a future approved repeated-entity use case. It learns value frequencies from the training data only, maps unseen inference values to zero, and exposes stable numeric feature names. It is deliberately not wired into the default preprocessing graph because the current identifiers are either unique, unvalidated, or privacy-sensitive.

If a frequency or target encoding is used in a future phase, it must be fit only on the relevant training window. Target encoding additionally requires cross-fitting and strict temporal controls; the current module does not silently perform target encoding.

## 6. Date transformation

`DateFeatureExtractor` transforms `Inward Date` into ten deterministic, prediction-time-valid features:

| Feature family | Derived values |
|---|---|
| Calendar parts | Year, month, day, day of week, day of year, ISO week of year |
| Cyclical month | Sine and cosine of month position |
| Cyclical weekday | Sine and cosine of weekday position |

The transformer parses dates with strict failure behavior. Missing or invalid inward dates raise an error instead of being silently imputed. This is appropriate because the inward timestamp defines the prediction event and cannot be safely invented.

No feature is derived from `Dispatch Date`. Dispatch month, weekday, duration, elapsed time, post-inward flags, and dispatch-based rolling statistics are prohibited.

## 7. Text and specification handling

`Product Specification` is not included in the default pipeline. The audit found unique generic sentence-like values and no documented semantic structure. Treating these strings as categorical values would memorize rows, while adding text vectorization before provenance validation could learn synthetic source artifacts.

The field may be reconsidered only after the data owner confirms that it is a stable product description known at inward receipt. Any later text representation should be fitted inside the training pipeline, evaluated on unseen values, and checked for identifiers or post-event tokens.

Hardware specification fields such as RAM, ROM, SSD, and processor are handled as categorical values in this phase. Numeric capacity normalization can be added later if the business semantics and units are confirmed, but it is not applied blindly here.

## 8. Training and inference integrity

The implementation provides these integrity properties:

| Integrity requirement | Implementation |
|---|---|
| Same transformations in training and inference | One fitted `ColumnTransformer` graph is used for both `fit_transform` and `transform` |
| No hidden manual preprocessing | Raw columns are passed through `build_feature_frame()` and then the pipeline |
| Unknown categorical values | `OneHotEncoder(handle_unknown="ignore")` keeps feature width stable |
| Training-only numeric statistics | Median imputer is fitted during pipeline training |
| Stable date feature schema | `DateFeatureExtractor.get_feature_names_out()` returns a fixed ten-feature schema |
| Excluded-field protection | `validate_raw_features()` rejects dispatch, target, identifier, customer, and unresolved quantity fields |
| Missingness preservation | Constant categorical token retains structural not-applicable states |
| Reproducible feature order | ColumnTransformer uses explicit ordered column lists and exposes feature names |

The test suite in `tests/test_preprocessing.py` verifies four behaviors: excluded-column rejection, deterministic date transformation, missing/unknown categorical handling, and identical training/inference feature width and order. The tests passed in the sandbox environment:

```text
4 passed in 4.10s
```

## 9. Outlier and transformation policy

The Phase 1 and Phase 4 audits found no IQR outliers in `Price` and no meaningful skewness. The target is bounded from 1 to 60 days and is nearly uniform. Therefore, the preprocessing layer does not remove or clip rows, transform the target, or apply robust scaling by default.

If future operational data introduces genuine data-entry outliers, those records should be handled through a documented validation policy rather than an automatic statistical rule. The pipeline should distinguish an invalid business value from a rare but valid fulfillment duration.

## 10. Known limitations and future extensions

The current architecture is intentionally conservative. It does not use customer history, product history, target encoding, or aggregate operational features because the dataset lacks a stable repeated product key and event-time history. It also cannot confirm that `Price`, `Region`, `Customer Location`, or `Quantity Sold` were available at inward receipt; those fields remain subject to business and governance confirmation.

A future extension may add a time-aware historical transformer that computes features strictly from prior records. Such a transformer must be fitted inside the training split and tested so that adding a future row cannot change a past row’s feature value. It should also handle unseen entities explicitly and record the as-of timestamp used for every aggregate.

## 11. Quality gate

| Requirement | Status |
|---|---:|
| No leakage | Complete by default contract; dispatch and target-derived fields rejected |
| Reproducible transformations | Complete; pipeline-based implementation |
| Missing values handled | Complete; median numeric imputation and explicit categorical missing token |
| High-cardinality strategy implemented | Complete; default exclusion plus optional training-only frequency encoder |
| Date handling implemented | Complete; strict inward-date transformer with fixed schema |
| Training/inference consistency verified | Complete; four tests passed |
| Models trained | **Not performed** |
| Hyperparameter optimization performed | **Not performed** |

> **PHASE 5 COMPLETE**

## References

[1]: `phase_1_data_audit.md` "Phase 1 data audit and data-quality report"
[2]: `phase_2_problem_definition.md` "Phase 2 business problem and target definition"
[3]: `phase_3_leakage_audit.md` "Phase 3 leakage and prediction-time audit"
[4]: `phase_4_eda.md` "Phase 4 exploratory data analysis"
[5]: `../mobilesales.csv` "Supplied mobile-sales dataset"
