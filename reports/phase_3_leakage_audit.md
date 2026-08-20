# Phase 3 — Data Leakage & Prediction-Time Audit

**Project:** Mobile Sales — Need to work  
**Inputs reviewed:** `reports/phase_2_problem_definition.md` and `reports/phase_1_data_audit.md`  
**Scope:** Read-only leakage and prediction-time audit. No model was trained, no leakage experiment was fitted, and no dataset or existing project file was modified.

## 1. Prediction timestamp

The Phase 2 provisional problem is dispatch-duration regression. The prediction timestamp is:

> **Immediately after the product record is created at inward receipt and before dispatch occurs.**

The target is created only for training/evaluation as:

```text
Dispatch Duration = Dispatch Date − Inward Date
```

`Dispatch Date` is therefore an outcome timestamp, not an input. Any feature derived from it—including dispatch duration, dispatch weekday, dispatch month, elapsed time, post-inward delay, or any statistic that uses dispatch outcomes—is prohibited from the predictor set.

The prediction-time contract remains conditional on business confirmation. The CSV does not contain event timestamps for when customer, price, quantity, or product information became available. Where availability cannot be verified, the feature is marked **conditional** and must not be admitted to a final model without source-system confirmation.

## 2. Feature-level audit

| Feature | Available at prediction? | Future information? | Leakage risk | Decision |
|---|---|---|---|---|
| `Product` | Likely known from the inward record or product catalog | No intrinsic future information | Low; category is balanced and low-cardinality | **Candidate valid feature**, subject to source confirmation |
| `Brand` | Likely known from the product catalog | No intrinsic future information | Low to moderate if brand assignment changes after inward | **Candidate valid feature**, subject to source confirmation |
| `Product Code` | Present in the file, but operational timing and meaning are unknown | Not inherently future, but may encode row/entity/order information | Very high: unique in all 50,000 rows, likely identifier, possible memorization or hidden sequencing | **Exclude by default** until a stable, repeated product/entity meaning is verified |
| `Product Specification` | Present in the file, but semantic provenance is unknown | Could contain hidden post-event or generated information | Very high: unique in all rows and generic sentence-like text; one-hot encoding would memorize records | **Exclude by default**; require semantic and provenance validation before any extraction |
| `Price` | Likely known before or at inward receipt if it is catalog/list price | Could be future if it is a post-sale realized price or settlement value | Moderate: meaning, currency, and timing are undocumented | **Conditional candidate**; admit only after price semantics and timestamp are confirmed |
| `Inward Date` | Yes; it defines the prediction event | No | Low; derived calendar parts are valid | **Valid candidate feature**; use only pre-event calendar information |
| `Dispatch Date` | No; it occurs after inward receipt | **Yes** | Critical target leakage | **Exclude absolutely**; label source only |
| `Quantity Sold` | Unknown; may be known at order/inward time or recorded after completion | Potentially future depending on row semantics | High if recorded after sale or dispatch; target-derived aggregates are also risky | **Conditional; exclude until event availability is confirmed** |
| `Customer Name` | Possibly known at order creation, but not established at inward receipt | Not intrinsically future, but could be assigned later | Very high privacy, memorization, and unseen-customer risk; 80.026% unique ratio | **Exclude raw field**; any approved aggregate must be as-of and privacy-reviewed |
| `Customer Location` | Possibly known from order/customer data | Not intrinsically future, but timing is unverified | High cardinality, synthetic-looking values, sparse generalization, privacy risk | **Exclude raw field**; use only an approved coarse geography if availability is confirmed |
| `Region` | Likely known with the transaction or location | No intrinsic future information | Low to moderate; region assignment timing is not documented | **Candidate valid feature**, subject to source confirmation |
| `Core Specification` | Likely known from product catalog | No intrinsic future information | Low leakage risk; structural missingness may duplicate `Product` | **Candidate feature** with explicit not-applicable handling |
| `Processor Specification` | Likely known from product catalog | No intrinsic future information | Low to moderate if catalog values are revised after inward | **Candidate feature**, subject to catalog-timestamp confirmation |
| `RAM` | Likely known from product catalog | No intrinsic future information | Low; categorical capacity may be normalized | **Candidate feature**, subject to source confirmation |
| `ROM` | Likely known from product catalog | No intrinsic future information | Low; categorical capacity may be normalized | **Candidate feature**, subject to source confirmation |
| `SSD` | Likely known for laptops; structurally not applicable for mobile phones | No intrinsic future information | Low leakage risk; careless imputation can erase product semantics | **Candidate feature** with explicit not-applicable state |
| Derived `Dispatch Duration` | No; it is the outcome interval | **Yes by definition** | Critical target leakage | **Training label only; never a predictor** |

The table intentionally distinguishes “available in the CSV” from “available at prediction time.” Presence in a historical extract is not evidence of event-time availability.

## 3. High-risk column investigations

### `Dispatch Date`

The audit verified 50,000 valid dispatch dates and confirmed `Dispatch Date >= Inward Date` for every row. Dispatch dates occur after the prediction point under the Phase 2 definition. The column must be removed before feature generation. No date parts, duration, moving average, delay flag, or other derivative of dispatch date may enter the model.

It is valid to use `Dispatch Date` to construct the training label because the label is observed after the event. It is not valid to pass it through preprocessing, compute target-aware features from it, or use it to define an input snapshot.

### `Quantity Sold`

`Quantity Sold` is not the selected target in Phase 2, but its event availability is unresolved. If quantity is confirmed as a known item/order attribute at inward receipt, it may be a candidate predictor of dispatch duration. If it is recorded only after sale completion, dispatch, or aggregation over a future interval, it is future information and must be excluded. The current CSV does not provide timestamps that resolve this distinction.

No target-derived quantity averages, customer quantities, product quantities, or region quantities may be computed from the complete dataset. Any such feature must use only records strictly earlier than the current inward event.

### `Product Code`

Every `Product Code` is unique, with 50,000 singletons. The values look like eight-character hexadecimal-style codes, but no data dictionary establishes whether they encode a product, order, shipment, or synthetic row. A unique code cannot provide reliable repeated-entity history in this extract. It may also conceal a generated ordering or source-system identifier.

The default leakage-safe decision is exclusion. A future data contract could admit a stable product ID only after confirming repeated entities across events and designing group/time validation around that entity.

### `Product Specification`

Every `Product Specification` value is unique and consists of generic sentence-like text. No structured hardware grammar or source provenance is documented. The field may be generated text, a unique description, or an encoded identifier. It cannot be safely treated as a normal categorical feature. Raw encoding risks memorization, and text modeling risks learning source artifacts rather than fulfillment behavior.

The field is excluded until a data owner confirms that its content is known before inward receipt and contains stable, non-post-event product information. If validated, structured extraction must be performed inside a reproducible pipeline and tested for leakage.

### `Customer Name`

Customer names may be known at order creation, but the exact timing relative to inward receipt is not documented. The field has 40,013 unique values and 33,994 singleton rows. Raw use creates strong memorization and privacy risks. Customer identities may also encode repeat-order history that would be unavailable for new customers.

The raw field is excluded. A privacy-approved historical statistic could be considered only if each row’s statistic is computed from strictly prior events, using a time-aware expanding transformation that does not include the current row or future records.

### `Customer Location`

Customer location may be known at order time but is not proven to be known at inward receipt. It has 25,147 unique values and 16,194 singleton rows. Values appear semi-structured or synthetic rather than validated geographic names. `Region` provides a lower-cardinality alternative, but even that field requires event-time confirmation.

Raw location is excluded. A coarse, approved geography may be considered later if the source system defines it and the privacy review permits it.

## 4. Temporal leakage controls

The data contains no precomputed historical aggregates, but future leakage can be introduced during feature engineering. The following rules are mandatory:

| Feature family | Leakage risk | Required control |
|---|---|---|
| Product history | Future dispatch outcomes or future product events can enter current rows | Use a stable product ID and compute expanding/rolling values using records strictly before the current inward timestamp |
| Customer history | Future purchases or future fulfillment durations can enter customer averages | Use only prior customer events; define behavior for unseen customers; exclude raw names |
| Region/brand averages | Full-dataset means include future records | Fit aggregates on training-period rows only and apply fixed mappings to validation/test; for production, use as-of windows |
| Target encoding | Directly uses dispatch duration labels | Use cross-fitting inside training folds and time-restricted mappings; never compute from validation/test labels |
| Frequency counts | Full-dataset counts include future entities/events | Use training-only or as-of frequency counts; no global post-period counts |
| Date aggregates | Future daily/weekly volume can leak into current rows | Use only dates and counts known before the current timestamp; do not center rolling windows on future dates |
| Dispatch-derived features | Directly or indirectly reveal the target | Prohibit `Dispatch Date`, dispatch duration, delay flags, dispatch month/weekday, and any derivative |
| Row ordering | Source order may reflect generation or outcome sequence | Do not use row index or source order as a feature; sort explicitly by event time for validation and aggregates |

Because `Product Code` is unique in the current file, historical product aggregates cannot be safely defined from this extract. Any future aggregate design must first establish a stable entity key.

## 5. Leakage experiments

The requested comparison of “with suspicious feature” versus “without suspicious feature” is intentionally **not executed in Phase 3**. The phase restriction prohibits modeling, and a performance comparison would require fitting models. The audit therefore records the experiment design without producing results:

1. Establish a time-aware train/validation/test split by inward timestamp.
2. Define a leakage-safe baseline using only approved pre-inward fields.
3. Add one suspicious feature family at a time under a documented event-availability assumption.
4. Compare performance and feature stability without changing the temporal split.
5. If a unique identifier or future-derived feature causes a dramatic improvement, treat the result as evidence of leakage or memorization until proven otherwise.

No claim is made about performance impact because no model was fitted. This is deliberate and preserves the pre-model quality gate.

## 6. Final feature availability rules

The provisional leakage-safe input contract for the dispatch-duration problem is:

**Permitted candidate inputs, pending source confirmation:** `Product`, `Brand`, `Price`, `Inward Date` calendar parts, `Region`, `Core Specification`, `Processor Specification`, `RAM`, `ROM`, and `SSD`.

**Conditionally permitted only after event-time and governance confirmation:** `Quantity Sold`, approved coarse location, and any stable product or customer identifier that is repeated across historical events.

**Prohibited inputs:** `Dispatch Date`, `Dispatch Duration`, any dispatch-derived feature, any future aggregate, any target encoding computed with future labels, raw `Product Code`, raw `Product Specification`, raw `Customer Name`, raw `Customer Location`, and row index/source order.

Structural missingness in `Core Specification` and `SSD` must be represented as “not applicable” when appropriate. It must not be replaced with a global mode in a way that creates false laptop specifications for mobile phones.

## 7. Required implementation safeguards before modeling

Before Phase 4 modeling, the implementation should create the dispatch-duration label in a separate target-construction step, assert that no input column is derived from `Dispatch Date`, and validate the final feature list against an allowlist. The pipeline should record the prediction timestamp and feature availability contract in metadata.

Any historical aggregate transformer must be time-aware, fit only on training data, and have tests demonstrating that adding a future row cannot change a past row’s feature value. A test should also assert that shuffled source order does not change the feature matrix.

A production-quality training-serving contract should reject missing or unknown event timestamps, record whether an optional feature was available at inward receipt, and fail closed when a post-dispatch field is supplied as an input.

## 8. Quality gate

| Requirement | Status |
|---|---:|
| Prediction point defined | Complete: inward receipt before dispatch |
| Every original feature audited | Complete |
| Future features identified and removed by rule | Complete: dispatch fields and derivatives prohibited |
| Aggregation leakage controls documented | Complete |
| Identifier leakage investigated | Complete |
| High-cardinality risks documented | Complete |
| Leakage experiment design recorded | Complete; execution deferred because this phase prohibits modeling |
| Leakage report created | Complete |
| Models trained | **Not performed** |
| Hyperparameter optimization performed | **Not performed** |

> **PHASE 3 COMPLETE**

## References

[1]: `phase_2_problem_definition.md` "Phase 2 business problem and target definition"
[2]: `phase_1_data_audit.md` "Phase 1 data audit and data-quality report"
[3]: `../mobilesales.csv` "Supplied mobile-sales dataset"
