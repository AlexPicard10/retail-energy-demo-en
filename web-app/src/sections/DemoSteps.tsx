import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  BarChart3,
  Brain,
  Check,
  Code2,
  Copy,
  Database,
  Filter,
  Layers,
  MousePointer2,
  Save,
  Sparkles,
  User,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import SectionHeader from '../components/SectionHeader'

type Group = 'ingest' | 'transform' | 'ml' | 'consume'

type OpName = 'Source' | 'Filter' | 'SQL' | 'Join' | 'Aggregate' | 'AI' | 'Output'

type Instruction = string | { text: string; copy: string; copyLabel?: string }

type Step = {
  id: number
  title: string
  detail: string
  group: Group
  kind: 'manual' | 'prompt'
  tool: string
  flow?: OpName[]
  prompt?: string
  instructions?: Instruction[]
  databricks: string[]
  assets: string[]
  icon: LucideIcon
}

const opIcons: Record<OpName, LucideIcon> = {
  Source: Database,
  Filter: Filter,
  SQL: Code2,
  Join: Workflow,
  Aggregate: Layers,
  AI: Sparkles,
  Output: Save,
}

const groups: Record<Group, { label: string; color: string; dot: string }> = {
  ingest: { label: 'Ingest', color: '#00AAFF', dot: 'bg-engie-blue' },
  transform: { label: 'Transform', color: '#0033A0', dot: 'bg-engie-deep' },
  ml: { label: 'ML', color: '#E5005B', dot: 'bg-engie-magenta' },
  consume: { label: 'Consume', color: '#00C389', dot: 'bg-engie-green' },
}

const steps: Step[] = [
  {
    id: 1,
    title: 'Add the source files to the canvas',
    detail: 'Drop a Source node onto a new Visual Data Prep flow for each of the 5 raw files.',
    group: 'ingest',
    kind: 'manual',
    icon: Database,
    tool: 'On the canvas',
    flow: ['Source'],
    instructions: [
      'Open Visual Data Prep and create a new flow named `energy_retail_visual_prep`.',
      'For each raw file in `/Volumes/<YOUR_CATALOG>/energy_retail_demo/raw_data/`, drop a **Source** node: `raw_customers.csv`, `raw_consumption.csv`, `raw_billing.csv`, `raw_tariff_plans.csv`, `raw_customer_interactions.json`.',
      'Let schema inference run and preview a few rows on each Source so the team sees the data — including the nested JSON of the interactions file.',
    ],
    databricks: ['Visual Data Prep canvas', 'Source node on UC Volumes', 'Schema inference + preview'],
    assets: [
      'Visual Data Prep flow `energy_retail_visual_prep`',
      '5 Source nodes on the canvas (4 CSV + 1 nested JSON)',
    ],
  },
  {
    id: 2,
    title: 'Build the customer energy profile',
    detail: 'One business prompt to Visual Data Prep → one final Gold table for ML.',
    group: 'transform',
    kind: 'prompt',
    icon: Layers,
    tool: 'Visual Data Prep prompt',
    prompt: `Build me one customer table I can use to find upsell
opportunities — one row per customer, bringing together their
consumption habits, billing behaviour, and current tariff from
the four sources on the canvas.

For each customer I need:

  • Consumption habits — their average daily kWh, the ratio of
    weekend to weekday consumption, the ratio of winter to summer
    consumption, and how their monthly consumption trended over
    the year.

  • Billing behaviour — what share of their kWh falls on peak
    hours, and how reliably they pay (paid bills vs total bills).

  • Current tariff — plan id, plan name, plan type, peak and
    off-peak rates, plus a flag is_flat_tariff that is true when
    the peak and off-peak rates are essentially the same.

Build it as a readable Visual Data Prep flow using native operators
rather than a single SQL block.

Before publishing, double-check that the table has every customer
in it and that nobody ends up with a zero average daily kWh — if
some do, a join or filter is dropping their consumption rows.

Publish to \`<YOUR_CATALOG>.energy_retail_demo.gold_customer_energy_profile\`.
That's the only output of this flow.`,
    databricks: ['Visual Data Prep · natural-language build', 'Auto-generated Source → Filter → Join → Aggregate nodes', 'One Output to UC as managed Delta'],
    assets: [
      '`gold_customer_energy_profile` — one row per customer · 6 ML features + tariff context (incl. `is_flat_tariff` flag)',
      'Visual Data Prep flow with a clean, single-output DAG',
    ],
  },
  {
    id: 3,
    title: 'AI-classify customer interactions',
    detail: 'Aggregate distinct → AI classify → NL prompt joins back → Output. Only ~30 LLM calls.',
    group: 'transform',
    kind: 'manual',
    icon: Sparkles,
    tool: 'On the canvas',
    flow: ['Source', 'Aggregate', 'AI', 'Join', 'Output'],
    instructions: [
      'On the `raw_customer_interactions` Source node, drop an **Aggregate** operator and set it to keep `raw_message` distinct. The SMS-style templates collapse 15 000 rows to ~30 unique messages.',
      {
        text: 'Drop an **AI** operator after the Aggregate. Configure: function `ai_classify`, input column `raw_message`, output column `topic`, endpoint `databricks-meta-llama-3-1-8b-instruct`. Paste these as the candidate labels:',
        copy: `billing dispute, service outage, tariff inquiry, meter issue, general feedback`,
        copyLabel: 'Candidate labels',
      },
      {
        text: 'Use Visual Data Prep\'s NL prompt to wire the topics back to every customer:',
        copy: `Goal
  One row per customer with their last message and its classified topic.

How
  • For each customer, keep only their most recent interaction.
  • Join the AI step's output on the message text to attach the topic.

Output schema
  • customer_id
  • raw_message   (the customer's last message)
  • topic         (clean string, e.g. "billing dispute")

Important
  The topic column must be the plain text label only — e.g.
  "billing dispute".`,
        copyLabel: 'NL prompt · join topics back to customers',
      },
      'End with an **Output** node — write one row per customer to `<YOUR_CATALOG>.energy_retail_demo.gold_customer_topics`.',
    ],
    databricks: ['Visual Data Prep · Aggregate + AI operators', '`ai_classify` on Mosaic AI · 8B endpoint', 'DISTINCT + join-back optimization (~500× fewer LLM calls)'],
    assets: [
      '`gold_customer_topics` — one row per customer with their last-message topic',
      '~30 distinct messages classified instead of 15 000 → seconds instead of minutes',
    ],
  },
  {
    id: 4,
    title: 'Train a K-Means consumption classifier',
    detail: 'Semi-supervised K-Means (k=3) tracked in MLflow → labeled model registered in Unity Catalog.',
    group: 'ml',
    kind: 'prompt',
    icon: Brain,
    tool: 'Genie Code prompt',
    prompt: `Create a new notebook for this step (separate from any
previous work — keep the training isolated and easy to re-run).

Train a K-Means consumption classifier with k=3 to group our customers
into 3 distinct consumption profiles.

Training source:
\`<YOUR_CATALOG>.energy_retail_demo.gold_customer_energy_profile\`

It also carries tariff and topic columns — ignore those, they're for
the analysis layer. Cluster only on these 6 consumption features:
  • avg_daily_kwh
  • peak_consumption_pct
  • weekend_ratio
  • seasonal_ratio
  • consumption_trend
  • payment_reliability_pct

Runtime: Serverless notebook — pull the 5 000 rows into pandas, scale
the features, and use scikit-learn. Before registering the model, set
the MLflow registry to the Unity Catalog one and use the 3-part UC name.

Pipeline: StandardScaler + KMeans(k=3). Track the run in MLflow and
log the silhouette score, the inertia, and the trained pipeline as
an artifact.

Also produce and log these 3 visualizations as MLflow figures:
  • A cluster-center heatmap (3 clusters × 6 features, values in real units)
  • Feature-distribution boxplots, one panel per feature, colored by cluster
  • A 2D PCA projection of the scaled features, points colored by cluster

After fitting, inspect the cluster centers (in real units, not z-scores)
and assign each cluster_id ONE of these 3 business labels:
  • Peak Heavy      — high peak share + high overall daily kWh
  • Seasonal Spiker — strong winter vs summer consumption swing
  • Green Saver     — low overall daily kWh + reliable payments

Document the final cluster_id → label mapping in the model description
(the DLT scoring step in the next prompt depends on it).

Register the pipeline in Unity Catalog as
\`<YOUR_CATALOG>.energy_retail_demo.consumption_classifier\` (v1).`,
    databricks: ['MLflow Tracking + Model Registry', 'Unity Catalog model governance', 'Scikit-learn KMeans on the driver'],
    assets: [
      'MLflow run with silhouette + inertia + 3 figures (centroid heatmap, per-feature boxplots, 2D PCA)',
      '`consumption_classifier` v1 registered in UC',
      '3 named consumption profiles: Peak Heavy · Seasonal Spiker · Green Saver',
    ],
  },
  {
    id: 5,
    title: 'Score every customer with a Declarative Pipeline',
    detail: 'A small Lakeflow Declarative Pipeline applies the K-Means model to every customer.',
    group: 'ml',
    kind: 'prompt',
    icon: Brain,
    tool: 'Genie Code prompt',
    prompt: `Build a Lakeflow Declarative Pipeline named
\`energy_retail_classification_pipeline\` that scores every retail
customer with the pre-trained K-Means consumption classifier.

Input table — read directly from Unity Catalog:
\`<YOUR_CATALOG>.energy_retail_demo.gold_customer_energy_profile\`

It has one row per customer with these columns:
  • customer_id
  • 6 numeric consumption features (the model's input):
    avg_daily_kwh, peak_consumption_pct, weekend_ratio,
    seasonal_ratio, consumption_trend, payment_reliability_pct
  • Tariff context to pass through unchanged: plan_id, plan_name,
    plan_type, peak_rate_eur_kwh, off_peak_rate_eur_kwh,
    is_flat_tariff

Apply 3 sanity checks on the input view via \`@dp.expect_or_drop\`:
  • customer_id IS NOT NULL
  • avg_daily_kwh > 0
  • payment_reliability_pct BETWEEN 0 AND 100

Pre-trained model (already registered in Unity Catalog):
\`<YOUR_CATALOG>.energy_retail_demo.consumption_classifier\`
Load it with the appropriate MLflow loader for Unity Catalog models.
It returns an integer cluster_id (0..2) for each row.

Create a materialized view
\`<YOUR_CATALOG>.energy_retail_demo.gold_customer_classifications\`
with one row per customer:
  • customer_id (from input)
  • cluster_id (int, raw model output)
  • consumption_profile (string) — map cluster_id to one of the 3
    business labels assigned during training. The exact cluster_id
    order is documented in the consumption_classifier model
    description (typical mapping on this data, adjust if your
    training assigned a different order):
        0 → 'Peak Heavy'
        1 → 'Seasonal Spiker'
        2 → 'Green Saver'
  • All tariff columns from the input, passed through unchanged.`,
    databricks: ['Lakeflow Declarative Pipelines', '`@dp.expect_or_drop` (3 sanity checks)', '`mlflow.pyfunc` inside `@dp.materialized_view`'],
    assets: [
      '`energy_retail_classification_pipeline` (DLT) with 3 expectations',
      '`gold_customer_classifications` — one row per customer, scored and labeled',
      'Consumption profile joinable with tariff context + AI topic — the 3-way upsell signal',
    ],
  },
  {
    id: 6,
    title: 'Image-to-dashboard',
    detail: 'AI/BI builds a working dashboard from a hand-drawn mockup.',
    group: 'consume',
    kind: 'prompt',
    icon: BarChart3,
    tool: 'Genie · AI/BI prompt',
    prompt: `Build me this AI/BI Dashboard from the attached hand-drawn
mockup — match the layout, KPI tiles, charts and drill-down shown
in the image.

Data sources — join these 3 Gold tables in
\`<YOUR_CATALOG>.energy_retail_demo\`:
  • gold_customer_energy_profile — consumption habits + tariff context
  • gold_customer_classifications — named consumption profile per customer
  • gold_customer_topics — dominant complaint topic per customer

The at-risk drill-down filter at the bottom is:
  consumption_profile = 'Peak Heavy' AND is_flat_tariff = true
  AND topic = 'billing dispute'.

Use one wide shared dataset across widgets so they cross-filter via
Lakeview associativity.`,
    databricks: ['AI/BI Dashboards', 'Multimodal image-to-dashboard prompt', 'Lakeview associativity (cross-filter)'],
    assets: [
      'AI/BI Dashboard with KPIs, profile mix, topic mix, regional breakdown',
      'Cross-filtered widgets on one shared Gold dataset',
    ],
  },
  {
    id: 7,
    title: 'Conversational exploration with Genie',
    detail: 'Natural-language Q&A → ML insight → AI topic → at-risk action list.',
    group: 'consume',
    kind: 'prompt',
    icon: Sparkles,
    tool: 'Genie · natural-language question',
    prompt: `"Show me the Peak Heavy customers who are on a flat tariff plan
(is_flat_tariff = true) AND whose dominant complaint topic is
'billing dispute'. Order by avg_daily_kwh desc. Include their
plan_name and payment_reliability_pct — these are our highest-value
at-risk customers and the call list for tomorrow morning."

Follow-ups in the guide:
  • Same query for topic = 'tariff inquiry' — softer signal but warmer prospects
  • Average annual revenue € at risk per customer in this list
  • Distribution of these at-risk targets by region
  • Which flat-tariff plans contribute the most candidates?`,
    databricks: ['Genie Spaces', 'NL → SQL on Gold tables', 'UC permissions enforced'],
    assets: [
      'Genie Space wired to the 3 Gold tables',
      'Actionable at-risk list combining ML profile + AI topic + tariff',
    ],
  },
]

export default function DemoSteps() {
  const [active, setActive] = useState(0)
  const [copied, setCopied] = useState(false)
  const [catalog, setCatalog] = useState('')
  const step = steps[active]
  const g = groups[step.group]
  const substitute = (s: string) => s.replace(/<YOUR_CATALOG>/g, catalog || '<YOUR_CATALOG>')
  const promptText = step.prompt ? substitute(step.prompt) : ''

  const copyPrompt = async () => {
    if (!step.prompt) return
    await navigator.clipboard.writeText(promptText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <section id="prompts" className="pt-4 pb-20 md:pt-6 md:pb-24">
      <div className="container-pitch">
        <SectionHeader
          number="04"
          kicker="The 7 steps · live tools"
          title={
            <>
              Walk the 7 steps —{' '}
              <span className="text-gradient">two on the canvas, the rest as plain-English prompts.</span>
            </>
          }
          subtitle="Pick a step, set your catalog. Manual steps walk you through the canvas; prompt steps give you the exact text to paste into Visual Data Prep or Genie Code."
        />

        <div className="card-strong overflow-hidden p-5 md:p-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 rounded-full border border-engie-blue/30 bg-engie-blue/5 px-3 py-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-engie-deep">
                  Catalog
                </span>
                <input
                  type="text"
                  value={catalog}
                  onChange={(e) => setCatalog(e.target.value)}
                  placeholder="your_catalog"
                  spellCheck={false}
                  className="w-64 bg-transparent font-mono text-[12px] text-engie-navy outline-none placeholder:text-engie-navy/30"
                />
              </label>
              <div className="flex items-center gap-2">
                {(Object.keys(groups) as Group[]).map((k) => (
                  <span key={k} className="flex items-center gap-1.5 rounded-full border border-engie-deep/15 bg-white px-2.5 py-1 text-[11px] text-engie-navy/65">
                    <span className={`h-2 w-2 rounded-full ${groups[k].dot}`} />
                    {groups[k].label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            {/* Step rail */}
            <div className="space-y-2">
              {steps.map((s, i) => {
                const isActive = i === active
                const sg = groups[s.group]
                return (
                  <button
                    key={s.id}
                    onClick={() => setActive(i)}
                    className={`group flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition ${
                      isActive
                        ? 'border-engie-blue/50 bg-gradient-to-r from-engie-blue/10 via-white to-white shadow-md'
                        : 'border-engie-deep/10 bg-white hover:border-engie-deep/20'
                    }`}
                  >
                    <div
                      className="flex h-9 w-9 flex-none items-center justify-center rounded-lg font-display text-sm font-bold transition"
                      style={
                        isActive
                          ? { backgroundColor: sg.color, color: '#fff', boxShadow: `0 8px 24px -8px ${sg.color}` }
                          : { backgroundColor: 'rgba(0,30,98,0.05)', color: 'rgba(10,26,47,0.6)' }
                      }
                    >
                      {s.id}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-engie-navy/55">
                          <span className={`h-1.5 w-1.5 rounded-full ${sg.dot}`} />
                          {sg.label}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate font-display text-sm font-bold text-engie-navy">{s.title}</div>
                      <div className="truncate text-[12px] text-engie-navy/60">{s.detail}</div>
                    </div>
                    {isActive && <span className="h-6 w-1 flex-none rounded-full" style={{ backgroundColor: sg.color }} />}
                  </button>
                )
              })}
            </div>

            {/* Active step detail */}
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.3 }}
                className="rounded-2xl border border-engie-deep/10 bg-gradient-to-br from-white via-white to-engie-blue/[0.03] p-6"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-6 items-center rounded-full px-2.5 font-mono text-[10px] uppercase tracking-wider text-white"
                        style={{ backgroundColor: g.color }}
                      >
                        Step {step.id} / {steps.length}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-engie-navy/55">{g.label}</span>
                    </div>
                    <h3 className="mt-3 font-display text-2xl font-bold leading-tight tracking-tight text-engie-navy">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-sm text-engie-navy/65">{step.detail}</p>
                  </div>
                  <div
                    className="flex h-12 w-12 flex-none items-center justify-center rounded-xl text-white shadow-lg"
                    style={{ backgroundColor: g.color }}
                  >
                    <step.icon className="h-5 w-5" />
                  </div>
                </div>

                {step.kind === 'manual' ? (
                  <ManualPanel
                    flow={step.flow ?? []}
                    instructions={(step.instructions ?? []).map((ins) =>
                      typeof ins === 'string'
                        ? substitute(ins)
                        : { ...ins, text: substitute(ins.text), copy: substitute(ins.copy) }
                    )}
                    accent={g.color}
                  />
                ) : (
                  <div className="mt-5 overflow-hidden rounded-xl border border-engie-navy/15 bg-engie-navy">
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-engie-glow" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-engie-glow">
                          {step.tool}
                        </span>
                      </div>
                      <button
                        onClick={copyPrompt}
                        className="flex items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-white/20"
                      >
                        {copied ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-engie-green" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[12px] leading-relaxed text-white/90 whitespace-pre-wrap break-words">
                      {promptText}
                    </pre>
                  </div>
                )}

                {/* Databricks features used */}
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-engie-deep/10 bg-engie-blue/[0.04] p-4">
                    <div className="kicker mb-2.5 flex items-center gap-2 text-engie-deep">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-engie-deep text-white">
                        <DatabricksIcon className="h-3 w-3" />
                      </span>
                      Databricks features
                    </div>
                    <ul className="space-y-1.5">
                      {step.databricks.map((d) => (
                        <li key={d} className="flex items-start gap-2 text-[12.5px] text-engie-navy/85">
                          <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-engie-blue" />
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-engie-magenta/15 bg-engie-magenta/[0.04] p-4">
                    <div className="kicker mb-2.5 flex items-center gap-2 text-engie-magenta">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-engie-magenta text-white">
                        <Sparkles className="h-3 w-3" />
                      </span>
                      Assets created
                    </div>
                    <ul className="space-y-1.5">
                      {step.assets.map((a) => (
                        <li key={a} className="flex items-start gap-2 text-[12.5px] text-engie-navy/85">
                          <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-engie-magenta" />
                          <span dangerouslySetInnerHTML={{ __html: a.replace(/`([^`]+)`/g, '<code class="font-mono text-[11.5px] text-engie-navy bg-white/80 px-1 py-0.5 rounded">$1</code>') }} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Genie chat preview — only on step 8 */}
                {step.id === 7 && <GenieChatPreview />}

                {/* Mini progress bar */}
                <div className="mt-6 flex items-center gap-1.5">
                  {steps.map((_, i) => (
                    <span
                      key={i}
                      className="h-1 flex-1 rounded-full transition-all"
                      style={{
                        backgroundColor: i <= active ? g.color : 'rgba(0,30,98,0.1)',
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}

function ManualPanel({
  flow,
  instructions,
  accent,
}: {
  flow: OpName[]
  instructions: Instruction[]
  accent: string
}) {
  const renderText = (text: string) =>
    text
      .replace(
        /```sql\n([\s\S]*?)\n```/g,
        '<pre class="mt-2 mb-1 overflow-x-auto rounded-md border border-engie-navy/10 bg-engie-navy px-3 py-2 font-mono text-[11.5px] leading-relaxed text-engie-glow whitespace-pre">$1</pre>'
      )
      .replace(
        /`([^`]+)`/g,
        '<code class="font-mono text-[11.5px] text-engie-navy bg-engie-blue/10 px-1 py-0.5 rounded">$1</code>'
      )
      .replace(
        /\*\*([^*]+)\*\*/g,
        '<strong class="font-semibold text-engie-deep">$1</strong>'
      )
      .replace(
        /\*([^*]+)\*/g,
        '<em class="italic text-engie-navy">$1</em>'
      )


  return (
    <div className="mt-5 space-y-4">
      {/* Mini-flow chip chain */}
      {flow.length > 0 && (
        <div className="rounded-xl border border-engie-deep/10 bg-white/85 p-3.5">
          <div className="kicker mb-3 flex items-center gap-2 text-engie-deep/70">
            <Workflow className="h-3.5 w-3.5" />
            Visual Data Prep operators
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {flow.map((op, i) => {
              const Icon = opIcons[op]
              return (
                <span key={i} className="flex items-center gap-2">
                  <span
                    className="flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 shadow-sm"
                    style={{ borderColor: accent + '55' }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
                    <span
                      className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em]"
                      style={{ color: accent }}
                    >
                      {op}
                    </span>
                  </span>
                  {i < flow.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-engie-navy/35" />
                  )}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Numbered checklist */}
      <div className="rounded-xl border border-engie-deep/10 bg-white p-4">
        <div className="kicker mb-3 flex items-center gap-2 text-engie-deep/70">
          <MousePointer2 className="h-3.5 w-3.5" />
          On the canvas
        </div>
        <ol className="space-y-2.5">
          {instructions.map((ins, i) => {
            const text = typeof ins === 'string' ? ins : ins.text
            const copy = typeof ins === 'string' ? null : ins.copy
            const copyLabel = typeof ins === 'string' ? undefined : ins.copyLabel
            return (
              <li key={i} className="flex items-start gap-3">
                <span
                  className="flex h-6 w-6 flex-none items-center justify-center rounded-full font-mono text-[11px] font-bold text-white"
                  style={{ backgroundColor: accent }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <span
                    className="text-[13px] leading-relaxed text-engie-navy/90"
                    dangerouslySetInnerHTML={{ __html: renderText(text) }}
                  />
                  {copy && <InlineCopyBox content={copy} label={copyLabel} />}
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

function InlineCopyBox({ content, label }: { content: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const onCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="mt-2 overflow-hidden rounded-md border border-engie-navy/15 bg-engie-navy">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-engie-glow">
          {label ?? 'Copy'}
        </span>
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 rounded border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white transition hover:bg-white/20"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-engie-green" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-2 font-mono text-[11.5px] leading-relaxed text-white/90 whitespace-pre-wrap break-words">
        {content}
      </pre>
    </div>
  )
}

function DatabricksIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className}>
      <path d="M8 1 l6 3.5 v7 l-6 3.5 -6 -3.5 v-7 z M8 3.5 L4 5.7 v4.6 L8 12.5 l4 -2.2 v-4.6 z" fill="currentColor" />
    </svg>
  )
}

function GenieChatPreview() {
  const sampleRows = [
    { id: 'CUST-04217', plan: 'Tarif Unique Confort', topic: 'billing dispute', payment: 78, kwh: 4612 },
    { id: 'CUST-01058', plan: 'Offre Entreprise Standard', topic: 'billing dispute', payment: 82, kwh: 4198 },
    { id: 'CUST-03325', plan: 'Tarif Unique Confort', topic: 'billing dispute', payment: 71, kwh: 3984 },
    { id: 'CUST-00891', plan: 'Offre Entreprise Standard', topic: 'billing dispute', payment: 88, kwh: 3722 },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="mt-5 overflow-hidden rounded-xl border border-engie-green/25 bg-gradient-to-br from-engie-green/5 via-white to-white p-4 md:p-5"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="kicker flex items-center gap-2 text-engie-green">
          <Sparkles className="h-3.5 w-3.5" />
          Genie · live preview
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-engie-navy/50">
          natural language → SQL → result
        </span>
      </div>

      <div className="flex items-start gap-2.5">
        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-engie-navy/90 text-white">
          <User className="h-3.5 w-3.5" />
        </span>
        <div className="rounded-2xl rounded-tl-sm bg-engie-navy/[0.06] px-3.5 py-2 text-[13px] text-engie-navy">
          Which <strong>Peak Heavy</strong> customers on a <em>flat tariff</em> have a dominant complaint topic of <em>billing dispute</em>?
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2.5">
        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-engie-green text-white">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="overflow-hidden rounded-2xl rounded-tl-sm border border-engie-deep/10 bg-white shadow-soft">
            <div className="border-b border-engie-deep/10 bg-engie-navy/[0.03] px-3 py-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-engie-navy/55">
                generated SQL · on Gold tables
              </span>
            </div>
            <pre className="overflow-x-auto px-3 py-2.5 font-mono text-[11.5px] leading-relaxed text-engie-navy/90 whitespace-pre-wrap">
{`SELECT k.customer_id,
       p.plan_name,
       t.topic                AS dominant_topic,
       p.payment_reliability_pct,
       p.avg_daily_kwh * 365  AS annual_kwh
FROM   gold_customer_classifications k
JOIN   gold_customer_topics          t USING (customer_id)
JOIN   gold_customer_energy_profile  p USING (customer_id)
WHERE  k.consumption_profile = 'Peak Heavy'
  AND  p.is_flat_tariff
  AND  t.topic = 'billing dispute'
ORDER  BY annual_kwh DESC
LIMIT  1200;`}
            </pre>
          </div>

          <div className="mt-2 overflow-hidden rounded-xl border border-engie-deep/10 bg-white">
            <div className="flex items-center justify-between border-b border-engie-deep/10 px-3 py-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-engie-green">
                result · 42 rows · 0.31 s
              </span>
              <span className="rounded-full bg-engie-green/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-engie-green">
                at-risk list
              </span>
            </div>
            <table className="w-full text-left text-[12px]">
              <thead className="bg-engie-navy/[0.02] text-engie-navy/55">
                <tr>
                  <th className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider">customer_id</th>
                  <th className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider">plan (flat)</th>
                  <th className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider">topic</th>
                  <th className="px-3 py-1.5 text-right font-mono text-[10px] uppercase tracking-wider">paid %</th>
                  <th className="px-3 py-1.5 text-right font-mono text-[10px] uppercase tracking-wider">kWh / yr</th>
                </tr>
              </thead>
              <tbody className="text-engie-navy/85">
                {sampleRows.map((r) => (
                  <tr key={r.id} className="border-t border-engie-deep/5">
                    <td className="px-3 py-1.5 font-mono text-[11px] text-engie-deep">{r.id}</td>
                    <td className="px-3 py-1.5">{r.plan}</td>
                    <td className="px-3 py-1.5 text-engie-navy/70">{r.topic}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-[11px]">{r.payment}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-[11px]">{r.kwh.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="border-t border-engie-deep/5 bg-engie-green/[0.04]">
                  <td colSpan={5} className="px-3 py-1.5 text-center font-mono text-[10.5px] uppercase tracking-wider text-engie-navy/55">
                    + 38 more · €340k estimated annual revenue at risk
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
