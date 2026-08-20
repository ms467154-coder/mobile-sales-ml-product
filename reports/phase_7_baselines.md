# Phase 7 — Baseline Modeling

**Project:** Mobile Sales — Need to work  
**Target:** Provisional `Dispatch Duration = Dispatch Date − Inward Date`  
**Prediction point:** At inward receipt, before dispatch  
**Scope:** Honest baseline comparison. No broad hyperparameter optimization was performed.

## 1. Executive summary

A small, meaningful baseline model matrix was evaluated using the chronological validation strategy established in Phase 3. The experiment compared a target-only median baseline, three model families, and three feature contracts: compact raw-valid features, the full Phase 5 preprocessed feature set, and the Phase 6 engineered feature set.

The target-only median baseline achieved validation MAE **15.0858 days**. The best observed result was compact raw-valid features with Ridge regression at **15.0847 days**, an improvement of only 0.0011 days over the target median. This difference is operationally negligible. The full preprocessed and engineered feature sets did not produce a meaningful improvement, and all R² values were approximately zero or negative.

The baseline evidence supports a conservative conclusion: the current dataset does not expose a strong predictive signal for dispatch duration. The next phase should not begin with massive optimization. It should first confirm the target semantics and obtain operational variables that are absent from the dataset.

## 2. Validation strategy

The split preserves chronological order by `Inward Date`. The first 80% of unique inward dates form the training period, and the final 20% form validation.

| Split property | Value |
|---|---:|
| Training rows | 39,957 |
| Validation rows | 10,043 |
| Training maximum inward date | 2024-10-24 |
| Validation minimum inward date | 2024-10-25 |
| Split cutoff | 2024-10-24 |
| Random split used as sole evaluation | No |

All preprocessing and feature-engineering statistics were fitted on training data only. Validation rows were transformed using the fitted training objects. `Dispatch Date` was used only to construct the target and was excluded from all predictors.

## 3. Models and configurations

The models were chosen to provide complementary but limited baselines rather than an exhaustive algorithm sweep.

| Model | Configuration | Purpose |
|---|---|---|
| `DummyRegressor` | Median strategy | Honest target-only benchmark |
| `Ridge` | `alpha=10.0` | Regularized linear baseline; numeric features standardized |
| `RandomForestRegressor` | 100 trees, max depth 12, minimum leaf size 8, random state 42 | Nonlinear tree baseline with conservative capacity |
| `HistGradientBoostingRegressor` | 150 iterations, 31 leaf nodes, learning rate 0.08, L2 regularization 1.0, random state 42 | Stronger nonlinear baseline without an optimization sweep |

These are fixed configurations. They were not tuned against the validation set.

## 4. Feature contracts

### Compact raw-valid features

The compact raw-valid set contains `Product`, `Brand`, `Region`, `Price`, and `Inward Date`. It excludes all post-dispatch, target, unresolved high-cardinality, and unapproved customer fields. A dynamic pipeline handles missing categorical values, unknown categories, and date values.

### Full preprocessed features

The full Phase 5 set contains `Price`, the approved low-cardinality product attributes, and deterministic features derived from `Inward Date`. It uses the reusable `src/preprocessing` pipeline with explicit missingness preservation and unknown-category handling.

### Engineered features

The Phase 6 set adds training-fitted price transformations, price bands, product- and brand-relative prices, training-only category frequencies, calendar features, and a small number of semantic interactions. No dispatch-derived feature, target encoding, raw high-cardinality identifier, or raw customer field is included.

## 5. Model comparison results

| Feature set | Model | MAE | RMSE | R² | Median AE | P90 AE |
|---|---|---:|---:|---:|---:|---:|
| Target-only | Median dummy | 15.0858 | 17.3923 | −0.0008 | 15.0000 | 27.0000 |
| Compact raw-valid | Ridge | **15.0847** | **17.3889** | −0.0004 | 15.1849 | 27.0228 |
| Compact raw-valid | Random Forest | 15.0906 | 17.3911 | −0.0007 | 15.3704 | 27.1148 |
| Compact raw-valid | HistGradientBoosting | 15.0880 | 17.3890 | −0.0004 | 15.3157 | **26.9867** |
| Full preprocessed | Ridge | 15.0929 | 17.4012 | −0.0019 | 15.1644 | 27.0349 |
| Full preprocessed | Random Forest | 15.1177 | 17.4322 | −0.0054 | 15.1992 | 26.9359 |
| Full preprocessed | HistGradientBoosting | 15.0871 | 17.3911 | −0.0007 | 15.3067 | 27.0530 |
| Engineered | Ridge | 15.0987 | 17.4137 | −0.0033 | 15.1916 | 26.9630 |
| Engineered | Random Forest | 15.0955 | 17.4040 | −0.0022 | 15.1481 | 27.0063 |
| Engineered | HistGradientBoosting | 15.0932 | 17.3928 | −0.0009 | 15.3784 | 27.0354 |

The differences are extremely small. The best MAE, compact raw-valid Ridge, improves over the target-only median by approximately 0.0011 days, or about 0.03 hours. The strongest P90 result belongs to compact raw-valid HistGradientBoosting at 26.9867 days, but the difference from the target-only P90 of 27.0000 days is also negligible.

## 6. Observations

The validation R² values cluster around zero or below zero. This means that the candidate features explain essentially none of the out-of-time variation beyond the target baseline. The result is consistent with Phase 4 EDA, which found near-zero price correlations, nearly identical product means, modest category differences, and weak temporal variation.

The full Phase 5 feature contract does not improve the compact feature set. This suggests that the additional hardware categories are not carrying measurable fulfillment-duration signal in the current data, or that their effects are too weak to estimate robustly.

The engineered feature set also does not improve the baseline. Log price, price-relative measures, price bands, calendar expansions, low-order interactions, and training-only frequency features should not be assumed useful merely because they are plausible. Their measured value is negligible in this validation window.

The Random Forest is not a strong candidate for immediate optimization. It is no better than the median baseline and performs worse than Ridge on compact raw-valid features. HistGradientBoosting is competitive but still effectively tied with the baseline. The current evidence does not support spending compute on a large model search.

## 7. Best candidates for limited next-step analysis

If the target and row semantics are confirmed, the following candidates are reasonable for a limited, pre-registered follow-up:

1. **Median target baseline** should remain the primary benchmark.
2. **Compact raw-valid Ridge** is the best observed MAE candidate, but its improvement is too small to claim practical value.
3. **Compact raw-valid HistGradientBoosting** is the best candidate for the P90 metric, again with negligible improvement.
4. **Full preprocessed HistGradientBoosting** may be retained as a robustness comparison because it is competitive without feature explosion.

Any further comparison should use multiple chronological windows, not repeated tuning on the same validation period. Candidate selection should require stable MAE improvement, no deterioration in P90 error, and consistent segment behavior.

## 8. What should not happen next

The project should not perform an unrestricted hyperparameter sweep, add raw customer or identifier fields, use `Dispatch Date` or derived durations as features, or interpret a sub-hour validation difference as business value. It should also not replace the regression target with arbitrary duration classes simply because classification metrics appear more favorable.

The dominant limitation is data signal, not model capacity. The next data acquisition priority should be operational variables such as warehouse or fulfillment center, inventory availability, supplier, carrier, channel, order priority, backlog, staffing, and promotion or demand context.

## 9. Reproducibility artifacts

The experiment script and results were saved as:

```text
run_baselines.py
reports/phase7_baseline_comparison.csv
reports/phase7_baseline_results.json
```

The script uses fixed random seeds, explicit model configurations, chronological splitting, training-only preprocessing fits, and deterministic feature contracts.

## 10. Quality gate

| Requirement | Status |
|---|---:|
| Correct chronological validation strategy used | Complete |
| Multiple meaningful baselines evaluated | Complete |
| Metrics recorded | Complete: MAE, RMSE, R², median AE, P90 AE |
| Results reproducible | Complete: fixed split, seeds, and configurations recorded |
| Strong candidates identified | Complete: compact Ridge and compact HistGradientBoosting are closest candidates, but neither is materially better than the median baseline |
| Broad optimization performed | **Not performed** |

> **PHASE 7 COMPLETE**

## References

[1]: `phase_2_problem_definition.md` "Phase 2 business problem and target definition"
[2]: `phase_3_leakage_audit.md` "Phase 3 leakage and prediction-time audit"
[3]: `phase_5_preprocessing.md` "Phase 5 preprocessing architecture"
[4]: `phase_6_feature_engineering.md` "Phase 6 feature-engineering report"
[5]: `../mobilesales.csv` "Supplied mobile-sales dataset"
