# Phase 8 — Signal Validation & Limited Optimization

**Project:** Mobile Sales — Need to work  
**Target under review:** `Dispatch Duration = Dispatch Date − Inward Date`  
**Prediction point under review:** At inward receipt, before dispatch  
**Scope:** Signal validation, multi-window temporal evaluation, controlled ablation, and practical-significance assessment. No broad hyperparameter search was performed.

## 1. Executive decision

The Phase 8 evidence supports **Outcome C — No meaningful signal**.

Across three chronological validation windows, the median baseline, Ridge, and HistGradientBoosting models produced nearly identical MAE, RMSE, and R². Ridge was better than the median baseline in MAE in only one of the three windows, and the largest observed differences were far below a practical half-day threshold. Feature ablations also showed no feature group with consistent improvement. Daily target autocorrelation was near zero at lags 1, 7, and 30.

The result is more consistent with insufficient or semantically questionable features than with a model-capacity limitation. Broad optimization should stop. The recommended next step is to confirm the target with the data owner and collect operational fulfillment variables before reconsidering model development.

## 2. Target revalidation

The source dataset was re-read and the target was recomputed directly:

```text
Dispatch Duration = Dispatch Date − Inward Date
```

The recomputed duration exactly matched the stored experiment target for all rows. The observed ranges are:

| Quantity | Verified value |
|---|---:|
| Inward Date range | 2023-03-21 to 2025-03-20 |
| Dispatch Date range | 2023-03-23 to 2025-05-18 |
| Dispatch duration minimum | 1 day |
| Dispatch duration maximum | 60 days |
| Dispatch duration mean | 30.5920 days |
| Dispatch duration variance | 300.0759 days² |
| Invalid date parses | 0 |
| Dispatch before inward | 0 |

### Semantic concern

The README is generic. It describes a mobile-sales analysis repository but does not define the row grain, the meaning of `Inward Date`, the meaning of `Dispatch Date`, a fulfillment service-level objective, or a prediction use case. Therefore, the arithmetic target is reproducible, but its business interpretation is **not independently supported by the README**.

The duration is operationally meaningful only if `Inward Date` represents the point at which an item enters a fulfillment process and `Dispatch Date` represents the relevant completion event. It is predictable at inward receipt in the formal sense that all predictors must precede dispatch, but the dataset does not document whether the candidate input fields were actually available at that moment.

The Phase 2 decision must therefore be treated as provisional. The project owner should confirm whether the intended problem is fulfillment lead-time prediction. If not, Phase 2 must be revisited before modeling continues. The target was not silently changed in this phase.

## 3. Multi-window chronological validation

Three expanding chronological windows were selected before evaluating results:

| Window | Training period ends | Validation period | Train rows | Validation rows |
|---|---|---|---:|---:|
| A | 2024-02-29 | 2024-03-01 to 2024-06-30 | 23,776 | 8,279 |
| B | 2024-06-30 | 2024-07-01 to 2024-10-31 | 32,055 | 8,409 |
| C | 2024-10-31 | 2024-11-01 to 2025-03-20 | 40,464 | 9,536 |

No rows were shuffled. All preprocessing and feature-engineering statistics were fitted within the relevant training period. `Dispatch Date` was used only to construct the target.

### Window-level model results

| Window | Model | MAE | RMSE | R² | Median AE | P90 AE |
|---|---|---:|---:|---:|---:|---:|
| A | Median | 14.8731 | 17.2279 | −0.0003 | 15.0000 | 27.0000 |
| A | Ridge | 14.8763 | 17.2281 | −0.0003 | 14.8774 | 26.9377 |
| A | HistGradientBoosting | 14.8849 | 17.2337 | −0.0009 | 14.7373 | 26.8285 |
| B | Median | 15.0583 | 17.3967 | −0.0017 | 15.0000 | 27.0000 |
| B | Ridge | 15.0609 | 17.3932 | −0.0013 | 15.2890 | 27.0800 |
| B | HistGradientBoosting | 15.0587 | 17.3882 | −0.0007 | 15.3477 | 27.2146 |
| C | Median | 15.0850 | 17.3923 | −0.0007 | 15.0000 | 27.0000 |
| C | Ridge | 15.0846 | 17.3916 | −0.0006 | 15.1996 | 27.0370 |
| C | HistGradientBoosting | 15.0854 | 17.3871 | −0.0001 | 15.4244 | 27.0393 |

### Stability summary

| Model | Mean MAE | MAE std. dev. | Mean RMSE | RMSE std. dev. | Mean R² | Windows better than median |
|---|---:|---:|---:|---:|---:|---:|
| Median | 15.0055 | 0.1154 | 17.3390 | 0.0962 | −0.0009 | 0/3 |
| Ridge | 15.0073 | 0.1140 | 17.3377 | 0.0948 | −0.0007 | 1/3 |
| HistGradientBoosting | 15.0097 | 0.1089 | 17.3363 | 0.0889 | −0.0006 | 0/3 |

The small mean-RMSE advantage of HistGradientBoosting does not translate to better MAE and is not stable enough to establish useful signal. All mean R² values remain essentially zero or negative.

## 4. Statistical and practical significance

For each model and window, a paired bootstrap confidence interval was calculated for the difference in absolute error relative to the median baseline. Negative values would favor the model.

| Window | Model | Mean error difference vs median | 95% bootstrap CI |
|---|---|---:|---:|
| A | Ridge | +0.0033 days | [−0.0095, 0.0138] |
| A | HistGradientBoosting | +0.0118 days | [0.0020, 0.0202] |
| B | Ridge | +0.0027 days | [−0.0100, 0.0150] |
| B | HistGradientBoosting | +0.0005 days | [−0.0072, 0.0087] |
| C | Ridge | −0.0004 days | [−0.0106, 0.0120] |
| C | HistGradientBoosting | +0.0003 days | [−0.0075, 0.0091] |

The confidence intervals include zero for five of six model-window comparisons. Window A HistGradientBoosting is statistically worse under the paired bootstrap despite a slightly lower P90 error. This is not evidence of useful predictive signal.

A practical improvement threshold of **0.5 calendar days** was defined before interpreting the results. This threshold is intentionally tied to the operational unit: a difference smaller than half a day is unlikely to change a fulfillment commitment or staffing decision, while the target’s standard deviation is approximately 17.3 days. A candidate should also improve consistently across all windows and not materially worsen P90 error. No candidate meets those requirements.

## 5. Controlled feature ablation

A fixed Ridge model was used for ablation. Each feature group was evaluated independently against the target-only median baseline in every chronological window.

| Feature group | Window A MAE improvement | Window B MAE improvement | Window C MAE improvement | Consistent? |
|---|---:|---:|---:|---|
| Target-only median | 0.0000 | 0.0000 | 0.0000 | Benchmark |
| Product + Brand + Region | −0.0022 | −0.0037 | −0.0003 | No |
| Price | −0.0049 | +0.0013 | +0.0002 | No |
| Inward Date features | −0.0098 | −0.0073 | −0.0032 | No |
| Product specifications | −0.0129 | +0.0030 | −0.0050 | No |
| Engineered features | −0.0471 | −0.0326 | −0.0147 | No; consistently worse |

Positive values mean lower MAE than the median baseline. No feature group provides a stable practical improvement. The engineered set is consistently worse in MAE across all three windows, despite containing plausible calendar, price, and interaction features.

The ablation identifies no meaningful isolated signal source. Hardware specifications, product/brand/region, price, and inward-date features all behave approximately like noise relative to the target baseline.

## 6. Signal investigation

### Target variance and temporal stability

The target variance is 300.0759 days², but the variance represents a broad bounded distribution rather than a predictable time-varying process. Monthly target means vary by approximately 1.78 days, and the P90 remains close to 54–56 days. These shifts are small relative to the target standard deviation.

Daily mean-duration autocorrelation is near zero:

| Lag | Autocorrelation of daily mean duration |
|---:|---:|
| 1 day | 0.0086 |
| 7 days | 0.0100 |
| 30 days | −0.0142 |

There is no meaningful short-term or weekly persistence for a simple time-series signal to exploit.

### Group behavior

Phase 4 group analysis found the following approximate ranges in group means:

| Grouping | Range of group means |
|---|---:|
| Product | 0.0130 days |
| Brand | 1.1365 days |
| Region | 0.4921 days |
| Processor specification | 0.8641 days |
| RAM | 0.3589 days |
| ROM | 0.6265 days |
| SSD | 0.4908 days |
| Core specification | 0.6651 days |
| Price quintile | 0.4377 days |
| Inward month | 1.7818 days |

The largest group mean range is about 1.8 days across months and 1.14 days across brands, while within-group standard deviations are approximately 17 days. These differences are too small and unstable to support a practical model using the available fields.

### Insufficient-feature hypothesis

The data lacks likely operational drivers of fulfillment duration: warehouse or fulfillment center, inventory availability, supplier, carrier, channel, order priority, backlog, staffing, promotions, stockouts, and customer service-level commitments. This is the strongest explanation for the weak result if the target semantics are confirmed.

### Model-capacity hypothesis

The model-capacity explanation is weak. Both a regularized linear model and a nonlinear gradient-boosting model are essentially tied with the median baseline across windows. Increasing capacity without adding information is unlikely to produce a reliable improvement.

### Temporal-instability hypothesis

Temporal instability is not the main explanation. The median baseline changes from 14.8731 to 15.0850 MAE across windows, but candidate models track it closely and do not show a repeatable advantage. This is consistent with stable absence of signal rather than a regime-specific model failure.

## 7. Limited optimization decision

No limited hyperparameter optimization was run. The Phase 8 gate allows optimization only if signal investigation indicates that model capacity may be limiting performance. That condition was not met: Ridge and HistGradientBoosting were both essentially equivalent to the median baseline, and the ablation results showed no feature group with stable improvement.

Running a small search after observing near-zero R² would risk fitting validation noise rather than recovering genuine signal. The correct experimental decision is to stop optimization, preserve the median baseline, and revisit the data and target semantics.

## 8. Final outcome

> **Outcome C — No meaningful signal.**

The current dataset remains essentially equivalent to a target-only baseline. There is no stable, practical improvement across chronological windows, and no feature family demonstrates repeatable predictive value.

This does not prove that fulfillment duration is inherently unpredictable. It shows that the supplied columns do not contain enough verified information to predict it usefully under the stated prediction-time contract.

## 9. Recommended next step

First, obtain explicit business confirmation of the target semantics. Confirm what `Inward Date` and `Dispatch Date` mean, whether dispatch is the relevant completion event, what one row represents, and whether predictions at inward receipt would drive a real decision.

If the target is confirmed, collect operational predictors that are available at inward time: fulfillment center, inventory status, supplier, carrier, order channel, priority, backlog, staffing, promotions, stockout indicators, and service-level commitments. Also obtain stable repeated product and customer identifiers with event timestamps if historical aggregates are desired.

If the target is not confirmed, stop model development and revise Phase 2 rather than optimizing an arbitrary derived label.

## 10. Reproducibility artifacts

The Phase 8 analysis created:

```text
run_signal_validation.py
reports/phase8_signal_validation.json
reports/phase8_multiwindow_results.csv
reports/phase8_stability_summary.csv
reports/phase8_feature_ablation.csv
reports/phase8_confidence_intervals.csv
reports/phase8_price_bins.csv
reports/phase8_monthly_signal.csv
```

No random shuffle was used, and no test or future window was used to fit preprocessing or target-aware features.

## 11. Quality gate

| Requirement | Status |
|---|---:|
| Target semantics revalidated | Complete mathematically; business semantics remain explicitly provisional because README is generic |
| Multiple chronological windows evaluated | Complete: three windows |
| Baseline stability measured | Complete |
| Feature ablation completed | Complete |
| Signal strength investigated | Complete: variance, autocorrelation, temporal/group behavior, and feature coverage |
| Optimization limited and justified | Complete: optimization intentionally skipped because capacity was not the limiting evidence |
| No test leakage | Complete by chronological, training-only fitting rules |
| Final outcome classified | Complete: Outcome C |

> **PHASE 8 COMPLETE**

## References

[1]: `phase_2_problem_definition.md` "Phase 2 business problem and target definition"
[2]: `phase_3_leakage_audit.md` "Phase 3 leakage and prediction-time audit"
[3]: `phase_4_eda.md` "Phase 4 exploratory data analysis"
[4]: `phase_5_preprocessing.md` "Phase 5 preprocessing architecture"
[5]: `phase_6_feature_engineering.md` "Phase 6 feature-engineering report"
[6]: `phase_7_baselines.md` "Phase 7 baseline-modeling report"
[7]: `../README.md` "Project README; generic and not target-defining"
[8]: `../mobilesales.csv` "Supplied mobile-sales dataset"
