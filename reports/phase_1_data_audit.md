# Phase 1 — Data Audit & Data Quality

**Project:** Mobile Sales — Need to work  
**Scope:** Read-only data audit. No final model was trained, no hyperparameter optimization was performed, no feature-selection decision was made, and the dataset was not modified.  
**Input:** `mobilesales.csv`  
**Dataset SHA-256:** `bfb4e1dd0b8d669c48b0915d302142e6802af3c822354a07a6cac1ef3c649417`

This audit follows the Phase 0 reconnaissance report in [`phase_0_reconnaissance.md`](phase_0_reconnaissance.md). All reported values below were calculated from the dataset itself. The audit helper temporarily parsed the two date columns into additional analysis columns; the source CSV remains unchanged and contains 16 original columns.

## 1. Data quality summary

| Check | Result | Assessment |
|---|---:|---|
| Rows | 50,000 | Adequate for structural analysis |
| Original columns | 16 | Schema is compact but undocumented |
| Exact duplicate rows | 0 | No exact duplicates detected |
| Near-duplicate rows after removing unique/text identifiers | 0 | No repeated stable records detected |
| Missing cells | 49,966 | All missingness is in two columns |
| Invalid date parses | 0 | Both date columns parse successfully |
| Days with no inward records | 0 | Inward coverage is continuous over its date range |
| Days with no dispatch records | 0 | Dispatch coverage is continuous over its date range |
| Dispatch before inward | 0 | Ordering rule passes |
| Negative prices | 0 | Domain rule passes |
| Zero prices | 0 | Domain rule passes |
| Negative quantities | 0 | Domain rule passes |
| Zero quantities | 0 | Domain rule passes |
| Non-integer quantities | 0 | Stored as integer values |

The dataset is structurally clean according to the tested rules. The principal data-quality concerns are not malformed values but **semantic uncertainty**, structural missingness, synthetic-looking high-cardinality text, and unclear event timing.

## 2. Numerical analysis

The raw numerical columns are `Price` and `Quantity Sold`. Date columns are not treated as numerical features until their prediction-time role is defined.

| Feature | Mean | Median | Std. dev. | Min | Q1 | Q3 | Max | Skewness | IQR outliers | Zeros |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `Price` | 102,641.41 | 103,072 | 56,363.55 | 5,008 | 53,487 | 151,396.25 | 199,999 | −0.0002 | 0 | 0 |
| `Quantity Sold` | 5.5138 | 6 | 2.8810 | 1 | 3 | 8 | 10 | −0.0029 | 0 | 0 |

### `Price`

`Price` has 44,112 unique values among 50,000 rows, so it is high-cardinality numerical data rather than a small set of price categories. The 1st percentile is 7,047.98, the 5th percentile is 14,987.95, the 95th percentile is 190,587.20, and the 99th percentile is 198,174.00. The distribution is essentially symmetric, with skewness close to zero. The Tukey IQR fences are −93,376.88 and 298,260.13, so no observations are flagged as IQR outliers. The absence of statistical outliers does not prove that every price is semantically correct because the currency, units, and price meaning are undocumented.

`Price` values are all positive and integer-typed. The near-uniform spread between 5,008 and 199,999 may indicate synthetic generation or a broad catalog range; this should be confirmed against business records before any transformation is chosen.

### `Quantity Sold`

`Quantity Sold` has exactly ten integer values, 1 through 10. The 1st and 5th percentiles are 1, the 25th percentile is 3, the median is 6, the 75th percentile is 8, and both the 95th and 99th percentiles are 10. Skewness is effectively zero, and no IQR outliers are detected because the entire range is compact and bounded.

The values are approximately evenly represented rather than showing the concentration usually expected from transaction quantities. This may be a valid bounded business rule, a generated dataset property, or evidence that the field is not a natural aggregate demand measure. The distribution should be confirmed with the project owner before treating it as a forecasting target.

## 3. Categorical analysis

### Low-cardinality categorical fields

| Feature | Cardinality | Dominant values and frequency | Rare-category finding |
|---|---:|---|---|
| `Product` | 2 | Laptop 25,017 (50.034%); Mobile Phone 24,983 (49.966%) | None; nearly perfectly balanced |
| `Brand` | 20 | Google 2,598 (5.196%); Realme 2,386 (4.772%) | None; every category has more than 2,300 rows |
| `Region` | 5 | West 10,288 (20.576%); East 9,843 (19.686%) | None; nearly balanced |
| `Processor Specification` | 15 | MediaTek Dimensity 3,640 (7.280%); Ryzen 9 3,047 (6.094%) | None; all categories have more than 3,000 rows |
| `RAM` | 6 | 4GB 8,417 (16.834%); 8GB 8,287 (16.574%) | None; all categories exceed 8,000 rows |
| `ROM` | 5 | 256GB 10,127 (20.254%); 128GB 9,937 (19.874%) | None; all categories exceed 9,900 rows |

These fields have balanced or near-balanced category frequencies. No unexpected blank category or singleton was observed. The balanced distributions may be genuine, but their regularity also warrants a provenance check.

### `Core Specification`

`Core Specification` has eight observed non-missing values plus missingness, with 24,983 missing rows (49.966%). The most frequent observed value is `i5` with 3,215 rows (6.430%), followed by `Ryzen 3` with 3,176 rows (6.352%). Every observed category is common; no rare-category problem exists.

The missingness is completely product-dependent: it is 0% for `Laptop` and 100% for `Mobile Phone`. It is therefore a structural “not applicable” indicator, not a random missing-value process. Missingness rates by brand range approximately from 48.0% to 51.8%, and rates by region range from approximately 49.6% to 50.5%; these variations are consistent with the near-balanced product mix rather than a strong independent brand or region mechanism.

### `SSD`

`SSD` has four observed values—256GB, 2TB, 1TB, and 512GB—plus missingness. It has the same 24,983 missing rows (49.966%) and exactly the same product-dependent pattern: 0% missing for laptops and 100% missing for mobile phones. Observed categories are not rare; the largest is 256GB with 6,301 rows (12.602%), and the smallest is 512GB with 6,171 rows (12.342%).

`SSD` should not be mode-imputed without preserving the structural meaning. Any future representation should distinguish “not applicable to mobile phone” from an unknown laptop SSD value.

## 4. High-cardinality and identifier analysis

| Feature | Unique values | Unique ratio | Singleton rows | Audit interpretation |
|---|---:|---:|---:|---|
| `Product Code` | 50,000 | 100.00% | 50,000 | Row-level identifier or synthetic code candidate |
| `Product Specification` | 50,000 | 100.00% | 50,000 | Unique text-like field; not a conventional repeated product specification |
| `Customer Name` | 40,013 | 80.026% | 33,994 | High-cardinality customer field with privacy and memorization risk |
| `Customer Location` | 25,147 | 50.294% | 16,194 | High-cardinality generated-looking location field |

`Product Code` is not a reusable product identifier in the observed data because every row has a different code. It should be considered a row identifier until the source system confirms otherwise. Frequency encoding would have no useful repeated-frequency information in this snapshot.

`Product Specification` contains a unique sentence for every row. Sample values are generic English sentences such as “Site candidate activity company there bit inside soldier decide information.” They do not visibly follow a documented hardware-specification grammar. The field may be generated filler text, a unique description, or an encoded source value; semantic inspection and provenance confirmation are required before using it.

`Customer Name` has 33,994 singleton rows. The most frequent names occur only 22 times. Raw encoding would create sparse high-cardinality features and may expose personal information. `Customer Location` has 16,194 singleton rows, with the most frequent value appearing 54 times. Location strings such as `South Michael`, `North Michael`, `Michaelmouth`, and `Lake James` appear synthetic or semi-structured; they should not be treated as clean geographic entities without normalization and validation.

A stable-key duplicate check using product, price, dates, quantity, region, product specifications, and hardware fields found 50,000 unique groups. Therefore, no repeated transaction pattern was found after removing the unique/text customer and identifier fields. This does not rule out semantic duplicates with slightly different text or identifiers, but it indicates no obvious exact near-duplicate cluster under the tested stable fields.

No final feature-selection decision is made here. The audit only flags these columns for explicit leakage and generalization experiments after the business problem and prediction time are defined.

## 5. Missing-data analysis

| Feature | Missing count | Missing rate | Main pattern |
|---|---:|---:|---|
| `Core Specification` | 24,983 | 49.966% | 100% of mobile-phone rows; 0% of laptop rows |
| `SSD` | 24,983 | 49.966% | 100% of mobile-phone rows; 0% of laptop rows |
| All other original fields | 0 | 0% | No missingness detected |

The identical missingness pattern for `Core Specification` and `SSD` strongly indicates structural non-applicability. Missingness is product-dependent, but not meaningfully region-dependent or brand-dependent after accounting for the balanced product mix. Missingness indicators may duplicate the information already carried by `Product`; the decision to retain, transform, or omit them must be made only after the prediction contract is known.

The dataset has no missing dates, target-like quantities, prices, customer fields, or other hardware attributes. No blanket imputation action is recommended at this stage.

## 6. Temporal audit

### `Inward Date`

`Inward Date` spans 2023-03-21 through 2025-03-20, covers 731 unique dates, and has records on every calendar day in the range. Daily row counts range from 45 to 100, with a median of 68. Monthly counts range from 734 in the partial first month, March 2023, to 2,153 in November 2023. After the initial partial month, monthly counts are broadly around 1,900–2,150, with March 2025 again partial at 1,366.

Weekday counts are also balanced: Thursday has 7,187 rows and Friday has 7,013. No extreme weekday imbalance is visible. A date-derived feature may be useful for descriptive analysis, but seasonality has not been established and should not be assumed from row counts alone.

### `Dispatch Date`

`Dispatch Date` spans 2023-03-23 through 2025-05-18, covers 788 unique dates, and has records on every calendar day in that range. Daily counts range from 2 to 90, with a median of 67. The low counts near the beginning and end are consistent with the dispatch range extending beyond the inward-date range.

The dispatch interval is always positive, with a minimum of 1 day, maximum of 60 days, and no zero-day intervals. The verified rule `Dispatch Date >= Inward Date` passes for all 50,000 rows.

`Dispatch Date` is potentially post-event information. If a prediction is made at inward time, it and any dispatch-duration derivative must be excluded. If the business task is fulfillment-duration prediction, then the target and prediction-time contract must be defined explicitly before using any date-derived feature.

## 7. Domain validation

| Rule | Violations | Result |
|---|---:|---|
| `Price >= 0` | 0 | Pass |
| `Price > 0` | 0 zero values | Pass under positive-price assumption |
| `Quantity Sold >= 0` | 0 | Pass |
| `Quantity Sold > 0` | 0 zero values | All transactions have positive quantity |
| `Quantity Sold` integer | 0 non-integer values | Pass |
| Dates parse successfully | 0 invalid dates | Pass |
| `Dispatch Date >= Inward Date` | 0 | Pass |
| Exact duplicate rows | 0 | Pass |
| Stable-field near duplicates | 0 | Pass |
| Required fields missing | 0 | Pass for observed schema |

No suspicious categorical values were found in the low-cardinality fields. The main suspicious observations are **synthetic-looking text values**, perfectly unique product codes/specifications, a nearly uniform quantity distribution, and structural half-dataset missingness. These are not automatic errors, but they require provenance and business-semantic confirmation.

## 8. Potential data-quality problems

The dataset is technically well-formed but semantically under-documented. The meaning of one row, the units and currency of price, the generation process for product descriptions and locations, and the business interpretation of quantity are unknown. These uncertainties are more consequential than standard missing-value or outlier handling.

The `Quantity Sold` field contains only 1–10 and is nearly uniformly distributed. That may reflect an imposed sampling rule rather than real sales demand. If the project intends demand forecasting, the data should be checked for aggregation, truncation, synthetic generation, stock constraints, and whether each row is a completed sale rather than an inventory event.

The unique `Product Code` values prevent repeated-entity analysis in this snapshot. If codes are supposed to represent products, the source extraction may have generated a transaction-level code instead of a stable product ID. This must be clarified before historical product features or grouped validation can be designed.

The customer fields have substantial cardinality and may contain personally identifying information. Their use requires a privacy and generalization review before any modeling experiment.

## 9. Recommended actions

The first action should be semantic validation with the data owner: define the row grain, target meaning, prediction time, price units, and whether the dataset is synthetic or extracted from an operational system. No imputation or feature engineering should be finalized before those definitions are available.

The second action should be provenance validation of `Product Code`, `Product Specification`, `Customer Name`, and `Customer Location`. Determine whether product codes repeat across transactions, whether product specifications contain real product attributes, and whether customer fields may be used at all. If a stable product identifier exists elsewhere, obtain it rather than inferring identity from unique codes.

The third action should be to preserve structural missingness explicitly. Treat missing `Core Specification` and `SSD` as not-applicable for mobile phones unless domain review shows otherwise. Do not replace all missing values with a global mode.

The fourth action should be to define the temporal task before selecting a split. For future demand, use a time-aware design and specify the forecast horizon. For fulfillment duration, define the prediction event before dispatch and use only pre-dispatch inputs. For exploratory segmentation or anomaly detection, define an evaluation and operational response criterion.

The fifth action should be to retain this audit as a data contract precursor. Phase 2 should create formal validation checks for schema, allowed categories, positive price/quantity, date ordering, structural missingness, identifier uniqueness, and temporal coverage.

## 10. Phase 1 quality gate

| Requirement | Status |
|---|---:|
| Every original feature audited | Complete |
| Missingness understood | Complete; structural product-dependent pattern identified |
| High-cardinality features investigated | Complete |
| Dates validated | Complete |
| Numerical distributions analyzed | Complete |
| Domain rules verified | Complete |
| Duplicate and near-duplicate checks performed | Complete |
| Potential data-quality issues documented | Complete |
| Final model trained | **Not performed** |
| Hyperparameter optimization performed | **Not performed** |
| Premature feature-selection decision made | **Not performed** |

> **PHASE 1 COMPLETE**

## References

[1]: `phase_0_reconnaissance.md` "Phase 0 project and dataset reconnaissance"
[2]: `../mobilesales.csv` "Supplied mobile-sales dataset"
