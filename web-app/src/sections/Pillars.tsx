import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Database, Brain, BarChart3, Sparkles, Check, MousePointer2, type LucideIcon } from 'lucide-react'
import SectionHeader from '../components/SectionHeader'

type PillarKey = 'de' | 'ds' | 'analytics'

type Tool = 'visual-data-prep' | 'genie-code'

type Pillar = {
  key: PillarKey
  badge: string
  title: string
  tagline: string
  icon: LucideIcon
  color: string
  gradient: string
  duration: string
  tool: Tool
  prompt: string
  outcomes: string[]
  features: string[]
}

const pillars: Pillar[] = [
  {
    key: 'de',
    badge: 'Data Engineering',
    title: 'Visual Data Prep',
    tagline: 'Bronze → Silver → Gold, built on a no-code visual canvas.',
    icon: Database,
    color: '#00AAFF',
    gradient: 'from-engie-blue/15 via-white to-white',
    duration: '15 min',
    tool: 'visual-data-prep',
    prompt:
      'Step 1 · Add 5 Source nodes for the raw CSV + JSON files.\nStep 2 · Bronze: built-in data-quality rules (null checks, value ranges, email format).\nStep 3 · Silver: visual joins for FK validation + a Custom SQL node with LATERAL VIEW EXPLODE for the 3-level JSON.\nStep 4 · Gold: Group-By nodes + Custom SQL for seasonal_ratio, consumption_trend, payment_reliability_pct. Publish to UC.',
    outcomes: [
      '5 Bronze tables · drop-on-fail quality rules',
      'Silver: nested JSON flattened via Custom SQL node',
      'Gold: customer · revenue · regional marts in UC',
    ],
    features: ['Visual Data Prep', 'Serverless materialization', 'Unity Catalog'],
  },
  {
    key: 'ds',
    badge: 'Data Science',
    title: 'K-Means + a dedicated Lakeflow pipeline',
    tagline: 'Train with Genie Code, then build a new pipeline that applies the model.',
    icon: Brain,
    color: '#E5005B',
    gradient: 'from-engie-magenta/15 via-white to-white',
    duration: '12 min',
    tool: 'genie-code',
    prompt:
      '"Train a K-Means classifier on gold_customer_energy_profile with a hyperparameter sweep (k=2..5, init, n_init). Track with MLflow, pick the best by silhouette. Typical winner is k=3 with clusters Seasonal Spiker, Peak Heavy, Green Saver. Register in UC as consumption_classifier."\n\n"Then create a new Spark Declarative Pipeline that reads gold_customer_energy_profile, loads consumption_classifier from UC, and produces gold_customer_classifications."',
    outcomes: [
      'MLflow experiment · silhouette + inertia logged',
      'UC model consumption_classifier v1',
      'New Lakeflow pipeline applies the model · gold_customer_classifications',
    ],
    features: ['MLflow', 'Unity Catalog Models', 'Lakeflow Declarative Pipeline'],
  },
  {
    key: 'analytics',
    badge: 'Analytics',
    title: 'AI/BI Dashboard + Genie',
    tagline: 'Mockup in. Working dashboard out. Then ask anything.',
    icon: BarChart3,
    color: '#00C389',
    gradient: 'from-engie-green/15 via-white to-white',
    duration: '13 min',
    tool: 'genie-code',
    prompt:
      '"Generate an AI/BI Dashboard from this mockup image. Use the Gold tables. Minimize datasets so widgets cross-filter via associativity. Then open Genie on the same tables for live Q&A."',
    outcomes: [
      'AI/BI dashboard from a hand-drawn sketch',
      'Cross-filtered widgets on a shared dataset',
      'Genie answers business questions in plain language',
    ],
    features: ['AI/BI Dashboards', 'Lakeview associativity', 'Genie Spaces'],
  },
]

export default function Pillars() {
  const [active, setActive] = useState<PillarKey>('de')
  const p = pillars.find((x) => x.key === active)!

  return (
    <section id="pillars" className="pt-4 pb-20 md:pt-6 md:pb-24">
      <div className="container-pitch">
        <SectionHeader
          number="02"
          kicker="Three pillars · 45 minutes"
          title={
            <>
              One workshop, <span className="text-gradient">three production muscles.</span>
            </>
          }
          subtitle="Visual Data Prep handles the data engineering pillar; Genie Code drives Data Science and Analytics. Each pillar lands a real artifact a Databricks customer can ship."
        />

        <div className="card-strong overflow-hidden p-5 md:p-7">
          {/* Tab rail */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {pillars.map((tab) => {
              const isActive = tab.key === active
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => setActive(tab.key)}
                  className={`group flex items-center gap-2.5 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'border-transparent text-white shadow-md'
                      : 'border-engie-deep/15 bg-white text-engie-navy/75 hover:border-engie-deep/30'
                  }`}
                  style={
                    isActive
                      ? { backgroundColor: tab.color, boxShadow: `0 10px 28px -10px ${tab.color}` }
                      : undefined
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.badge}</span>
                  <span
                    className={`ml-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                      isActive ? 'bg-white/20 text-white' : 'bg-engie-navy/5 text-engie-navy/55'
                    }`}
                  >
                    {tab.duration}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Active pillar panel */}
          <AnimatePresence mode="wait">
            <motion.div
              key={p.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className={`grid gap-5 rounded-2xl border border-engie-deep/10 bg-gradient-to-br ${p.gradient} p-6 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:p-8`}
            >
              {/* Left: title + prompt */}
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-7 items-center rounded-full px-2.5 font-mono text-[10px] uppercase tracking-wider text-white"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.badge}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-engie-navy/55">
                    Pillar · {p.duration}
                  </span>
                </div>
                <h3 className="mt-3 font-display text-2xl font-bold leading-tight tracking-tight text-engie-navy md:text-3xl">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm text-engie-navy/70 md:text-base">{p.tagline}</p>

                <div className="mt-5 overflow-hidden rounded-xl border border-engie-navy/15 bg-engie-navy">
                  <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
                    {p.tool === 'visual-data-prep' ? (
                      <MousePointer2 className="h-3.5 w-3.5 text-engie-glow" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-engie-glow" />
                    )}
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-engie-glow">
                      {p.tool === 'visual-data-prep' ? 'Visual Data Prep · canvas steps' : 'Genie Code prompt'}
                    </span>
                  </div>
                  <pre className="overflow-x-auto whitespace-pre-wrap break-words px-4 py-3.5 font-mono text-[12px] leading-relaxed text-white/90">
                    {p.prompt}
                  </pre>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {p.features.map((f) => (
                    <span
                      key={f}
                      className="rounded-full border border-engie-deep/15 bg-white px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-engie-navy/65"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right: outcomes */}
              <div className="rounded-xl border border-engie-deep/10 bg-white/85 p-5 backdrop-blur">
                <div className="kicker mb-3 flex items-center gap-2" style={{ color: p.color }}>
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-md text-white"
                    style={{ backgroundColor: p.color }}
                  >
                    <Check className="h-3 w-3" />
                  </span>
                  Outcome chips · what lands
                </div>
                <ul className="space-y-3">
                  {p.outcomes.map((o, i) => (
                    <motion.li
                      key={o}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, delay: 0.15 + i * 0.1 }}
                      className="flex items-start gap-3 rounded-lg bg-white px-3 py-2.5 shadow-soft"
                    >
                      <span
                        className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full text-white"
                        style={{ backgroundColor: p.color }}
                      >
                        <Check className="h-3 w-3" />
                      </span>
                      <span className="text-[13px] leading-relaxed text-engie-navy/85">{o}</span>
                    </motion.li>
                  ))}
                </ul>

                <div className="mt-5 flex items-center gap-2 border-t border-engie-deep/10 pt-4">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-engie-navy/45">
                    Pacing
                  </span>
                  <div className="relative h-1.5 flex-1 rounded-full bg-engie-navy/10">
                    <motion.span
                      key={`bar-${p.key}`}
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.9, delay: 0.2 }}
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-engie-navy/70">{p.duration}</span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
