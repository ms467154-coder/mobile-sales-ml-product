# Phase 0 — Project and Dataset Reconnaissance

**Project:** Mobile Sales — Need to work  
**Scope:** Read-only reconnaissance only. No model was trained, no hyperparameter tuning was performed, no dataset values were changed, and no existing project files were deleted or modified.  
**Dataset:** `mobilesales.csv`  
**Dataset SHA-256:** `bfb4e1dd0b8d669c48b0915d302142e6802af3c822354a07a6cac1ef3c649417`

## 1. Project overview

The project is a small mobile-sales analysis repository. The README available in the repository’s latest Git commit describes the contents as a mobile-sales analysis project containing notebook files, data files, scripts, and analysis code. It gives only generic instructions to open the folder in Jupyter Notebook or VS Code, install dependencies as needed, and run notebooks or scripts locally. It does **not** specify a business problem, target variable, forecast horizon, required prediction output, or primary business metric.

The live working tree was inspected directly. Its visible project content currently consists of the dataset `mobilesales.csv` and the `.git` directory. The Git index records `.gitignore` and `README.md`, but both are currently absent from the working tree according to `git status`; `mobilesales.csv` is untracked. No Python files, notebooks, configuration files, dependency manifests, model files, evaluation files, or ML artifacts are present in the live working tree.

| Project component | Finding |
|---|---|
| README | Present in Git history; missing from the current working tree |
| Python files | None found in the current working tree |
| Notebooks | None found in the current working tree |
| Existing preprocessing | None found |
| Existing models | None found |
| Existing evaluation | None found |
| Configuration files | No ML configuration found |
| Dependency files | None found |
| Dataset files | `mobilesales.csv` |
| Artifacts | None found |
| Git state | `.gitignore` and `README.md` are tracked but deleted locally; dataset is untracked |

The README content was read from `HEAD` without restoring it. Its claims about notebooks, scripts, and analysis code could not be verified in the current working tree because no such files are present. This discrepancy must be resolved before implementation begins.

## 2. Dataset overview

The CSV contains **50,000 rows and 16 columns**. The source file was inspected directly, and its SHA-256 was verified. The first records contain mobile phones and laptops, prices, dates, quantities, customer-related fields, regional information, and hardware specifications.

| Property | Verified result |
|---|---:|
| Rows | 50,000 |
| Columns | 16 |
| Duplicate rows | 0 |
| Total missing cells | 49,966 |
| Negative prices | 0 |
| Negative quantities | 0 |
| Dispatch before inward | 0 |
| Inward Date range | 2023-03-21 to 2025-03-20 |
| Dispatch Date range | 2023-03-23 to 2025-05-18 |
| Price range | 5,008 to 199,999 |
| Quantity Sold range | 1 to 10 |

### Schema

| Column | Observed dtype | Unique values | Missing values | Initial role assessment |
|---|---|---:|---:|---|
| `Product` | string | 2 | 0 | Low-cardinality categorical |
| `Brand` | string | 20 | 0 | Low-cardinality categorical |
| `Product Code` | string | 50,000 | 0 | Potential row/entity identifier |
| `Product Specification` | string | 50,000 | 0 | Unique text-like field; potential generated description or identifier |
| `Price` | integer | 44,112 | 0 | Numerical feature or possible target candidate |
| `Inward Date` | string/date-like | 731 | 0 | Temporal feature |
| `Dispatch Date` | string/date-like | 788 | 0 | Temporal event; may be future information |
| `Quantity Sold` | integer | 10 | 0 | Numerical discrete outcome candidate |
| `Customer Name` | string | 40,013 | 0 | High-cardinality customer field; privacy and memorization risk |
| `Customer Location` | string | 25,147 | 0 | High-cardinality location text; normalization required |
| `Region` | string | 5 | 0 | Low-cardinality geographic categorical |
| `Core Specification` | string | 9 including missing | 24,983 | Product-dependent categorical field |
| `Processor Specification` | string | 15 | 0 | Categorical product attribute |
| `RAM` | string | 6 | 0 | Categorical capacity attribute |
| `ROM` | string | 5 | 0 | Categorical capacity attribute |
| `SSD` | string | 5 including missing | 24,983 | Product-dependent capacity attribute |

### Data types and field groups

The numerical columns are `Price` and `Quantity Sold`. The date-like columns are `Inward Date` and `Dispatch Date`; they were stored as strings in the CSV and require explicit parsing before analysis. The categorical columns are `Product`, `Brand`, `Region`, `Core Specification`, `Processor Specification`, `RAM`, `ROM`, and `SSD`. The text-like or high-cardinality fields are `Product Specification`, `Customer Name`, and `Customer Location`. `Product Code` is technically text but behaves like an identifier because every row has a distinct value.

## 3. Dataset integrity

The dataset contains no exact duplicate rows. There are no negative prices or quantities. `Quantity Sold` takes the ten integer values from 1 through 10, with approximately even representation across the ten values. `Price` is positive and lies between 5,008 and 199,999.

Both date columns parse as valid dates. No row has a dispatch date earlier than its inward date. The observed dispatch interval ranges from 1 to 60 days. This interval is only descriptive at Phase 0; it must not automatically become a model feature because it depends on `Dispatch Date`, which may occur after a prediction is supposed to be made.

The missingness in `Core Specification` and `SSD` is structural rather than obviously random. Both fields are missing for all mobile-phone rows and present for laptop rows. This pattern suggests “not applicable” rather than an accidental missing entry. It should be handled explicitly after the prediction-time business process is defined.

No impossible values were identified from basic checks. However, the dataset does not include a data dictionary, units for `Price`, an explanation of the product specification text, a definition of the customer fields, or a statement of whether each row represents an order, shipment, invoice, or aggregate transaction.

## 4. Existing implementation

No existing ML implementation is present in the current working tree. Specifically, no training script, preprocessing module, feature engineering module, notebook, model artifact, evaluation report, dependency file, or configuration file was found. The only documented implementation is the generic README text stored in Git history, which does not describe an actual pipeline.

The local Git state should be treated as an important project condition rather than silently repaired. The tracked README and `.gitignore` are deleted in the working tree, and the CSV is untracked. No restoration or deletion was performed during this reconnaissance phase.

## 5. Potential ML problems

The README does not define a target or objective, so the following are candidate formulations rather than decisions.

| Candidate task | Potential target | Business value | Available features | Main leakage risks | Difficulty and data sufficiency |
|---|---|---|---|---|---|
| Demand regression | `Quantity Sold` | Could support inventory or demand planning | Product, brand, price, product attributes, region, inward date | Post-sale fields, aggregation leakage, unclear forecast horizon | 50,000 rows is numerically sufficient for a baseline, but the target’s business meaning and temporal structure are unclear |
| Quantity classification | Bins or exact `Quantity Sold` classes | Could support low/medium/high demand alerts | Same as regression | Same as regression; arbitrary bins may invent a business objective | Ten observed values permit experimentation, but no class definition or business threshold is supplied |
| Price regression | `Price` | Could support price estimation or catalog QA | Product attributes, brand, specifications | Price may already be an input or directly determined by catalog rules | Data volume is sufficient, but business usefulness is not established |
| Dispatch-duration regression | `Dispatch Date − Inward Date` | Could support fulfillment planning | Inward date, product, customer, region, price | `Dispatch Date` itself must not be used at prediction time; operational process variables are absent | The duration target is computable, but a pre-dispatch use case and service-level definition are not documented |
| Time-series forecasting | Future daily/weekly sales aggregate | Could support replenishment and planning | Dates, products, brands, regions, quantities | Random splits, future aggregation leakage, missing stockout/promotion context | The date span is about two years, but the data-generating grain and regularity are unknown |
| Ranking | Products ranked by expected sales | Could prioritize inventory or merchandising | Product, brand, attributes, price, historical quantity | Future quantities and post-period aggregation leakage | Possible only after an explicit ranking period and evaluation metric are defined |
| Clustering | Product/customer/transaction segments | Could support exploratory segmentation | Product attributes, prices, geography, customer fields | Identifier memorization and sensitive customer attributes | 50,000 rows are available, but no business acceptance criterion is defined |
| Anomaly detection | Unusual price, quantity, or fulfillment event | Could identify data-quality or operational issues | Numerical fields, dates, categories | Treating ordinary rare categories as anomalies; using future fields | Feasible as unsupervised analysis, but anomaly response rules are missing |

No final target, model, split, or modeling direction is selected in this Phase 0 report.

## 6. Potential leakage sources

`Product Code` is unique for every row and should be treated as an identifier until proven otherwise. A model could memorize row-specific information without learning a repeatable relationship. `Product Specification` is also unique for every row and should not be one-hot encoded blindly. Its text needs semantic inspection before any structured extraction is considered.

`Customer Name` and `Customer Location` are high-cardinality fields. Raw encoding could cause memorization, poor performance on unseen values, and privacy concerns. Frequency or historical aggregate features would require a precise event-time protocol and must be calculated using only information available before each prediction.

`Dispatch Date` is potentially post-event information. If the business prediction is made at inward time, it must be excluded, as must dispatch duration and any feature derived from it. The correct decision depends on the still-unknown prediction time.

`Quantity Sold` must be excluded from all predictors if it becomes the target. Any customer, product, or date aggregates must be constructed within training periods only. Random train/test splitting could leak temporal patterns if the intended use is future prediction.

The structural missingness of `Core Specification` and `SSD` may itself encode product type. That can be valid if product type is known at prediction time, but it should be understood as a domain representation rather than treated as random missingness.

## 7. Important uncertainties

The most important unresolved issue is the business definition of one row. It is unclear whether a row is an order line, a completed sale, an inventory movement, a shipment, or a synthetic transaction. It is also unclear when a prediction would be made and what action follows from the prediction.

The project does not define whether `Price` is sale price, list price, purchase cost, or another monetary quantity. Units and currency are not documented. There is no inventory availability, promotion, channel, supplier, stockout, return, cancellation, or historical demand field. These omissions may explain why future demand modeling would be difficult.

The meaning of `Product Specification` is unknown. Its values appear unique and text-like, but the repository does not document whether they contain useful structured attributes or generated filler text. The customer fields may contain personal information and require governance before modeling.

The working tree is inconsistent with the README’s description: the README claims notebooks and scripts, but none are present in the live directory. The tracked README and `.gitignore` are locally deleted, while the dataset is untracked. This should be resolved and committed intentionally before Phase 1 implementation.

## 8. Recommendations for Phase 1

Phase 1 should begin by confirming the business objective and prediction-time contract with the project owner. The minimum required decisions are whether the goal is demand, fulfillment, pricing, segmentation, or anomaly analysis; what one row represents; when the prediction is made; what fields are available at that time; and which business metric determines success.

After the objective is confirmed, Phase 1 should create a read-only data dictionary and validation specification before adding features. It should inspect the semantic content of `Product Specification`, verify the units and meaning of `Price`, establish whether customer fields may be used, and document structural missingness for product-specific fields.

If demand prediction is confirmed, a chronological evaluation design should be considered. The design should define the forecast horizon, aggregation grain, treatment of repeated products/customers, and how historical features are built without future leakage. If no valid business target can be confirmed, the safer next step is exploratory data analysis or data-quality/anomaly analysis rather than inventing a supervised target.

No model training, hyperparameter tuning, final modeling decision, or dataset transformation should occur until these uncertainties are resolved.

## 9. Phase 0 quality gate

| Requirement | Status |
|---|---:|
| Entire project structure inspected | Complete for the live working tree and Git history |
| README inspected | Complete; current working-tree deletion noted |
| Dataset inspected directly | Complete |
| Schema verified | Complete |
| Potential targets identified | Complete |
| Potential leakage sources identified | Complete |
| Existing ML work understood | Complete; none present in live tree |
| Reconnaissance report created | Complete |
| Models trained | **Not performed** |
| Hyperparameter tuning performed | **Not performed** |
| Dataset modified | **Not performed** |
| Existing project files deleted or modified | **Not performed** |

> **PHASE 0 COMPLETE**

## References

[1]: `../mobilesales.csv` "Supplied mobile-sales dataset"
[2]: `../.git/` "Project Git metadata inspected read-only"
[3]: `../README.md` "README path in the project working tree; currently absent, with content verified from Git HEAD"
