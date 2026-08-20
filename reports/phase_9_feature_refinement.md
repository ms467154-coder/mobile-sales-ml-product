# Phase 9 — Feature & Signal Refinement

**Project:** Mobile Sales — Need to work  
**Target:** Provisional `Dispatch Duration = Dispatch Date − Inward Date`  
**Prediction point:** At inward receipt, before dispatch  
**Scope:** Evidence-driven feature refinement after Phase 8 Outcome C. No blind feature generation and no broad optimization were performed.

## 1. Executive summary

Phase 8 found no meaningful signal: no feature group improved MAE consistently across three chronological windows, and the best models remained equivalent to a target-only median baseline. Phase 9 therefore focused on validating whether apparently promising high-cardinality fields contained recoverable structure rather than adding more arbitrary transformations.

The refinement work produced three conclusions:

1. `Product Specification` is not a meaningful structured hardware field in this dataset. It contains generic sentence-like text, and a conservative parser found no RAM, storage, processor, or generation tokens across the 50,000 rows.
2. A strict, training-only customer prior-count feature is technically leakage-safe but not predictively stable. It improved MAE slightly in Window B and worsened it in Window C; the customer field remains excluded.
3. The refined structured-specification feature set did not improve the Phase 7 compact baseline in any window. The final candidate feature contract remains conservative, with the target-only median as the deployment benchmark and compact raw-valid features retained only for monitored research comparison.

The Phase 9 test suite passed:

```text
8 passed in 4.16s
```

## 2. Evidence classification from Phase 8

| Feature group | Evidence classification | Phase 8 evidence | Phase 9 decision |
|---|---|---|---|
| Product + Brand + Region | Neutral | MAE worsened in all three ablation windows by 0.0003–0.0037 days | Do not claim predictive value; keep only as low-cost monitored candidates |
| Price | Neutral | Improved MAE only in Windows B and C by 0.0013 and 0.0002 days; worsened in A | Do not retain as a proven signal |
| Inward Date features | Harmful/neutral | Worsened MAE in all three windows by 0.0032–0.0098 days | Remove from refined candidate unless business monitoring requires calendar covariates |
| Product specifications | Neutral/harmful | Worsened MAE in A and C; tiny improvement in B | Do not retain as a proven signal |
| Phase 6 engineered features | Harmful in current data | Worsened MAE in all windows by 0.0147–0.0471 days | Remove from the refined feature set |
| Raw unique identifiers | Suspicious | 50,000 unique product codes/specifications | Exclude; no one-hot encoding or raw text memorization |
| Customer identity | Suspicious | 40,013 unique names; approximately 85.0% of customer groups are singletons | Exclude raw identity; evaluate only strict as-of aggregates |

No feature group met the Phase 8 practical rule of consistent improvement of at least 0.5 calendar days with no material tail-error deterioration.

## 3. Product Specification investigation

### Observed content

The first ten `Product Specification` values are generic English sentences such as:

```text
Site candidate activity company there bit inside soldier decide information.
Beat put care fight affect address his.
Energy special low seven place audience.
Friend record hard contain minute we role sea most.
```

These values do not resemble mobile hardware specifications, stable product descriptions, or controlled text fields. They also have extremely high cardinality: the Phase 1 audit found 50,000 unique values for 50,000 rows.

### Conservative parser

A reusable parser was implemented at:

```text
src/features/specification.py
```

It extracts only explicit, defensible tokens for RAM, storage, processor family, generation, and brand-like vocabulary. It does not treat the raw string as a categorical feature and returns missing values when tokens are not present.

| Parsed field | Non-missing coverage | Cardinality | Decision |
|---|---:|---:|---|
| `spec_ram_gb` | 0.0% | 1 | Remove; no evidence |
| `spec_storage_raw` | 0.0% | 1 | Remove; no evidence |
| `spec_storage_unit` | 100.0% placeholder only | 1 | Remove; no information |
| `spec_processor_family` | 100.0% placeholder only | 1 | Remove; no information |
| `spec_generation` | 0.0% | 1 | Remove; no evidence |
| `spec_brand_token` | 100.0% including missing token | 3 | Do not retain; likely incidental text token |

The parser behaves correctly on a controlled structured string such as `Intel Core i7, 16GB RAM, 512GB SSD, 12th Gen`, but it extracts no meaningful hardware attributes from the supplied dataset. This distinction is important: the parser is reusable, but the current column provides no evidence that it should enter the model.

### Decision

`Product Specification` remains excluded. The raw unique string is suspicious and the parsed fields are either empty or unsupported. A future data refresh should use a documented specification schema rather than attempting further NLP over the current values.

## 4. High-cardinality fields

### Product Code

`Product Code` is unique for every row. Frequency encoding therefore yields a constant singleton frequency and cannot provide generalizable entity signal. Target encoding would be invalid without repeated entities, cross-fitting, and a clear as-of contract. The field remains excluded.

### Product Specification

The field is both unique and semantically implausible. Raw one-hot encoding would memorize rows, while text vectorization would risk learning generated-text artifacts. It remains excluded after structured parsing failed to recover valid hardware fields.

### Customer Name

There are 40,013 unique customer names. Approximately 32.0% of rows belong to a customer with more than one row, but approximately 85.0% of customer groups are singletons. This cardinality is too high for raw categorical encoding and is not sufficient evidence that customer identity is a reliable operational feature.

### Customer Location

The field is high-cardinality and not validated as a stable geography or known-at-inward operational attribute. It remains excluded. A future version may use an approved coarse geography only after semantic and privacy review.

## 5. Leakage-safe customer-history experiment

The existing `AsOfEntityCounter` was used to construct `Customer Name` prior-event counts. For each validation row, the counter was fitted on training rows only and counted strictly earlier training events. Same-timestamp events were excluded from one another, and no target value was read.

| Window | Phase 7 compact Ridge MAE | Refined spec, no customer history | Refined spec + customer prior count |
|---|---:|---:|---:|
| A | 14.8763 | 14.8806 | 14.8785 |
| B | 15.0609 | 15.0625 | 15.0588 |
| C | 15.0846 | 15.0869 | 15.0910 |

The customer prior count shows a small improvement in Window B but worsens Window C and never provides a practical improvement. It is therefore not retained. The implementation remains available as a guarded future extension for an approved stable customer ID and a larger event-history dataset.

No customer quantity, historical average quantity, historical duration, or target encoding was created. Such features would require a stable entity identifier, documented event-time availability, and strict training-window aggregation.

## 6. Refined versus Phase 7 comparison

The same Ridge configuration and the same three chronological windows were used for the comparison.

| Window | Phase 7 compact baseline MAE | Refined structured specification MAE | Refined + customer history MAE |
|---|---:|---:|---:|
| A | 14.8763 | 14.8806 | 14.8785 |
| B | 15.0609 | 15.0625 | 15.0588 |
| C | 15.0846 | 15.0869 | 15.0910 |

The structured-specification refinement is worse than the compact baseline in every window. Adding the leakage-safe customer prior count does not produce stable improvement. All R² values remain approximately zero or negative, and all P90 errors remain close to 27 days.

This directly answers the Phase 9 comparison requirement: the refined feature set does not improve the Phase 7 baseline or the Phase 8 best candidate under identical temporal evaluation.

## 7. Stable and removed feature decisions

### Retain as the conservative research contract

The minimal candidate contract contains only fields that are known to be low-cardinality or directly numeric and that have not introduced leakage:

```text
Product
Brand
Region
Price
Inward Date
```

These fields are retained because they are simple, interpretable, and cheap to monitor—not because Phase 8 demonstrated meaningful predictive value. The target-only median remains the primary benchmark.

### Remove from the refined candidate set

The following are removed or excluded:

- `Dispatch Date` and every dispatch-derived feature.
- `Dispatch Duration` and all target-derived statistics.
- `Product Code` because it is a unique identifier.
- Raw `Product Specification` because it is unique and semantically implausible.
- Parsed specification fields because the current column contains no meaningful hardware tokens.
- Raw `Customer Name` and `Customer Location` because of cardinality, privacy, and generalization risk.
- Customer prior counts because their effect is not stable across windows.
- Broad Phase 6 engineered features because they were consistently worse in Phase 8.

### Suspicious features requiring business confirmation

`Quantity Sold`, `Price`, `Region`, and the customer fields may or may not be available at inward receipt. Their use requires confirmation from the data owner. This report does not silently resolve that uncertainty.

## 8. Temporal validity and leakage controls

The refinement experiments preserve the Phase 8 temporal design. All model fits use chronological windows A, B, and C. Specification parser behavior is deterministic and target-independent. Customer prior counts are fit on training rows only and use strictly earlier timestamps. No validation or future target is used to calculate a feature statistic.

The parser and as-of counter are implemented as reusable modules rather than hidden preprocessing code. The combined unit tests for preprocessing, feature engineering, and specification parsing passed with 8 tests.

## 9. Final Phase 9 decision

No refined feature set has earned promotion into a production candidate. The strongest defensible baseline remains the target-only median, with the compact raw-valid Ridge retained only as a transparent research comparison. The current evidence continues to support the Phase 8 Outcome C classification: the dataset lacks sufficient verified signal for useful dispatch-duration prediction.

Further feature work should stop until either the target semantics are confirmed or operational data is added. The most valuable new fields are fulfillment center, inventory availability, supplier, carrier, channel, priority, backlog, staffing, stockout indicators, and service-level commitments. Stable repeated product and customer identifiers would be required before historical aggregates are reconsidered.

## 10. Quality gate

| Requirement | Status |
|---|---:|
| Every retained feature has justification | Complete; retained for interpretability and monitoring, not claimed as proven signal |
| Feature stability checked | Complete across the same three chronological windows |
| High-cardinality strategy validated | Complete; unique product code and malformed specification excluded; customer history tested as-of |
| Leakage-safe aggregates verified | Complete; strict prior-only customer counter tested |
| No feature retained only for training performance | Complete |
| Temporal validation remains valid | Complete; no random shuffle and training-only fitting |
| Specification parsing implemented | Complete in `src/features/specification.py` |
| Tests passed | Complete: **8 passed in 4.16s** |

> **PHASE 9 COMPLETE**

## References

[1]: `phase_8_signal_validation.md` "Phase 8 signal-validation report"
[2]: `phase_7_baselines.md` "Phase 7 baseline-modeling report"
[3]: `phase_6_feature_engineering.md` "Phase 6 feature-engineering report"
[4]: `../mobilesales.csv` "Supplied mobile-sales dataset"
