import { motion } from 'framer-motion'
import { Users, Zap, Receipt, FileText, MessageSquare, Moon, TrendingUp, Target } from 'lucide-react'

type SourceFile = {
  id: string
  filename: string
  format: 'CSV' | 'JSON'
  rows: string
  rowsRaw: number
  label: string
  blurb: string
  icon: typeof Users
  color: string
}

const sources: SourceFile[] = [
  {
    id: 'customers',
    filename: 'raw_customers.csv',
    format: 'CSV',
    rows: '10,000',
    rowsRaw: 10000,
    label: 'Customers',
    blurb: 'Demographics, tariff plan, EV / solar / household-size enrichment, churn-risk score, target profile.',
    icon: Users,
    color: '#00AAFF',
  },
  {
    id: 'consumption',
    filename: 'raw_consumption.csv',
    format: 'CSV',
    rows: '3.65M',
    rowsRaw: 3650000,
    label: 'Smart-meter readings',
    blurb: 'Daily kWh per customer for a full year · ~5% with realistic anomalies (spikes, flatlines).',
    icon: Zap,
    color: '#F2B843',
  },
  {
    id: 'billing',
    filename: 'raw_billing.csv',
    format: 'CSV',
    rows: '120,000',
    rowsRaw: 120000,
    label: 'Monthly bills',
    blurb: '12 months of bills per customer · amount, kWh billed, peak vs off-peak split, payment status.',
    icon: Receipt,
    color: '#00C389',
  },
  {
    id: 'tariffs',
    filename: 'raw_tariff_plans.csv',
    format: 'CSV',
    rows: '11',
    rowsRaw: 11,
    label: 'Tariff plans',
    blurb: 'Regulated, fixed, indexed, green plans · peak / off-peak rates, standing charge, green-energy %.',
    icon: FileText,
    color: '#7C5CD6',
  },
  {
    id: 'interactions',
    filename: 'raw_customer_interactions.json',
    format: 'JSON',
    rows: '30,000',
    rowsRaw: 30000,
    label: 'Support interactions',
    blurb: 'Nested JSON · 3 levels deep · raw message + interaction type, sentiment, keywords, resolution.',
    icon: MessageSquare,
    color: '#E5005B',
  },
]

const outcomeMetrics = [
  { value: '~80', label: 'Peak Heavy at-risk', sub: 'on flat tariff · billing dispute', color: '#E5005B', icon: Moon },
  { value: '€680k', label: 'Annual revenue at risk', sub: 'in this segment', color: '#0033A0', icon: TrendingUp },
  { value: '40 min', label: 'Files → action', sub: 'Visual Data Prep + Genie Code', color: '#00C389', icon: Target },
]

export default function DataAndOutcome() {
  return (
    <section id="brief" className="pt-4 pb-20 md:pt-6 md:pb-24">
      <div className="container-pitch">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="mb-8 max-w-none"
        >
          <div className="kicker mb-3 flex items-center gap-2">
            <span className="text-engie-magenta">02</span>
            <span className="h-px w-6 bg-engie-deep/30" />
            <span>The brief · data in, decision out</span>
          </div>
          <h2 className="font-display text-2xl font-bold leading-[1.1] tracking-tight text-engie-navy md:text-4xl lg:whitespace-nowrap">
            5 raw files in.{' '}
            <span className="text-gradient-magenta">A named retention call list out.</span>
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-engie-navy/70">
            Before the architecture, the data. Before the prompts, the goal. Here's what lands in the
            Unity Catalog volume — and what the retention team gets back in 40 minutes.
          </p>
        </motion.div>

        {/* Two-column: source data | outcome */}
        <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
          {/* Left: source data grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="card-strong p-4 md:p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="kicker">Source data · 5 raw files in a UC Volume</div>
              <span className="pill">~3.8M rows</span>
            </div>

            <div className="flex flex-col gap-2.5">
              {sources.map((s, i) => (
                <SourceCard key={s.id} source={s} delay={i * 0.06} />
              ))}
            </div>
          </motion.div>

          {/* Right: outcome panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="card-strong relative overflow-hidden p-5 md:p-6"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-60"
              style={{
                background:
                  'radial-gradient(60% 50% at 80% 0%, rgba(229,0,91,0.10), transparent 70%),' +
                  'radial-gradient(60% 50% at 0% 100%, rgba(0,189,255,0.10), transparent 70%)',
              }}
            />
            <div className="relative">
              <div className="kicker text-engie-magenta">Desired outcome · Monday morning</div>
              <div className="mt-1 font-display text-lg font-bold leading-tight text-engie-navy">
                The Peak Heavy at-risk call list
              </div>
              <p className="mt-2 text-sm text-engie-navy/70">
                A named, quantified list of high-revenue customers on a flat tariff and complaining about
                bills — sorted by annual kWh, ready for the retention team to call.
              </p>

              <div className="mt-5 space-y-2.5">
                {outcomeMetrics.map((m, i) => (
                  <OutcomeMetric key={m.label} metric={m} delay={0.3 + i * 0.08} />
                ))}
              </div>

              <div className="mt-5 border-t border-engie-deep/10 pt-4">
                <FunnelViz />
              </div>
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  )
}

/* ------------------------ helpers ------------------------ */

function SourceCard({ source, delay }: { source: SourceFile; delay: number }) {
  const Icon = source.icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay }}
      className="group relative overflow-hidden rounded-xl border border-engie-deep/10 bg-white pl-3 pr-3 py-2.5 transition hover:-translate-y-0.5 hover:shadow-soft"
    >
      <div
        className="absolute inset-y-0 left-0 w-[3px] transition-all group-hover:w-1"
        style={{ backgroundColor: source.color }}
      />
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-white shadow-sm"
          style={{ backgroundColor: source.color }}
        >
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-sm font-extrabold text-engie-navy">{source.label}</span>
            <span
              className="rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider"
              style={{
                backgroundColor: `${source.color}18`,
                color: source.color,
              }}
            >
              {source.format}
            </span>
            <span className="font-mono text-[10px] text-engie-navy/55 truncate">{source.filename}</span>
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-engie-navy/65 line-clamp-1">{source.blurb}</p>
        </div>
        <div className="flex-none text-right">
          <div className="font-display text-base font-extrabold leading-none text-engie-navy">{source.rows}</div>
          <div className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-engie-navy/45">rows</div>
        </div>
      </div>
    </motion.div>
  )
}

function OutcomeMetric({
  metric,
  delay,
}: {
  metric: { value: string; label: string; sub: string; color: string; icon: typeof Users }
  delay: number
}) {
  const Icon = metric.icon
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
      className="flex items-center gap-3 rounded-xl border border-engie-deep/10 bg-white/85 px-3 py-2.5 backdrop-blur"
    >
      <div
        className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-white"
        style={{ backgroundColor: metric.color }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <div className="font-display text-xl font-extrabold text-engie-navy">{metric.value}</div>
          <div className="text-[12px] font-semibold text-engie-navy/80">{metric.label}</div>
        </div>
        <div className="text-[11px] text-engie-navy/55">{metric.sub}</div>
      </div>
    </motion.div>
  )
}

/* ------------------------ Funnel visualization ------------------------ */

const FUNNEL_W = 360
const FUNNEL_H = 130

function FunnelViz() {
  const stages = [
    { label: '10,000 customers', value: 10000, color: '#00AAFF', width: 1.0 },
    { label: 'Peak Heavy segment', value: 4400, color: '#E5005B', width: 0.44 },
    { label: 'At-risk call list', value: 80, color: '#0033A0', width: 0.06 },
  ]

  const barH = 22
  const gap = 14
  const labelW = 130

  return (
    <div>
      <div className="kicker mb-2">From all customers to the actionable list</div>
      <svg
        viewBox={`0 0 ${FUNNEL_W} ${FUNNEL_H}`}
        className="block h-auto w-full"
        role="img"
        aria-label="Funnel from all customers to the Peak Heavy at-risk call list"
      >
        {stages.map((s, i) => {
          const y = 8 + i * (barH + gap)
          const barX = labelW
          const maxBarW = FUNNEL_W - barX - 8
          const w = maxBarW * s.width
          return (
            <g key={s.label}>
              <text
                x={labelW - 8}
                y={y + barH / 2 + 4}
                textAnchor="end"
                fontSize="11"
                fontFamily="Plus Jakarta Sans, sans-serif"
                fontWeight={600}
                fill="rgba(0,30,98,0.78)"
              >
                {s.label}
              </text>
              <rect
                x={barX}
                y={y}
                width={maxBarW}
                height={barH}
                rx={6}
                fill="rgba(0,30,98,0.05)"
              />
              <motion.rect
                initial={{ width: 0 }}
                whileInView={{ width: w }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.9, delay: 0.4 + i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                x={barX}
                y={y}
                height={barH}
                rx={6}
                fill={s.color}
              />
              <motion.text
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.9 + i * 0.15 }}
                x={barX + 8}
                y={y + barH / 2 + 4}
                fontSize="11"
                fontFamily="JetBrains Mono, monospace"
                fontWeight={700}
                fill="#fff"
              >
                {s.value.toLocaleString()}
              </motion.text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
