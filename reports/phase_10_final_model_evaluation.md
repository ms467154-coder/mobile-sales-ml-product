# Phase 10 — Final Model Selection & Robust Evaluation

**Project:** Mobile Sales — Need to work  
**Target:** Provisional `Dispatch Duration = Dispatch Date − Inward Date`  
**Prediction point:** At inward receipt, before dispatch  
**Primary metric:** MAE in calendar days  
**Scope:** Final comparison of surviving candidates. No broad model search was introduced.

## 1. Executive decision

The final defensible operational predictor is the **target-only historical median baseline**, not a learned ML model. Compact Ridge is the closest learned candidate, but its apparent holdout advantage is only **0.0011 days**, which is far below the pre-established practical threshold of 0.5 calendar days and is not stable across chronological validation windows.

The model does **not** provide meaningful predictive value over simply predicting the historical median. It collapses toward the center of the 1–60 day target range and fails on the operational extremes of 1-day and 60-day cases. The correct decision is to stop model promotion and collect better operational data or revisit the target semantics.

## 2. Candidate models

Only candidates that survived Phases 7–9 were evaluated:

| Candidate | Feature contract | Status entering Phase 10 |
|---|---|---|
| Median baseline | Training-period median of dispatch duration | Required benchmark |
| Ridge | Compact raw-valid `Product`, `Brand`, `Region`, `Price`, `Inward Date` | Strongest learned MAE candidate from Phase 7 |
| HistGradientBoosting | Same compact raw-valid feature contract | Competitive nonlinear comparison from Phases 7–8 |

The Phase 9 structured-specification and customer-history variants were not promoted because they failed to improve consistently across windows. No new algorithm family, identifier encoding, or broad hyperparameter search was introduced.

## 3. Chronological validation design

Three validation windows were defined strictly before the final evaluation period:

| Window | Training end | Validation period | Training rows | Evaluation rows |
|---|---|---|---:|---:|
| V1 | 2023-09-30 | 2023-10-01 to 2024-02-29 | 13,268 | 10,508 |
| V2 | 2024-02-29 | 2024-03-01 to 2024-06-30 | 23,776 | 8,279 |
| V3 | 2024-06-30 | 2024-07-01 to 2024-10-24 | 32,055 | 7,902 |

Rows were never randomly shuffled. Preprocessing was fitted on each training period only. Dispatch fields were used only to construct the label.

### Validation results

| Window | Model | MAE | RMSE | R² | Median AE | P90 AE |
|---|---|---:|---:|---:|---:|---:|
| V1 | Median | 14.8761 | 17.2094 | −0.0002 | 15.0000 | 27.0000 |
| V1 | Ridge | 14.8791 | 17.2190 | −0.0013 | 14.8577 | 26.8267 |
| V1 | HistGradientBoosting | 14.8814 | 17.2140 | −0.0007 | 14.7960 | 26.7960 |
| V2 | Median | 14.8731 | 17.2279 | −0.0003 | 15.0000 | 27.0000 |
| V2 | Ridge | 14.8763 | 17.2281 | −0.0003 | 14.8774 | 26.9377 |
| V2 | HistGradientBoosting | 14.8849 | 17.2337 | −0.0009 | 14.7373 | 26.8285 |
| V3 | Median | 15.0556 | 17.3969 | −0.0015 | 15.0000 | 27.0000 |
| V3 | Ridge | 15.0594 | 17.3962 | −0.0014 | 15.3119 | 27.0959 |
| V3 | HistGradientBoosting | 15.0558 | 17.3893 | −0.0006 | 15.3992 | 27.2146 |

### Stability summary

| Model | Mean MAE | MAE std. dev. | Mean RMSE | Mean R² | Windows beating median on MAE |
|---|---:|---:|---:|---:|---:|
| Median | 14.9349 | 0.1045 | 17.2781 | −0.0007 | Benchmark |
| Ridge | 14.9383 | 0.1049 | 17.2811 | −0.0010 | 0/3 |
| HistGradientBoosting | 14.9407 | 0.0997 | 17.2790 | −0.0008 | 0/3 |

Neither learned candidate beats the median baseline in any pre-test window. The small RMSE differences do not indicate practical predictive signal.

## 4. Final holdout evaluation

The final holdout begins at **2024-10-25** and ends at **2025-03-20**. Training uses 39,957 earlier rows, and the holdout contains 10,043 rows.

This period is treated as the final holdout for this Phase 10 evaluation. However, it was inspected in earlier project phases during the prior Phase 7/8 experiments, so it cannot honestly be described as globally untouched across the entire project history. The report preserves this limitation rather than overstating evaluation independence.

| Model | MAE | RMSE | R² | Median AE | P90 AE |
|---|---:|---:|---:|---:|---:|
| **Median baseline** | 15.0858 | 17.3923 | −0.0008 | 15.0000 | 27.0000 |
| Ridge | **15.0847** | **17.3889** | −0.0004 | 15.1849 | 27.0228 |
| HistGradientBoosting | 15.0880 | 17.3890 | −0.0004 | 15.3157 | **26.9867** |

### Baseline comparison

Relative to the median baseline, Ridge improves MAE by only **0.0011 days**, RMSE by **0.0034**, and R² by **0.0004**. This is approximately **0.03 hours**, or about **1.6 minutes**, of MAE difference. HistGradientBoosting worsens MAE by 0.0022 days while improving P90 absolute error by only 0.0133 days.

These differences are negligible relative to the target’s approximately 17.3-day standard deviation, the 15-day median absolute error, and the operational meaning of half-day service resolution. The learned models do not provide meaningful value over the baseline.

## 5. Error analysis

### Largest errors

The largest Ridge errors are approximately 30 days and occur when the actual duration is at an extreme of 1 or 60 days while the model predicts approximately 30–31 days. This is the expected error profile of a model with no usable predictors: it regresses toward the center.

Examples from the holdout include:

| Actual duration | Ridge prediction | Error pattern |
|---:|---:|---|
| 1 day | approximately 31.5 days | Severe overprediction |
| 60 days | approximately 29.8–29.9 days | Severe underprediction |

The raw high-cardinality and specification fields attached to these rows do not provide validated, generalizable structure. Including them would risk memorization rather than solve the extreme-duration problem.

### Underprediction and overprediction

On the Ridge holdout, 5,027 rows were overpredicted and 5,016 rows were underpredicted. The direction count is nearly balanced, confirming that there is no large global bias. The dominant failure is not a constant shift but failure to distinguish short and long operational cases.

### Product-level errors

| Product | Rows | Actual mean | Predicted mean | MAE | Signed error |
|---|---:|---:|---:|---:|---:|
| Laptop | 5,036 | 30.2679 | 30.6930 | 15.1247 | +0.4251 |
| Mobile Phone | 5,007 | 30.7340 | 30.5265 | 15.0445 | −0.2075 |

Product-level MAE differs by only 0.08 days. The signed bias changes direction, but neither product type provides useful separation.

### Brand-level errors

The highest holdout MAE is Oppo at 16.6287 days, followed by Apple at 15.6475 and HP at 15.5240. The lowest is Sony at 14.2154 days. These differences are descriptive only; brand sample sizes are roughly 458–564 rows, and Phase 8 showed no stable brand signal across windows.

The largest signed biases include overprediction for Apple (+1.3482 days), Oppo (+1.1952), and Vivo (+0.8989), and underprediction for Acer (−1.0415), Nokia (−0.8923), and Lenovo (−0.6215). These biases are not sufficient to justify brand-specific modeling.

### Region-level errors

| Region | Rows | Actual mean | Predicted mean | MAE | Signed error |
|---|---:|---:|---:|---:|---:|
| North | 1,917 | 29.7225 | 30.6377 | 15.2490 | +0.9152 |
| West | 2,073 | 30.5031 | 30.6603 | 15.1702 | +0.1571 |
| East | 2,062 | 30.8792 | 30.4823 | 15.1105 | −0.3970 |
| Central | 1,951 | 30.5269 | 30.3572 | 14.9553 | −0.1697 |
| South | 2,040 | 30.8196 | 30.9036 | 14.9411 | +0.0840 |

North has the highest MAE and strongest positive bias, while South has the lowest MAE. The region differences remain small relative to the target spread and do not establish operationally actionable regional signal.

### Temporal errors

Holdout monthly MAE remains broadly flat, approximately 14.86–15.21 days. Ridge overpredicts in most holdout months and changes to underprediction in March 2025. This changing sign, with stable overall MAE, indicates weak temporal structure rather than a correctable systematic seasonal bias.

### Price-related errors

Price-quintile MAE ranges from 14.8634 to 15.2779 days. The middle price quintile has the lowest MAE, while the lowest price quintile has the highest. Signed error changes from −0.2139 to +0.5210 days across bands. These small variations do not justify price-specific calibration or nonlinear price modeling.

## 6. Practical value

The answer to the required question is:

> **No. The learned model does not provide meaningful predictive value over simply predicting the historical median.**

Ridge’s apparent improvement on the holdout is 0.0011 days, and it loses to the median in all three pre-test validation windows. HistGradientBoosting also fails to beat the median on pre-test MAE. The models’ R² values remain approximately zero or negative, and their largest errors are approximately 30 days on the 1-day and 60-day extremes.

The correct final decision is therefore not to promote Ridge or HistGradientBoosting as production models. The median baseline is the strongest defensible operational reference, and a learned model should not be presented as successful.

## 7. Limitations

The target semantics remain provisional because the README does not define the row grain or confirm that `Inward Date` and `Dispatch Date` represent a meaningful fulfillment process. Several candidate fields are not documented as available at inward receipt. The final holdout was inspected in earlier phases, so its independence is limited despite being reserved as the Phase 10 holdout.

The dataset does not include the operational variables most likely to determine dispatch duration: fulfillment center, inventory availability, supplier, carrier, channel, order priority, backlog, staffing, stockout events, promotions, and service-level commitments. The current data also contains unique identifiers and synthetic-looking text that cannot safely supply entity history.

The result should not be interpreted as proof that fulfillment duration is intrinsically unpredictable. It demonstrates that the supplied features do not provide verified, stable signal under a chronological prediction-time contract.

## 8. Final decision

| Decision item | Result |
|---|---|
| Final learned model promoted | None |
| Final operational benchmark | Training-period median dispatch duration |
| Best learned candidate | Compact Ridge, but not practically better |
| Meaningful improvement over median | No |
| Further model optimization | Stop |
| Recommended next action | Confirm target semantics and collect operational data |

> **PHASE 10 COMPLETE**

## Reproducibility artifacts

```text
run_final_evaluation.py
reports/phase10_final_model_results.csv
reports/phase10_validation_summary.csv
reports/phase10_final_evaluation.json
reports/phase10_largest_errors.csv
reports/phase10_error_by_product.csv
reports/phase10_error_by_brand.csv
reports/phase10_error_by_region.csv
reports/phase10_error_by_price_band.csv
reports/phase10_error_by_inward_month.csv
```

## References

[1]: `phase_2_problem_definition.md` "Phase 2 business problem and target definition"
[2]: `phase_3_leakage_audit.md` "Phase 3 leakage and prediction-time audit"
[3]: `phase_7_baselines.md` "Phase 7 baseline-modeling report"
[4]: `phase_8_signal_validation.md` "Phase 8 signal-validation report"
[5]: `phase_9_feature_refinement.md` "Phase 9 feature-refinement report"
[6]: `../mobilesales.csv` "Supplied mobile-sales dataset"
