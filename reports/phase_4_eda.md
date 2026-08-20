# Phase 4 — Exploratory Data Analysis

**Project:** Mobile Sales — Need to work  
**Reports reviewed:** Phases 0, 1, 2, and 3  
**Selected provisional target:** `Dispatch Duration = Dispatch Date − Inward Date`  
**Prediction point:** At inward receipt, before dispatch  
**Scope:** Read-only EDA. No model was trained, no hyperparameter optimization was performed, and no final feature-selection decision was made.

## 1. Executive findings

The dispatch-duration target is broadly distributed across the full observed range of 1–60 days and is remarkably close to uniform. Its mean is 30.592 days, median is 31 days, standard deviation is 17.323 days, and skewness is −0.0024. There are no IQR outliers because the target is bounded and evenly spread.

The available pre-dispatch features show very weak univariate relationships with the target. `Price` has Pearson correlation −0.0016 and Spearman correlation −0.0017 with dispatch duration. Product means differ by only 0.013 days. The largest observed brand mean difference is approximately 1.14 days, while within-group standard deviations are approximately 17 days. Temporal mean differences are also small: monthly means vary by approximately 1.78 days and weekday means by approximately 0.52 days.

These results suggest that the current dataset contains little visible explanatory signal for dispatch duration. The main EDA conclusion is not that a complex transformation is required; it is that fulfillment behavior may depend on unobserved operational variables such as warehouse, inventory availability, supplier, order channel, staffing, carrier, priority, or backlog.

![EDA overview](phase_4_eda_overview.png)

![Price versus dispatch duration](phase_4_price_duration.png)

## 2. Target analysis

### Distribution

| Statistic | Dispatch Duration |
|---|---:|
| Count | 50,000 |
| Mean | 30.5920 days |
| Median | 31.0000 days |
| Standard deviation | 17.3227 days |
| Minimum | 1 day |
| 1st percentile | 1 day |
| 5th percentile | 4 days |
| 25th percentile | 16 days |
| 75th percentile | 46 days |
| 95th percentile | 58 days |
| 99th percentile | 60 days |
| Maximum | 60 days |
| Skewness | −0.0024 |
| IQR outliers | 0 |

The target has 60 unique integer values and no missing values. The nearly zero skewness and broad, flat histogram are consistent with an approximately uniform bounded process. This pattern should be investigated with the data owner because real fulfillment durations often show operational concentration, such as a mode around a standard service time or a long right tail.

The target is not a classification problem in its current form. The days are ordered and the cost of an error depends on its magnitude. If a later business requirement defines a service-level threshold, a derived classification analysis may be useful, but it should not replace duration regression without an operational reason.

## 3. Numerical features

### Price distribution and target relationship

`Price` ranges from 5,008 to 199,999, with mean 102,641.41, median 103,072, standard deviation 56,363.55, and skewness −0.0002. It has no zero values and no Tukey IQR outliers. The distribution is broad and approximately symmetric.

The measured linear and rank relationships with dispatch duration are negligible:

| Relationship | Correlation |
|---|---:|
| Pearson: `Price` vs duration | −0.0016 |
| Spearman: `Price` vs duration | −0.0017 |

The scatter visualization shows a diffuse cloud covering the complete price range and nearly every duration. There is no visible monotonic or obvious nonlinear pattern. Price may still matter conditionally through interactions with product or operational process, but the current univariate evidence is weak.

### Date-derived numerical features

Calendar features were considered descriptively from `Inward Date`: month, weekday, and continuous time progression. `Dispatch Date` was not used as a predictor and no dispatch-derived feature was used in EDA relationships except for constructing the target itself.

The inward-date row volume is continuous across all 731 calendar days in the date range. This supports temporal summaries, but coverage alone does not establish seasonality in the target.

## 4. Categorical target behavior

The following tables summarize the measured range of group means. Group standard deviations remain close to the overall target standard deviation, so mean differences should be interpreted cautiously and not as evidence of strong predictive power.

| Feature | Number of groups | Lowest group mean | Highest group mean | Range of group means |
|---|---:|---:|---:|---:|
| `Product` | 2 | 30.5856 | 30.5985 | 0.0130 days |
| `Brand` | 20 | 29.9894 | 31.1259 | 1.1365 days |
| `Region` | 5 | 30.3268 | 30.8189 | 0.4921 days |
| `Processor Specification` | 15 | 30.0626 | 30.9266 | 0.8641 days |
| `RAM` | 6 | 30.3737 | 30.7326 | 0.3589 days |
| `ROM` | 5 | 30.2046 | 30.8311 | 0.6265 days |
| `SSD` | 5 including structural missingness | 30.3066 | 30.7974 | 0.4908 days |
| `Core Specification` | 9 including structural missingness | 30.2616 | 30.9266 | 0.6651 days |

The exact group tables are saved as `eda_product.csv`, `eda_brand.csv`, `eda_region.csv`, `eda_processor.csv`, `eda_ram.csv`, `eda_rom.csv`, `eda_ssd.csv`, and `eda_core_specification.csv` in the analysis workspace.

### Product

Laptop mean duration is 30.5985 days and mobile-phone mean duration is 30.5856 days. Both medians are 31 days, and both groups span the full 1–60-day range. Product type therefore shows no meaningful marginal separation in the current data.

### Brand

Brand means range from 29.9894 days for Sony to 31.1259 days for Samsung. Samsung, Asus, HP, Oppo, Vivo, and Redmi are among the higher-mean groups; Sony, Apple, Google, Toshiba, and Microsoft are among the lower-mean groups. The largest mean difference is only about 1.14 days against within-brand standard deviations around 17 days. Brand may be retained as a candidate categorical feature for formal validation, but EDA does not support a strong effect claim.

### Region

Region means vary by less than half a day. The differences are small relative to the target spread and do not indicate strong geographic separation. Region remains a plausible operational feature only if it represents a real fulfillment region rather than a synthetic customer label.

### Processor, RAM, ROM, SSD, and Core Specification

Processor means range from approximately 30.06 days for Samsung Exynos to 30.93 days for Ryzen 3. The observed differences are small and likely dominated by within-group variation.

RAM, ROM, and SSD groups show similarly limited separation. `SSD` and `Core Specification` require special interpretation because missingness is structural: all mobile-phone rows are missing these laptop-oriented fields. A missing category may therefore encode product type rather than unknown hardware. EDA should not be interpreted as evidence that a global imputation is appropriate.

## 5. Temporal analysis

### Monthly pattern

The inward-date monthly summary shows stable target behavior across the observed period. Monthly mean dispatch duration ranges by approximately 1.78 days. The monthly P90 remains approximately 54–56 days, indicating that both the center and upper tail are broadly stable.

There is no clear monotonic trend across the 2023–2025 inward period. Small month-to-month changes exist, but they are not large relative to the 17.3-day target standard deviation. The partial first and last months have different row counts, so any future model evaluation should preserve their temporal position and avoid comparing incomplete periods as if they were full months.

### Weekly pattern

Weekday means differ by approximately 0.52 days across the seven weekdays. The row counts are balanced, and no strong weekly seasonality is visible from the target mean. Calendar weekday features can be tested later, but EDA does not justify a strong weekly effect.

### Product and brand behavior over time

Product-by-month and brand-by-month tables were generated for follow-up analysis. No broad product-level separation is visible in the aggregate EDA: laptop and mobile-phone means remain nearly identical. Brand-level differences are small relative to within-brand variation, and the current dataset provides no evidence of a stable brand-specific trend that can be separated from random variation without formal time-aware validation.

## 6. Interaction analysis

### Product × Brand

The product-brand interaction table was generated because brand effects may differ between laptops and mobile phones. The interaction is a valid candidate for formal evaluation if both fields are known at inward time. However, the marginal product effect is nearly zero and brand mean differences are small, so the interaction should be treated as exploratory rather than assumed useful.

### Product × Price

Price was examined in five empirical price bands within each product category. This is a descriptive interaction analysis only. Since the overall price-duration correlation is essentially zero, a product-specific price effect would need to be demonstrated through stable conditional patterns rather than assumed from price alone.

### RAM × Price

RAM-by-price-band summaries were generated. These can reveal whether capacity tiers have different fulfillment behavior at different price levels. EDA does not show a strong global signal, and this interaction should not be retained solely because it is technically easy to construct.

### Processor × RAM

Processor-by-RAM group summaries were generated to test hardware configuration effects. Because the target is broadly uniform and group means are close, any apparent differences require minimum group-size checks and time-aware validation before being considered reliable.

### Region × Product

The region-by-product heatmap shows means between approximately 30.36 and 30.93 days. The South region is highest for both laptops and mobile phones, while Central is lower, but the total spread is under one day. This is a useful descriptive visualization of operational segmentation, not evidence of a strong predictive interaction.

## 7. Suspicious patterns

Several patterns warrant investigation before modeling. First, the dispatch-duration distribution is unusually flat across 1–60 days. Second, nearly every low-cardinality feature is close to balanced, including product, brand, region, RAM, ROM, and processor categories. Third, product-specific missingness is exactly structural and aligned with product type. Fourth, product descriptions and locations look generated or semi-synthetic. These patterns may be characteristics of the source data, but they also raise the possibility that the dataset was procedurally generated or sampled rather than extracted from a natural fulfillment process.

The EDA cannot determine whether the target is predictable from hidden variables that are simply absent from the file. It therefore should not be used to justify aggressive feature engineering or complex model selection.

## 8. Potential features and transformations for later validation

The following are **candidate ideas**, not final decisions:

| Candidate | EDA rationale | Leakage/implementation condition |
|---|---|---|
| Inward month/quarter/weekday | Enables formal test of calendar seasonality | Derived only from `Inward Date` |
| Product and brand categories | Low-cardinality and likely known at inward | Must be evaluated with time-aware validation |
| Region | Low-cardinality operational grouping | Confirm that region is known at inward and operationally meaningful |
| Capacity normalization for RAM/ROM/SSD | Converts strings such as `12GB` or `1TB` to numeric values | Preserve not-applicable states; do not global-mode impute structural missingness |
| Product × Brand | Tests conditional brand behavior | Only if both fields are known at prediction time |
| Product × price band | Tests whether price effects differ by product | Price meaning and availability must be confirmed |
| Time-aware historical aggregates | Could capture changing fulfillment conditions | Requires stable entity keys and strictly prior observations only |

No target-derived or dispatch-derived transformation is proposed as valid.

## 9. Modeling implications

The EDA supports a simple, leakage-controlled baseline as the next modeling step, not an immediate complex search. The baseline should use a time-aware split, compare against a median-duration predictor, and report MAE, RMSE, median absolute error, P90 absolute error, R², and segment results.

Because the target shows weak marginal relationships and a broad uniform distribution, the most valuable modeling diagnostic will be whether any candidate beats the median baseline consistently across temporal periods and segments. A small apparent improvement should not be treated as meaningful without stability evidence.

The next data iteration should prioritize operational explanatory variables: fulfillment center, stock availability, supplier, carrier, order channel, staffing/backlog, priority, promotion, and whether the item was already in inventory. If these fields are unavailable, the project may be better suited to descriptive analytics than predictive ML.

## 10. EDA artifacts

The following focused outputs were created in the analysis workspace:

```text
reports/phase_4_eda_overview.png
reports/phase_4_price_duration.png
reports/phase4_eda_metrics.json
reports/eda_product.csv
reports/eda_brand.csv
reports/eda_region.csv
reports/eda_processor.csv
reports/eda_ram.csv
reports/eda_rom.csv
reports/eda_ssd.csv
reports/eda_core_specification.csv
reports/eda_monthly_duration.csv
reports/eda_weekday_duration.csv
reports/eda_product_month_duration.csv
reports/eda_brand_month_duration.csv
reports/eda_product_brand.csv
reports/eda_product_price.csv
reports/eda_ram_price.csv
reports/eda_processor_ram.csv
reports/eda_region_product.csv
```

The visualizations were checked for rendering quality. They are intentionally limited to a target distribution/temporal/segment overview and a price-duration relationship plot rather than a large collection of low-value charts.

## 11. Quality gate

| Requirement | Status |
|---|---:|
| Target understood | Complete: dispatch duration distribution, spread, skewness, outliers, and temporal behavior analyzed |
| Numerical relationships analyzed | Complete |
| Categorical relationships analyzed | Complete for product, brand, region, processor, RAM, ROM, SSD, and Core Specification |
| Temporal patterns analyzed | Complete: monthly, weekday, product-over-time, and brand-over-time summaries generated |
| Important interactions investigated | Complete: product-brand, product-price, RAM-price, processor-RAM, and region-product |
| Useful EDA visualizations created | Complete |
| EDA findings documented | Complete |
| Models trained | **Not performed** |
| Hyperparameter optimization performed | **Not performed** |

> **PHASE 4 COMPLETE**

## References

[1]: `phase_0_reconnaissance.md` "Phase 0 project and dataset reconnaissance"
[2]: `phase_1_data_audit.md` "Phase 1 data audit and data-quality report"
[3]: `phase_2_problem_definition.md` "Phase 2 business problem and target definition"
[4]: `phase_3_leakage_audit.md` "Phase 3 leakage and prediction-time audit"
[5]: `../mobilesales.csv` "Supplied mobile-sales dataset"
