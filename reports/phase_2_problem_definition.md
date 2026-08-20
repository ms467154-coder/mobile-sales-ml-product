# Phase 2 — Business Problem & Target Definition

**Project:** Mobile Sales — Need to work  
**Inputs reviewed:** Git-history README, `reports/phase_0_reconnaissance.md`, and `reports/phase_1_data_audit.md`  
**Scope:** Problem definition only. No model was trained, no hyperparameter optimization was performed, and no final feature-selection decision was made.

## 1. Executive decision

The README does not define an ML objective, target variable, prediction horizon, or business metric. The dataset is also semantically under-documented: it is unclear whether each row is an order line, completed sale, shipment, inventory movement, or synthetic transaction.

After comparing the available outcomes, the most defensible **provisional ML problem** is:

> **Predict the number of calendar days between product inward and dispatch at the moment the product is recorded as inward.**

The target will be defined as:

```text
Dispatch Duration = Dispatch Date − Inward Date
```

This is a supervised **regression** task with an operational fulfillment-planning interpretation. The target is directly observable from two valid date fields, has a natural unit of days, is non-negative in all 50,000 records, and supports an exact prediction point: the prediction occurs at inward receipt, before dispatch takes place.

This choice is conditional on the project owner confirming that the business actually wants fulfillment lead-time prediction. If that confirmation is not obtained, the correct action is to pause ML implementation rather than silently convert the dataset into a demand problem.

## 2. Candidate target evaluation

| Candidate target | What it represents | Business value | Availability at prediction time | Leakage risk | Suitability assessment |
|---|---|---|---|---|---|
| **Dispatch Duration** | Elapsed days from inward to dispatch | Fulfillment planning, customer expectation setting, exception prioritization, and staffing | Label becomes known after dispatch; inputs can be known at inward | `Dispatch Date` must be used only to create the label, never as a predictor; dispatch-derived features are prohibited | **Selected provisional target.** It has a natural unit, clear event boundary, and exact pre-dispatch prediction point |
| `Quantity Sold` | Quantity recorded on a transaction | Could support demand or inventory planning | The row grain and whether quantity is known before the prediction are unclear | Future aggregation, post-sale information, and unclear forecast horizon | Candidate but not selected. Values 1–10 are nearly uniform, and the dataset does not establish a demand-forecasting process |
| `Price` | A monetary value attached to a row | Could support price estimation or catalog QA | Present in every row | Price may be the input or a catalog rule rather than an outcome | Not selected because the README provides no price-estimation objective and price semantics are undocumented |
| Future aggregated sales | Product/region demand over a future period | Strong inventory-planning value if defined correctly | Requires a time-indexed panel and forecast horizon | Future aggregation, stockout censoring, and random split leakage | Not currently feasible because row grain, aggregation level, and horizon are absent |
| Customer/product segment label | A manually or operationally defined group | Could support marketing or assortment analysis | No label exists | Identity memorization and sensitive customer attributes | Not available as a supervised target |
| Anomaly indicator | Whether a record is abnormal | Could support data-quality operations | No anomaly label or response policy exists | Rare does not necessarily mean erroneous | Useful as exploratory analysis, not the defined primary ML task |

## 3. Candidate problem formulations

### 3.1 Selected formulation: dispatch-duration regression

The selected formulation predicts a continuous non-negative duration measured in calendar days. Although the observed duration is integer-valued and bounded between 1 and 60 days, it represents elapsed time rather than a nominal class. Regression preserves the ordering and operational distance between errors: predicting 10 days instead of 11 is materially different from predicting 10 instead of 40.

A later implementation may compare ordinary regression with count-aware or survival-style approaches if the business confirms censoring, service-level deadlines, or right-censored in-progress shipments. Those are not selected in Phase 2 because the dataset does not document censoring or incomplete dispatch records.

### 3.2 `Quantity Sold` regression

Direct quantity regression is technically possible because `Quantity Sold` is an integer field with ten observed values. However, the field is approximately uniformly distributed from 1 through 10, and the dataset does not specify whether it is known at order creation, represents an aggregate over a period, or is simply a completed-sale attribute. Without row-grain and timing definitions, a quantity model could be a mislabeled post-event prediction task.

Quantity regression remains a secondary candidate for a future phase if the owner confirms that rows represent pre-sale opportunities and that the quantity is a future outcome. If confirmed, MAE and RMSE would be natural metrics, with a time-aware split and leakage-safe historical aggregates.

### 3.3 Quantity classification

Exact ten-class classification is rejected as the primary formulation. The ten values are ordered quantities, not documented business categories, and the dataset supplies no action associated with each class. Classification would discard distance information and could create a misleading accuracy or F1 objective.

A low/medium/high quantity classification could be considered only if a business owner defines meaningful thresholds and actions. Those thresholds must not be chosen merely to make the metrics convenient.

### 3.4 Time-series forecasting

The inward dates cover 731 consecutive days, which provides temporal coverage, but the dataset does not specify the aggregation grain or whether repeated product entities exist. `Product Code` is unique in every row, so it cannot currently serve as a stable product history key. There is also no inventory, promotion, channel, stockout, or historical lag information.

A future forecasting system could be appropriate after the data is reshaped into a well-defined product-period panel with a forecast horizon. It is not selected for the current phase because the required forecasting semantics are absent.

### 3.5 Other supervised or unsupervised tasks

Price regression is not selected because the meaning and currency of `Price` are undocumented and no pricing objective appears in the README. Ranking is not defined because no ranking period or relevance label exists. Clustering and anomaly detection could support exploratory analysis, but neither has a documented operational decision or evaluation criterion.

## 4. Prediction point and feature availability

The prediction point is:

> **Immediately after a product record is created at inward receipt and before dispatch occurs.**

At that time, the model may use fields that are genuinely known and approved by the operating process, subject to owner confirmation.

| Field or field group | Availability at inward time | Phase 2 treatment |
|---|---|---|
| `Inward Date` | Yes | Candidate temporal input; derive calendar features only from this date |
| `Product`, `Brand`, `Price` | Likely yes | Candidate transaction/product inputs; price semantics must be confirmed |
| `Region` | Likely yes | Candidate geographic input |
| `Core Specification`, `Processor Specification`, `RAM`, `ROM`, `SSD` | Likely available from product data | Candidate product attributes; structural missingness must be preserved |
| `Product Code` | Present, but unique per row | Provisional exclusion pending provenance; do not treat as a stable product key |
| `Product Specification` | Present, but unique text | Provisional exclusion pending semantic validation |
| `Customer Name`, `Customer Location` | Present in the file | Use only if known at inward time, legally approved, and shown to generalize; no raw encoding decision is made here |
| `Dispatch Date` | Not available before dispatch | Label source only; prohibited as a predictor |
| Dispatch duration | Not available before dispatch | Target only; prohibited as a predictor |

The final feature contract must be approved before modeling. In particular, the presence of a field in the CSV is not sufficient evidence that it was available at the prediction point.

## 5. Target definition

| Definition item | Selected specification |
|---|---|
| Target name | `Dispatch Duration` |
| Target construction | `Dispatch Date − Inward Date` in calendar days |
| Target type | Non-negative continuous/integer regression target |
| Target range observed | 1 to 60 days |
| Target missingness | 0 missing dispatch or inward dates in the audited file |
| Prediction point | At inward receipt, before dispatch |
| Prediction horizon | The complete fulfillment interval from inward to dispatch; no fixed calendar horizon is imposed |
| Business objective | Estimate expected fulfillment lead time and identify records likely to require attention |
| Primary metric | MAE in days |
| Secondary metrics | RMSE in days, median absolute error, 90th-percentile absolute error, R², and error by product/brand/region |
| Required baseline | Naive historical/overall median duration, evaluated using the same time split |
| Required validation | Chronological or event-time split; no random split as the sole evaluation |

### Metric rationale

MAE is primary because it is directly interpretable: an MAE of 3 means the average absolute error is three days. RMSE is secondary because large misses may be operationally costly and should be visible. Median absolute error describes typical performance without domination by a few long delays. The 90th-percentile absolute error measures the tail risk relevant to customer commitments and exception management. R² is supplementary and should not be used alone, especially if the duration distribution is bounded or weakly predictable.

If the business later defines a service-level threshold, such as “dispatch within seven days,” a secondary classification view may be added after the regression target is established. That would be a derived operational report, not a reason to replace the primary duration regression without stakeholder justification.

## 6. Business objective

The proposed objective is to estimate fulfillment lead time early enough to support operational planning. A prediction could be used to set realistic expectations, prioritize potentially delayed records, allocate fulfillment capacity, and investigate process variation by product or region. The model must support decision-making rather than automatically penalize customers, employees, suppliers, or regions.

The business owner must confirm whether the dispatch event represents the relevant fulfillment completion event. If dispatch is only one step in a longer delivery process, the target may not correspond to customer-perceived delivery time and should be revised.

## 7. Rejected or deferred alternatives

| Alternative | Decision | Reason |
|---|---|---|
| `Quantity Sold` as demand-regression target | Deferred | No verified pre-outcome timing, row grain, or forecasting horizon; nearly uniform bounded values may be synthetic or sampled |
| Exact quantity classification | Rejected for primary task | Ordered count values do not justify nominal classes, and no class actions exist |
| Low/medium/high quantity classification | Deferred | Requires business-defined thresholds and actions |
| Future demand forecasting | Deferred | Requires stable product identity, time aggregation, historical lags, and a forecast horizon |
| `Price` prediction | Rejected | No stated business objective; price meaning and currency are undocumented |
| Dispatch-date classification | Rejected | Replaces a naturally measurable duration with an arbitrary label and would lose timing information |
| Clustering | Deferred | No operational segmentation objective or acceptance criterion |
| Anomaly detection | Deferred | No anomaly label or response policy; better treated as data-quality analysis initially |

## 8. Assumptions requiring confirmation

The selected target depends on several assumptions that must be confirmed before Phase 3. The project owner must verify that `Inward Date` is known before the fulfillment process being predicted, `Dispatch Date` is the meaningful completion event, all proposed input fields are available at inward time, price has a defined currency and meaning, and the data represents real operational records rather than synthetic examples.

The owner must also clarify whether rows are independent dispatch events or whether multiple rows belong to the same product, order, customer, or shipment. If groups exist but are hidden by unique codes, group-aware validation may be required.

## 9. Phase 3 entry criteria

Phase 3 may proceed only after the owner confirms the dispatch-duration objective and prediction point. The implementation should then create the target from dates in a reproducible transformation, exclude `Dispatch Date` and all post-dispatch derivatives from inputs, establish a chronological split, compare against a median-duration baseline, and audit performance by product, brand, and region.

If the owner instead confirms a demand-planning objective, this report should be revised before modeling to define a valid quantity target, aggregation grain, forecast horizon, and event-time feature policy.

## 10. Quality gate

| Requirement | Status |
|---|---:|
| Target explicitly justified | Complete: dispatch duration is selected provisionally with documented rationale |
| ML formulation justified | Complete: regression selected; classification and forecasting evaluated |
| Prediction point defined | Complete: inward receipt before dispatch |
| Evaluation metrics defined | Complete: MAE primary; RMSE, median AE, P90 AE, R², and segment errors secondary |
| Alternative formulations considered | Complete |
| Business objective documented | Complete: fulfillment lead-time planning and exception support |
| Models trained | **Not performed** |
| Hyperparameter optimization performed | **Not performed** |

> **PHASE 2 COMPLETE**

## References

[1]: `../README.md` "README path; current working-tree file is absent and Git HEAD content was reviewed"
[2]: `phase_0_reconnaissance.md` "Phase 0 project and dataset reconnaissance"
[3]: `phase_1_data_audit.md` "Phase 1 data audit and quality report"
[4]: `../mobilesales.csv` "Supplied mobile-sales dataset"
