# B2C Energy Demo Guide — Visual Data Prep + Genie Code Workshop

> **Catalog**: `<YOUR_CATALOG>` (replace with your Unity Catalog)
> **Schema**: `energy_retail_demo`
> **Volume**: `/Volumes/<YOUR_CATALOG>/energy_retail_demo/raw_data/`
> **Setup**: see `02_Setup/energy_retail_demo_setup.py`

## Timeline overview

| Time | Pillar | Goal |
|------|--------|------|
| 0-3 min | Intro | Context + open the workspace |
| 3-18 min | **Data Engineering** | **Visual Data Prep**: build Bronze/Silver/Gold visually |
| 18-30 min | **Data Science** | Genie Code: train K-Means, then build a Lakeflow pipeline that applies the model |
| 30-43 min | **Analytics** | Image-to-dashboard + Genie exploration |
| 43-45 min | Q&A |

---

## Intro

**The business problem (set this up before any prompt):**

> Engie's B2C retail team is losing **~8% of off-peak-heavy customers per quarter** to competitors with sharper night tariffs. They suspect the loss is hiding in their own data — but the data lives in **5 raw files no analyst has had the time to join**. In 40 minutes, we'll go from those 5 files to a **named, quantified upsell list** the retention team can act on Monday morning.

**Talking points:**
- Raw data from a French electricity retailer:
  * customer records (CSV)
  * smart meter readings (CSV)
  * monthly bills (CSV)
  * tariff plan definitions (CSV)
  * customer service interactions (JSON)

- Consumption data contains daily, weekly, and hourly readings (typical of Linky smart meter exports combined with legacy meter reads)
- Interactions data is JSON nested 3 levels deep


#### ==> We'll use **Visual Data Prep** to build the medallion pipeline visually, then **Genie Code** to train the model, apply it through a declarative pipeline, and author the executive dashboard — ending with the **Night Owl upsell list**.

---

## Pillar 1 — Data Engineering with Visual Data Prep

> The whole DE pillar is built in **Visual Data Prep** — Databricks' no-code visual flow editor. No prompts to copy-paste here: drive the UI live in front of the audience. Each step below maps to a flow you'll save and publish into `<YOUR_CATALOG>.energy_retail_demo`.

### Step 1 — Explore the raw files (Visual Data Prep canvas)

1. Open **Visual Data Prep** in the Databricks workspace and create a new flow named `energy_retail_visual_prep`.
2. Add a **Source** node pointing at `/Volumes/<YOUR_CATALOG>/energy_retail_demo/raw_data/`.
3. Use the data preview / profiling pane to inspect each file: schemas, row counts, distinct values, null counts.

Talking points:
- Mix of CSV and JSON formats — VDP auto-infers schemas and lets you eyeball distributions without writing a single SELECT.
- Consumption data contains `daily`, `weekly`, and `hourly` reading types with peak / off-peak indicators.
- Nested JSON structure (3 levels: interaction, sentiment, details.resolution) — visible right in the preview.
- Tariff plans with peak / off-peak rate structure.
- **Plant the seed**: *"You'll notice a small fraction of customers show flat or spike patterns inconsistent with their region — the customers table even carries an `anomaly_flag`. Don't fix it now — flag it. We'll come back to it once we have the Gold profile and the K-Means clusters: that's how we'll prove the model is doing real work, not just textbook clustering."*

---

### Step 2 — Build the Bronze flow (visual ingestion + quality rules)

1. Add 5 Source nodes (one per file): `raw_customers.csv`, `raw_consumption.csv`, `raw_billing.csv`, `raw_tariff_plans.csv`, `raw_customer_interactions.json`.
2. On each Source node, apply built-in **data-quality expectations** (drop-on-fail):
   - `customer_id` is never null (customers, consumption, billing, interactions)
   - `kwh_consumed > 0` (consumption)
   - `amount_eur > 0` (billing)
   - valid email format — `email LIKE '%@%'` (customers)
   - `peak_rate_eur_kwh > off_peak_rate_eur_kwh` (tariff consistency)
3. Configure each output to publish into `<YOUR_CATALOG>.energy_retail_demo` as `bronze_customers`, `bronze_consumption`, `bronze_billing`, `bronze_tariff_plans`, `bronze_customer_interactions`.

Talking points:
- Quality rules are **built-in** — no `@dp.expect_or_drop()` to write, no Python imports.
- Auto-infer + click-to-cast for column types — CSV and JSON handled side-by-side.
- Quality metrics are visible per node in the canvas (drop counts, distribution drift).
- Serverless materialization — no cluster to manage, lineage already in Unity Catalog.

---

### Step 3 — Build the Silver flow (cleaning, FK validation, JSON flatten)

Wire downstream of the Bronze nodes — all visual, with one Custom SQL escape hatch for the 3-level JSON:

- `silver_tariff_plans`: **Filter** node → rates positive, `standing_charge > 0`, `green_energy_pct` between 0 and 100.
- `silver_customers`: **Window/Deduplicate** node on `customer_id` (keep most recent `signup_date`) → **Join** with `silver_tariff_plans` for FK validation → **Derive** node to normalize region names.
- `silver_consumption`: **Cast** node (timestamp), **Filter** (`kwh_consumed > 0`), **Join** with `silver_customers` (FK), **Derive** node for `reading_date`, `reading_hour`, `is_weekend`.
- `silver_billing`: **Filter** (`amount_eur > 0`, `kwh_billed > 0`), **Cast** `billing_period` as date, **Join** with `silver_customers` (FK), **Derive** node for tariff amount consistency.
- `silver_customer_interactions`: drop in a **Custom SQL** node — VDP's escape hatch for nested JSON — with `LATERAL VIEW EXPLODE`:

  ```sql
  SELECT
    interaction_id, customer_id,
    interaction.type AS interaction_type,
    interaction.priority AS priority,
    interaction.category AS category,
    sentiment.score AS sentiment_score,
    sentiment.label AS sentiment_label,
    keyword,
    details.comment_text,
    details.resolution.status AS resolution_status,
    details.resolution.action AS resolution_action,
    details.resolution.resolution_time_hours,
    details.metadata.device,
    details.metadata.browser
  FROM bronze_customer_interactions
  LATERAL VIEW EXPLODE(sentiment.keywords) kw AS keyword
  ```

Publish all 5 outputs as `silver_*` tables.

Talking points:
- The visual canvas handles **80%** of the work (dedupe, joins, casts, filters) with zero code.
- The Custom SQL node is the deliberate **20% escape hatch** — same flow, same lineage, you just write SQL when the shape is exotic.
- Foreign-key validation through visual Joins is more legible than a stack of `@dp.expect()` rules.
- The Bronze → Silver DAG appears in the canvas — same lineage as a Lakeflow pipeline, exposed visually.

---

### Step 4 — Build the Gold flow (business aggregates + features)

Three outputs, all wired off the Silver nodes:

**`gold_customer_energy_profile`** — the customer feature mart that feeds the model. Use a mix of **Group-By** nodes and one **Custom SQL** node for the linear-regression slope:
- `avg_daily_kwh`, `total_annual_kwh` (Group-By on `silver_consumption`)
- `peak_consumption_pct` (Custom SQL — percentage of hourly readings in peak windows)
- `winter_avg_daily_kwh` (Nov-Feb), `summer_avg_daily_kwh` (Jun-Aug), `seasonal_ratio = winter/summer`
- `weekday_avg_daily_kwh`, `weekend_avg_daily_kwh`, `weekend_ratio`
- `consumption_trend` — Custom SQL with `regr_slope(monthly_kwh, month_index)` over the last 12 months
- `total_billed_eur`, `avg_monthly_bill_eur`, `overdue_bill_count`, `payment_reliability_pct`
- `interaction_count`, `complaint_count`, `avg_sentiment_score` (joined from `silver_customer_interactions`)
- Final **Join** node merges everything onto `silver_customers`.

**`gold_revenue_by_plan`** — Group-By on `silver_billing` × `silver_tariff_plans` by plan and month: `total_revenue_eur`, `customer_count`, `avg_revenue_per_customer`, `total_kwh_sold`, `avg_kwh_per_customer`.

**`gold_regional_consumption`** — Group-By on `silver_consumption` × `silver_customers` by region and month: `total_kwh`, `avg_kwh_per_customer`, `customer_count`, `peak_vs_offpeak_ratio`.

Publish the flow → serverless materialization → all three Gold tables land in `<YOUR_CATALOG>.energy_retail_demo`.

Talking points:
- Full medallion architecture **as a visual flow** — analysts can read and edit this without learning Python.
- Custom SQL nodes are isolated to the genuinely-hard bits (slope, percentage windows) — everything else is drag-and-drop.
- Row counts and quality metrics on every node — easier to debug than scrolling through a notebook.
- The customer feature mart (`gold_customer_energy_profile`) is exactly the input the K-Means model needs in the next pillar.
- "From raw CSV/JSON files to business-ready Gold tables — without writing a pipeline by hand."

---

## Pillar 2 — Data Science: Customer classification by consumption profile

### Prompt 5: Train a consumption classification model

```text
Create a SEPARATE, standalone python script (do NOT add this code to the existing Spark Declarative Pipeline — model training is not a pipeline transformation). From the table `gold_customer_energy_profile`, build a customer classification model based on consumption profile:

- Features: `avg_daily_kwh`, `peak_consumption_pct`, `seasonal_ratio`, `weekend_ratio`, `consumption_trend`, `payment_reliability_pct`
- Standardize all features with StandardScaler
- Use K-Means clustering with k=5
- Track the experiment with MLflow: log parameters (k, features used, scaler type), metrics (silhouette score, inertia), and visualizations: centroid heatmap, per-cluster feature distribution boxplots, 2D PCA projection colored by cluster
- After clustering, label each cluster according to its centroid characteristics:
  - high peak_consumption_pct → "Peak Heavy"
  - low peak_consumption_pct (heavy off-peak consumption) → "Night Owl"
  - low seasonal_ratio (year-round stable consumption) + moderate avg_daily_kwh → "Steady Consumer"
  - high seasonal_ratio (large winter/summer gap) → "Seasonal Spiker"
  - low avg_daily_kwh → "Green Saver"
- Register the model (KMeans + StandardScaler pipeline) in Unity Catalog under the name `energy_retail_demo.consumption_classifier`
```

- Training is a standalone python script — pipelines are designed for ETL and materialized views, not for one-shot model training. Inference (next prompt) is what will land in a dedicated declarative pipeline.
- Unsupervised approach: the model *discovers* natural consumption patterns
- MLflow experiment tracking: silhouette score, cluster visualization
- Post-hoc labeling: interpretable business labels on top of the statistical clusters
- "From the Gold table to a registered model in a single prompt"

---

### Prompt 6: Build a new declarative pipeline that applies the model

```text
Create a new Spark Declarative Pipeline named "energy_retail_classification_pipeline" that reads the table `<YOUR_CATALOG>.energy_retail_demo.gold_customer_energy_profile` and produces a Gold materialized view `gold_customer_classifications`.

The pipeline should contain a Python script that:
- Loads the registered model `energy_retail_demo.consumption_classifier` from Unity Catalog using `mlflow.pyfunc.load_model()`
- Applies the model (scaler + KMeans) to predict each customer's cluster and assigns the consumption_profile label
- Outputs columns: customer_id, first_name, last_name, region, customer_type, heating_type, tariff_plan_id, avg_daily_kwh, peak_consumption_pct, seasonal_ratio, weekend_ratio, consumption_profile, cluster_id

Use the catalog `<YOUR_CATALOG>` and serverless compute. Then start the pipeline and show the distribution of consumption profiles, plus the average consumption and average monthly bill per profile.
```

- A **brand-new, single-purpose** Lakeflow Declarative Pipeline — Gold features in, classifications out. The DAG is tiny and easy to read.
- Genie Code is the right tool here: it generates the pipeline scaffold, the `@dp.materialized_view()`, and the `mlflow.pyfunc.load_model()` call in one shot.
- Model loaded from Unity Catalog (governance + lineage) — UC stitches the full chain together: Visual Data Prep outputs → trained model → this pipeline → classifications.
- **The punchline (say it out loud)**: *"~1,200 Night Owl customers are sitting on non-off-peak tariffs. At the current average basket, that's roughly **€340k of annual upsell** — and that's the list our retention team gets Monday morning. Adjust the numbers live to fit the workspace."*
- Per-segment insights: *"Seasonal Spikers = candidates for an insulation / heat-pump retrofit program. Anomaly-flagged customers = priority field-service tickets."*
- Results feed directly into the Analytics pillar

---

## Pillar 3 — Analytics: Genie + Dashboard

### Prompt 7: From image to dashboard

```text
**Upload a mockup** of the energy dashboard (prepared in advance: hand-drawn sketch or digital drawing)
```

Suggested mockup contents:
- KPI cards: Total revenue (EUR), Active customers, Average monthly bill, Overdue rate (%)
- Line chart: monthly trend of electricity consumption (kWh) over 12 months
- Bar chart: revenue by tariff plan
- Donut chart: distribution of customer consumption profiles
- Bar chart: consumption by region
- Table: top 10 highest-consumption customers

```text
Generate an AI/BI Dashboard from this mockup. Use the Gold tables in `<YOUR_CATALOG>.energy_retail_demo`. Minimize the number of datasets — use as few as possible so multiple widgets can share the same dataset and cross-filter each other through associativity. Prefer one wide dataset with joins over many narrow targeted queries.
```

- "From a back-of-the-envelope sketch to an energy dashboard in 30 seconds"
- Dashboard connected to the real data produced by our pipeline
- Cross-filtering: clicking a bar in "Revenue by plan" filters all other widgets — this works because they share the same dataset
- KPIs auto-update as new data flows through the pipeline
- Fewer datasets = better interactivity (Lakeview associativity)

---

### Prompt 8: Conversational exploration with Genie

Open Genie on the same Gold tables and ask these questions in order. **Lead with the money** — the first question is the punchline that justifies the whole 40 minutes; the rest fill in the operational picture.

```text
Which "Night Owl" customers are currently on a tariff plan without a competitive off-peak rate? Show name, region, current plan, and annual kWh — sorted by the largest annual consumption first. That's our commercial upsell list.
```

```text
Of those Night Owl upsell candidates, which ones also show a high churn_risk_score or have logged 2+ complaints in the last 90 days? Those are retention-priority — we want a save call before the upsell call.
```

```text
What is the monthly trend of electricity consumption across all customers? Which months see the highest consumption?
```

```text
Which tariff plan generates the most revenue? What's the average monthly bill per plan?
```

```text
How are customers distributed across consumption profiles? What's the average annual consumption for each profile?
```

```text
Show me the top 5 regions by total consumption. How does the seasonal pattern differ between Île-de-France and Provence-Alpes-Côte-d'Azur?
```

```text
How many customers have overdue bills? What's the total overdue amount, and which consumption profiles have the worst payment behavior?
```

```text
What are the most frequent complaint categories? What's the average resolution time for outage complaints vs billing disputes?
```

```text
Which customers carry an anomaly_flag? Group by region and consumption profile — those are field-service priorities.
```

- The first two questions deliver the **commercial outcome**: a named upsell list, then the retention overlay. Everything after is colour and credibility.
- Business users are autonomous without SQL knowledge
- Genie understands context across all Gold tables
- ML results (consumption profiles) and the new richness columns (`churn_risk_score`, `anomaly_flag`, `has_ev_charger`, `has_solar_panels`) are accessible in plain English

---

### Prompt 9: Enrich the dashboard

```text
Add a "Customer Profiles" page to the dashboard with:
- Donut chart: distribution of consumption profiles (Night Owl, Peak Heavy, Steady Consumer, Seasonal Spiker, Green Saver)
- Grouped bar chart: average feature values per profile (daily consumption, % peak, seasonal ratio, weekend ratio)
- Bar chart: number of complaints per consumption profile
- Table: top 20 customers with the highest seasonal ratio (candidates for an insulation / thermal renovation program)
- Line chart: monthly consumption comparison across the 5 profiles
```

- Dashboard built iteratively through conversation
- ML insights (consumption profiles) directly in the BI layer
- Actionable insights: "Seasonal Spikers = targets for insulation programs", "Night Owls = upsell to off-peak plans"
- "The full journey — from raw meter files to ML-powered energy dashboards — done in 40 minutes"

---
