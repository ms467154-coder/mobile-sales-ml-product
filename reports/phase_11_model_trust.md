# Phase 11 — Explainability, Robustness & Model Trust

**Project:** Mobile Sales — Need to work  
**Candidate under review:** Compact Ridge and compact HistGradientBoosting  
**Operational benchmark:** Target-only historical median  
**Target:** Provisional `Dispatch Duration = Dispatch Date − Inward Date`  
**Prediction point:** At inward receipt, before dispatch

## 1. Trust conclusion

The available learned candidates are **not trustworthy enough to promote as operational prediction models**. This conclusion is not caused by unexplained complexity; it is caused by the combination of near-zero feature importance, negligible out-of-time improvement, center-collapse predictions, weak segment separation, and an unresolved target-semantic contract.

Compact Ridge is easier to explain than HistGradientBoosting, but its final holdout MAE advantage over the median baseline was only 0.0011 days. HistGradientBoosting was not more reliable despite its nonlinear capacity. The target-only median remains the safest benchmark.

## 2. Explainability methods

Two complementary explanation methods were applied on the final evaluation period:

1. **Permutation importance** measured the increase in holdout MAE when a raw valid feature was permuted. This tests whether the feature changes out-of-time predictive performance.
2. **Ridge coefficient inspection** examined the direction and magnitude of the standardized linear model’s encoded coefficients. This helps identify directional behavior but is not treated as causal evidence.

A single explanation method would be misleading here. Permutation importance is directly aligned with predictive value, while coefficients expose directional dependence. Neither method establishes causation.

### Permutation importance

| Model | Feature | Holdout MAE increase after permutation |
|---|---|---:|
| HistGradientBoosting | Price | +0.00159 days |
| HistGradientBoosting | Region | +0.00055 days |
| HistGradientBoosting | Brand | +0.00031 days |
| HistGradientBoosting | Inward Date | 0.00000 days |
| HistGradientBoosting | Product | −0.00017 days |
| Ridge | Brand | +0.00324 days |
| Ridge | Region | +0.00100 days |
| Ridge | Price | +0.00028 days |
| Ridge | Inward Date | 0.00000 days |
| Ridge | Product | −0.00162 days |

All importance values are close to zero. The negative Product values mean that permuting Product slightly improved the measured holdout score, which is evidence against useful product signal rather than evidence that Product should be used causally.

### Ridge coefficient behavior

The coefficient audit found small directional effects after one-hot encoding and standardization, but no coherent business mechanism. In particular, category coefficients should not be interpreted as operational causes because the feature fields are not fully documented as available at inward receipt and the target semantics remain provisional.

The coefficient table is stored in `reports/phase11_ridge_coefficients.csv` for full inspection. The trust decision is based on out-of-time permutation behavior and segment stability, not on selecting the largest coefficient.

## 3. Feature behavior and suspicious dependencies

The model’s predictions are tightly compressed around the center of the target distribution. On the holdout, Ridge predictions ranged from approximately **29.66 to 31.59 days**, while actual durations ranged from **1 to 60 days**. This explains the extreme-error pattern: the model has insufficient information to distinguish fast dispatches from long delays.

Price has the largest permutation importance for HistGradientBoosting, but its MAE increase is only 0.00159 days. Ridge assigns a smaller price importance of 0.00028 days. This is not a useful nonlinear price effect; it is a near-zero dependency that should not drive business decisions.

Region and brand show similarly small importance. Product has zero or negative importance in both models, consistent with Phase 8 ablation results. Inward Date has zero permutation importance in both models, consistent with near-zero daily and weekly target autocorrelation.

No meaningful interaction was found. Phase 8 and Phase 9 controlled experiments showed that product/brand/region combinations, price transformations, calendar features, hardware categories, specification parsing, and customer prior counts did not produce stable improvements.

## 4. Temporal robustness

The candidate models were evaluated across multiple chronological windows before the final holdout.

| Model | Mean pre-test MAE | MAE standard deviation | Mean R² | Windows beating median |
|---|---:|---:|---:|---:|
| Median | 14.9349 | 0.1045 | −0.0007 | Benchmark |
| Ridge | 14.9383 | 0.1049 | −0.0010 | 0/3 |
| HistGradientBoosting | 14.9407 | 0.0997 | −0.0008 | 0/3 |

The median, Ridge, and HistGradientBoosting scores move together. There is no progressive degradation that would identify a clear model-drift problem; instead, all candidates remain near the same weak-signal level.

On the final holdout, monthly MAE stayed approximately within the 14.86–15.21 day range. Signed error changed direction across months, including a move from overprediction to underprediction in March 2025, but overall MAE remained flat. The temporal behavior is therefore not a stable seasonal opportunity.

## 5. Segment robustness

### Product

| Product | Rows | MAE | Signed error |
|---|---:|---:|---:|
| Laptop | 5,036 | 15.1247 | +0.4251 |
| Mobile Phone | 5,007 | 15.0445 | −0.2075 |

The product-level MAE difference is only 0.0802 days, with opposite small biases.

### Region

| Region | MAE | Signed error |
|---|---:|---:|
| North | 15.2490 | +0.9152 |
| West | 15.1702 | +0.1571 |
| East | 15.1105 | −0.3970 |
| Central | 14.9553 | −0.1697 |
| South | 14.9411 | +0.0840 |

North is the weakest segment and South is the strongest, but the range is still small compared with the target’s approximately 17.3-day standard deviation. These differences do not establish reliable regional signal.

### Brand

Brand MAE is highest for Oppo at 16.6287 days and lowest for Sony at 14.2154 days. The largest signed biases include overprediction for Apple and Oppo and underprediction for Acer and Nokia. These descriptive differences are not stable evidence of brand-dependent fulfillment behavior; raw product and customer identifiers remain excluded.

### Hardware categories

RAM-segment MAE ranges from approximately 14.95 to 15.25 days. The actual mean duration ranges from roughly 30.07 to 30.93 days, while predictions remain near 30.6 days for every RAM group. The model does not meaningfully distinguish hardware segments.

The corresponding ROM, SSD, and processor tables are stored under `reports/phase11_segment_*.csv`. Their behavior is similar: group means differ modestly, predictions collapse toward the center, and no category provides a stable practical advantage.

### Price ranges

Price-quintile MAE ranges from approximately 14.86 to 15.28 days. The middle price band performs slightly better, but the difference is far below the half-day practical threshold and does not match a stable monotonic relationship.

## 6. Train-test distribution shift

The final evaluation period begins on 2024-10-25. The raw valid feature distributions were compared between training and holdout.

| Feature | Shift finding |
|---|---|
| Product | Same 2 categories; total variation distance 0.0014 |
| Brand | Same 20 categories; total variation distance 0.0287 |
| Region | Same 5 categories; total variation distance 0.0139 |
| Price | Train mean 102,670; holdout mean 102,527; KS statistic 0.0087, p=0.582 |
| Inward Date | Expected chronological support shift; holdout contains later dates by design |

There are no new Product, Brand, or Region categories in the holdout. Price distribution shift is negligible: the mean changes by approximately 0.14%, and the KS test does not indicate a meaningful difference. Brand and region mix changes are small.

The date field naturally contains new future dates in the holdout. This is not a category leakage problem because the preprocessing contract extracts calendar features from the timestamp rather than one-hot encoding each date. The time shift is a required part of the evaluation design.

The evidence does not indicate that distribution shift explains the weak model result. The stronger explanation remains lack of predictive information in the supplied fields.

## 7. Failure modes and non-trust conditions

The model should not be trusted in the following situations:

| Failure mode | Evidence | Trust response |
|---|---|---|
| Extreme duration | Actual 1-day and 60-day cases produce approximately 29–31 day errors | Use the median only as a benchmark; do not promise individual turnaround times |
| Operational regime change | Fulfillment center, backlog, carrier, supplier, inventory, and staffing are absent | Do not extrapolate to new operating processes |
| Target ambiguity | README does not define the meaning of inward or dispatch dates | Confirm the business target before deployment |
| Feature availability ambiguity | Price, quantity, region, and customer fields are not documented as known at inward receipt | Require data-owner confirmation |
| New entity or category | Raw identifiers are high-cardinality and mostly singleton | Do not enable raw ID encoding or memorization |
| Missing operational context | Hardware and product fields do not explain dispatch delay | Avoid interpreting category predictions as causal |
| Distribution drift | Brand/region mix may change despite small current shift | Monitor distributions before any future use |

The learned model’s center-collapse behavior makes it unsuitable for service-level commitments, staffing decisions, escalation decisions, or individual-order promises.

## 8. Trust recommendation

No learned model should be promoted. If a numerical benchmark is required for a dashboard or feasibility test, use the training-period median and report its historical MAE and wide error distribution. If a research model must remain available, compact Ridge is preferable to HistGradientBoosting because it is simpler to inspect, but it must be clearly labeled as experimental and non-actionable.

A trustworthy future model requires a confirmed target and operational features that are observable at inward receipt. The next data collection priority is fulfillment center, stock availability, supplier, carrier, channel, order priority, backlog, staffing, stockout state, promotions, and service-level commitment.

## 9. Quality gate

| Requirement | Status |
|---|---:|
| Explainability completed | Complete: permutation importance and Ridge coefficient audit |
| Temporal stability checked | Complete across three chronological windows and final holdout months |
| Segment stability checked | Complete for product, brand, region, price, and hardware categories |
| Distribution shift investigated | Complete for raw valid features |
| Failure modes documented | Complete, including extreme-duration center collapse and target ambiguity |
| Learned model trusted for deployment | **No** |
| Operational benchmark | Training-period median |

> **PHASE 11 COMPLETE**

## Reproducibility artifacts

```text
run_trust_analysis.py
reports/phase11_trust_analysis.json
reports/phase11_permutation_importance.csv
reports/phase11_ridge_coefficients.csv
reports/phase11_distribution_shift.csv
reports/phase11_segment_*.csv
reports/phase11_temporal_*.csv
```

## References

[1]: `phase_8_signal_validation.md` "Phase 8 signal-validation report"
[2]: `phase_9_feature_refinement.md` "Phase 9 feature-refinement report"
[3]: `phase_10_final_model_evaluation.md` "Phase 10 final-model evaluation report"
[4]: `../mobilesales.csv` "Supplied mobile-sales dataset"
