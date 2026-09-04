# B2C Energy Demo Guide — Visual Data Prep + Genie Code Workshop

> **Catalog**: `<YOUR_CATALOG>` (replace with your Unity Catalog)
> **Schema**: `energy_retail_demo`
> **Volume**: `/Volumes/<YOUR_CATALOG>/energy_retail_demo/raw_data/`
> **Setup**: see `02_Setup/energy_retail_demo_setup.py`

This guide is the presenter script. It mirrors the 7 steps in the web-app deck (`web-app/`) one-for-one — drive the two canvas steps live in Visual Data Prep, and copy each Genie Code / Genie prompt in order.

## Timeline overview

| Time | Pillar | Goal |
|------|--------|------|
| 0-3 min | Intro | Context + open the workspace |
| 3-18 min | **Data Engineering** | **Visual Data Prep**: build the customer profile + AI-classify interactions |
| 18-30 min | **Data Science** | Genie Code: train K-Means (k=3), then a Lakeflow pipeline that applies the model |
| 30-43 min | **Analytics** | Image-to-dashboard + Genie exploration |
| 43-45 min | Q&A |

---

## Intro

**The business problem (set this up before any prompt):**

> Engie's B2C retail team has a retention problem hiding in its own data. The highest-revenue customers — the **Peak Heavy** segment — are the ones most exposed: many sit on a **flat tariff** (no off-peak advantage) *and* are already calling in with **billing disputes**. That combination is a churn signal the team can't see today, because it lives across **5 raw files no analyst has had the time to join**. In 40 minutes we'll go from those 5 files to a **named, quantified retention call list** — roughly **80 high-value at-risk customers, ~€680k of annual revenue at stake** — that the team can work Monday morning.

**Talking points:**
- Raw data from a French electricity retailer:
  * customer records (CSV)
  * smart meter readings (CSV)
  * monthly bills (CSV)
  * tariff plan definitions (CSV)
  * customer service interactions (JSON)

- Consumption is one daily kWh reading per customer for a full year; the peak/off-peak signal lives in the billing file.
- Interactions data is JSON nested 3 levels deep, with a short free-text `raw_message`.

#### ==> We'll use **Visual Data Prep** to build the customer profile and AI-classify the interactions, then **Genie Code** to train the model, apply it through a declarative pipeline, and author the executive dashboard — ending with the **Peak Heavy at-risk call list**.

---

## Pillar 1 — Data Engineering with Visual Data Prep

> Two steps on the canvas. Step 2 is one natural-language prompt; Step 3 is a short manual flow with the AI operator. Each step publishes into `<YOUR_CATALOG>.energy_retail_demo`.

### Step 1 — Add the source files to the canvas

1. Open **Visual Data Prep** and create a new flow named `energy_retail_visual_prep`.
2. For each raw file in `/Volumes/<YOUR_CATALOG>/energy_retail_demo/raw_data/`, drop a **Source** node: `raw_customers.csv`, `raw_consumption.csv`, `raw_billing.csv`, `raw_tariff_plans.csv`, `raw_customer_interactions.json`.
3. Let schema inference run and preview a few rows on each Source so the team sees the data — including the nested JSON of the interactions file.

Talking points:
- Mix of CSV and JSON — VDP auto-infers schemas and lets you eyeball distributions without writing a single SELECT.
- The interactions file is nested 3 levels deep (interaction, sentiment, details.resolution) — visible right in the preview, with the free-text `raw_message` at the root.
- **Plant the seed**: *"A small fraction of customers show flat or spike patterns inconsistent with their region — the customers table even carries an `anomaly_flag`. Don't fix it now — flag it. Today's target is the retention list; the anomalies are a follow-up field-service play."*

---

### Step 2 — Build the customer energy profile (one NL prompt → one Gold table)

Use Visual Data Prep's natural-language prompt. This is the feature mart that feeds the model.

```text
Build me one customer table I can use to find upsell opportunities — one row per customer, bringing together their consumption habits, billing behaviour, and current tariff from the four sources on the canvas.

For each customer I need:

  • Who they are — region, plus first and last name, so the output doubles as a ready-to-use call list.

  • Consumption habits — their average daily kWh, the ratio of weekend to weekday consumption, the ratio of winter to summer consumption, and how their monthly consumption trended over the year.

  • Billing behaviour — what share of their kWh falls on peak hours, and how reliably they pay (paid bills vs total bills).

  • Current tariff — plan id, plan name, plan type, peak and off-peak rates, plus a flag is_flat_tariff that is true when the peak and off-peak rates are essentially the same.

Name the six feature columns exactly: avg_daily_kwh, peak_consumption_pct, weekend_ratio, seasonal_ratio, consumption_trend, payment_reliability_pct.

Build it as a readable Visual Data Prep flow using native operators rather than a single SQL block.

Before publishing, double-check that the table has every customer in it and that nobody ends up with a zero average daily kWh — if some do, a join or filter is dropping their consumption rows.

Publish to `<YOUR_CATALOG>.energy_retail_demo.gold_customer_energy_profile`. That's the only output of this flow.
```

Talking points:
- One business prompt → VDP generates a readable Source → Filter → Join → Aggregate DAG on the canvas (not a single opaque SQL block).
- The `is_flat_tariff` flag is the hinge of the whole story — it's what separates a Peak Heavy customer who's fine from one who's overpaying.
- The "every customer, no zero avg" guardrail is deliberate: it stops a bad join silently dropping customers and blanking `avg_daily_kwh`.
- One output: `gold_customer_energy_profile` — one row per customer, 6 ML features + tariff context. This is exactly the model's input in Pillar 2.

---

### Step 3 — AI-classify customer interactions (Unique → ai_classify → join back)

The interactions file has 30,000 short SMS-style messages. Classifying every row would be 30,000 LLM calls — but the templated messages collapse to ~80 unique strings, so we classify the **distinct** set and join the topic back.

1. On the `raw_customer_interactions` Source node, drop a **Unique** operator and set its key to **Selected columns → `raw_message`**. The SMS-style templates collapse 30 000 rows to ~80 unique messages.
2. Drop an **AI** operator after the Unique operator. Configure: function `ai_classify`, input column `raw_message`, output column `topic`. Candidate labels:

   ```text
   billing dispute, service outage, tariff inquiry, meter issue, general feedback
   ```

3. Use Visual Data Prep's NL prompt to wire the topics back to every customer:

   ```text
   Goal
     One row per customer with their last message and its classified topic.

   How
     • For each customer, keep only their most recent interaction.
     • Join the AI step's output on the message text to attach the topic.

   Output schema
     • customer_id
     • raw_message   (the customer's last message)
     • topic         (clean string, e.g. "billing dispute")

   Important
     The topic column must be the plain text label only — e.g. "billing dispute".
   ```

4. End with an **Output** node — write one row per customer to `<YOUR_CATALOG>.energy_retail_demo.gold_customer_topics`.

Talking points:
- The **Unique** operator is a first-class dedup node — no Aggregate/Group-By workaround needed. Set the key to `raw_message` and it keeps one row per distinct message.
- `ai_classify` runs on the built-in Mosaic AI endpoint against the ~80 distinct messages, then the join fans the topic back out — **~350× fewer LLM calls** than classifying all 30,000 rows. Seconds instead of minutes.
- Output `gold_customer_topics` — one row per customer with their last-message topic. Joined with the profile + the ML classification, it's the third leg of the at-risk signal (profile + tariff + topic).

---

## Pillar 2 — Data Science: Customer classification by consumption profile

### Prompt 4: Train a K-Means consumption classifier (k=3)

```text
Create a new notebook for this step (separate from any previous work — keep the training isolated and easy to re-run).

Train a K-Means consumption classifier with k=3 to group our customers into 3 distinct consumption profiles.

Training source:
`<YOUR_CATALOG>.energy_retail_demo.gold_customer_energy_profile`

It also carries tariff and topic columns — ignore those, they're for the analysis layer. Cluster only on these 6 consumption features:
  • avg_daily_kwh
  • peak_consumption_pct
  • weekend_ratio
  • seasonal_ratio
  • consumption_trend
  • payment_reliability_pct

These are the exact column names in gold_customer_energy_profile — read them as-is; do not rename or remap them.

Runtime: Serverless notebook — pull the ~10 000 rows into pandas, scale the features, and use scikit-learn. Register the model to Unity Catalog using its 3-part name (catalog.schema.model) — UC is the default registry on current runtimes.

Pipeline: StandardScaler + KMeans(k=3). Track the run in MLflow and log the silhouette score, the inertia, and the trained pipeline as an artifact.

Also produce and log these 3 visualizations as MLflow figures:
  • A cluster-center heatmap (3 clusters × 6 features, values in real units)
  • Feature-distribution boxplots, one panel per feature, colored by cluster
  • A 2D PCA projection of the scaled features, points colored by cluster

After fitting, inspect the cluster centers (in real units, not z-scores) and assign each cluster_id ONE of these 3 business labels:
  • Peak Heavy      — high peak share + high overall daily kWh
  • Seasonal Spiker — strong winter vs summer consumption swing
  • Green Saver     — low overall daily kWh + reliable payments

Document the final cluster_id → label mapping in the model description (the pipeline scoring step in the next prompt depends on it).

Register the pipeline in Unity Catalog as `<YOUR_CATALOG>.energy_retail_demo.consumption_classifier` (v1).
```

- Training is a standalone notebook — pipelines are for ETL and materialized views, not one-shot model training. Inference (next prompt) is what lands in a declarative pipeline.
- k=3 matches the data: the generator plants exactly three consumption profiles, so the clusters recover cleanly. ~10,000 rows fit comfortably in pandas on the driver — no Spark ML needed.
- MLflow experiment tracking: silhouette + inertia + 3 figures. UC is the default model registry on current runtimes, so registering with the 3-part name is all it takes.
- Post-hoc labeling: interpretable business labels (Peak Heavy / Seasonal Spiker / Green Saver) on top of the statistical clusters.

---

### Prompt 5: Build a declarative pipeline that applies the model

```text
Build a Lakeflow Declarative Pipeline named `energy_retail_classification_pipeline` that scores every retail customer with the pre-trained K-Means consumption classifier.

Input table — read directly from Unity Catalog:
`<YOUR_CATALOG>.energy_retail_demo.gold_customer_energy_profile`

It has one row per customer with these columns:
  • customer_id
  • 6 numeric consumption features (the model's input): avg_daily_kwh, peak_consumption_pct, weekend_ratio, seasonal_ratio, consumption_trend, payment_reliability_pct
  • Tariff context to pass through unchanged: plan_id, plan_name, plan_type, peak_rate_eur_kwh, off_peak_rate_eur_kwh, is_flat_tariff

Apply 3 sanity checks on the input view via `dp.expect_or_drop`:
  • customer_id IS NOT NULL
  • avg_daily_kwh > 0
  • payment_reliability_pct BETWEEN 0 AND 100

Pre-trained model (already registered in Unity Catalog):
`<YOUR_CATALOG>.energy_retail_demo.consumption_classifier`
Load it with the appropriate MLflow loader for Unity Catalog models. It returns an integer cluster_id (0..2) for each row.

Create a materialized view `<YOUR_CATALOG>.energy_retail_demo.gold_customer_classifications` with one row per customer:
  • customer_id (from input)
  • cluster_id (int, raw model output)
  • consumption_profile (string) — map cluster_id to one of the 3 business labels assigned during training. The exact cluster_id order is documented in the consumption_classifier model description (typical mapping on this data, adjust if your training assigned a different order):
        0 → 'Peak Heavy'
        1 → 'Seasonal Spiker'
        2 → 'Green Saver'
  • All tariff columns from the input, passed through unchanged.

Use the catalog `<YOUR_CATALOG>` and serverless compute. Then start the pipeline and show the distribution of consumption profiles, plus the average consumption per profile.
```

- A **brand-new, single-purpose** Lakeflow Declarative Pipeline — Gold features in, classifications out. The DAG is tiny and easy to read.
- Genie Code generates the scaffold, the `@dp.materialized_view`, the `dp.expect_or_drop` checks, and the `mlflow.pyfunc` load in one shot (current API: `from pyspark import pipelines as dp`).
- Model loaded from Unity Catalog (governance + lineage) — UC stitches the full chain: VDP outputs → trained model → this pipeline → classifications.
- **The punchline (say it out loud)**: *"Now join three signals — the consumption profile, the tariff, and the complaint topic. The Peak Heavy customers on a flat tariff who are already disputing bills are our highest-value at-risk segment: roughly **80 customers, ~€680k of annual revenue at stake**. That's the retention call list. Adjust the numbers live to fit the workspace."*
- Per-segment insight: *"Seasonal Spikers = candidates for an insulation / heat-pump retrofit program."*

---

## Pillar 3 — Analytics: Genie + Dashboard

### Prompt 6: From image to dashboard

```text
**Upload a mockup** of the energy dashboard (prepared in advance: hand-drawn sketch or digital drawing)
```

Suggested mockup contents:
- KPI cards: Total revenue (EUR), Active customers, Average monthly bill, At-risk count
- Donut chart: distribution of the 3 consumption profiles
- Bar chart: complaint topic mix
- Bar chart: consumption by region
- Table (drill-down): the at-risk list — Peak Heavy · flat tariff · billing dispute

```text
Build me this AI/BI Dashboard from the attached hand-drawn mockup — match the layout, KPI tiles, charts and drill-down shown in the image.

Data sources — join these 3 Gold tables in `<YOUR_CATALOG>.energy_retail_demo`:
  • gold_customer_energy_profile — consumption habits + tariff context
  • gold_customer_classifications — named consumption profile per customer
  • gold_customer_topics — dominant complaint topic per customer

The at-risk drill-down filter at the bottom is:
  consumption_profile = 'Peak Heavy' AND is_flat_tariff = true AND topic = 'billing dispute'.

Use one wide shared dataset across widgets so they cross-filter via Lakeview associativity.
```

- "From a back-of-the-envelope sketch to an energy dashboard in 30 seconds."
- Dashboard connected to the real data produced by our pipeline — the three Gold tables join on `customer_id`.
- Cross-filtering: clicking a profile in the donut filters every other widget — this works because they share one wide dataset (Lakeview associativity).
- Fewer datasets = better interactivity.

---

### Prompt 7: Conversational exploration with Genie

Open Genie on the same 3 Gold tables and ask these in order. **Lead with the money** — the first question is the punchline that justifies the whole 40 minutes; the rest fill in the picture.

```text
Show me the Peak Heavy customers who are on a flat tariff plan (is_flat_tariff = true) AND whose dominant complaint topic is 'billing dispute'. Order by avg_daily_kwh desc. Include their name, region, plan_name and payment_reliability_pct — these are our highest-value at-risk customers and the call list for tomorrow morning.
```

```text
Same query, but for topic = 'tariff inquiry' — a softer signal, but these are warmer upsell prospects.
```

```text
What's the average annual revenue at risk per customer in that at-risk list, and the total? (Use avg_daily_kwh × 365 × the peak rate as a rough annual basket.)
```

```text
Show the distribution of those at-risk targets by region — where should we concentrate the retention effort?
```

```text
Which flat-tariff plans contribute the most at-risk candidates? Those are the plans to redesign.
```

```text
How are customers distributed across the 3 consumption profiles? What's the average daily kWh and average payment reliability for each profile?
```

```text
What are the most frequent complaint topics overall? Which consumption profile carries the most billing disputes?
```

```text
Which regions and profiles have the highest seasonal_ratio (largest winter/summer swing)? Those are candidates for an insulation / thermal-renovation program.
```

- The first three questions deliver the **commercial outcome**: a named at-risk list, then the same for warm upsell prospects, then the revenue at stake. Everything after is colour and credibility.
- Business users are autonomous without SQL knowledge — Genie understands context across all 3 Gold tables.
- ML results (`consumption_profile`), tariff context (`is_flat_tariff`, `plan_name`), and the AI topic (`topic`) are all accessible in plain English.

---

### Prompt 8 (optional): Enrich the dashboard

```text
Add a "Customer Profiles" page to the dashboard with:
- Donut chart: distribution of the 3 consumption profiles (Peak Heavy, Seasonal Spiker, Green Saver)
- Grouped bar chart: average feature values per profile (daily consumption, % peak, seasonal ratio, weekend ratio)
- Bar chart: number of each complaint topic per consumption profile
- Table: top 20 customers with the highest seasonal ratio (candidates for an insulation / thermal renovation program)
- Bar chart: at-risk count (Peak Heavy · flat tariff · billing dispute) by region
```

- Dashboard built iteratively through conversation.
- ML insights (consumption profiles) directly in the BI layer.
- Actionable: "Seasonal Spikers = insulation program", "Peak Heavy on flat tariff + billing dispute = retention call list".
- "The full journey — from raw meter files to an ML-powered retention list — done in 40 minutes."

---
