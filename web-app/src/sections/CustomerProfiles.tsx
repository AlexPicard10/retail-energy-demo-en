import { motion, useInView } from 'framer-motion'
import { Flame, ThermometerSun, Leaf, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import SectionHeader from '../components/SectionHeader'

const profiles = [
  {
    id: 'seasonal',
    name: 'Seasonal Spiker',
    icon: <ThermometerSun className="h-5 w-5" />,
    color: '#FF7A59',
    share: 28,
    avgKwh: 16.1,
    monthly: 95,
    blurb: 'Large winter/summer gap — candidates for thermal-insulation programs and bill-smoothing plans.',
    feature: 'High seasonal ratio',
  },
  {
    id: 'peak-heavy',
    name: 'Peak Heavy',
    icon: <Flame className="h-5 w-5" />,
    color: '#E5005B',
    share: 44,
    avgKwh: 18.6,
    monthly: 121,
    blurb: 'Heavy peak-hour usage — highest-revenue segment; the at-risk ones are our top retention targets.',
    feature: 'High peak %',
  },
  {
    id: 'green',
    name: 'Green Saver',
    icon: <Leaf className="h-5 w-5" />,
    color: '#00C389',
    share: 28,
    avgKwh: 6.4,
    monthly: 38,
    blurb: 'Low overall consumption + reliable payer — natural fit for green-energy bundles and loyalty rewards.',
    feature: 'Low avg daily kWh',
  },
]

export default function CustomerProfiles() {
  return (
    <section id="profiles" className="pt-4 pb-20 md:pt-6 md:pb-24">
      <div className="container-pitch">
        <SectionHeader
          number="05"
          kicker="ML insights, productized"
          title={<>Three customer profiles, <span className="text-gradient-magenta">three business plays.</span></>}
          subtitle="The K-Means model discovers natural consumption patterns. Genie Code labels each cluster with a business-meaningful name — turning statistical clusters into actionable segments."
        />

        {/* K-Means cluster reveal */}
        <ClusterReveal />

        {/* Profile cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {profiles.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: i * 0.06 }}
              className="card group relative overflow-hidden p-5 transition hover:-translate-y-1 hover:shadow-glow"
            >
              <div
                className="absolute inset-x-0 top-0 h-1 transition-all group-hover:h-1.5"
                style={{ backgroundColor: p.color }}
              />
              <div
                className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md"
                style={{ backgroundColor: p.color }}
              >
                {p.icon}
              </div>
              <div className="font-display text-lg font-bold text-engie-navy">{p.name}</div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-engie-navy/50">{p.feature}</div>
              <p className="mt-3 min-h-[64px] text-sm leading-relaxed text-engie-navy/75">{p.blurb}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-engie-deep/10 pt-3 text-center">
                <Metric value={`${p.share}%`} label="share" />
                <Metric value={p.avgKwh.toString()} label="kWh/d" />
                <Metric value={`€${p.monthly}`} label="bill/mo" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Punchline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="mt-10 overflow-hidden rounded-2xl bg-engie-gradient p-1 shadow-glow"
        >
          <div className="rounded-2xl bg-white p-6 md:p-8">
            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="kicker mb-2 text-engie-magenta">The closing Genie question</div>
                <div className="font-display text-xl font-bold leading-tight text-engie-navy md:text-2xl">
                  &ldquo;Which Peak Heavy customers on a flat tariff are complaining about their bills?
                  That&rsquo;s our top retention call list for tomorrow.&rdquo;
                </div>
                <p className="mt-3 text-sm text-engie-navy/65">
                  ML insight → business action, in plain English, on your governed Lakehouse.
                </p>
              </div>
              <div className="flex flex-col items-start gap-2 md:items-end">
                <span className="pill-magenta">SQL-free</span>
                <span className="pill">UC-governed</span>
                <span className="pill-green">Live data</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-base font-extrabold text-engie-navy">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-engie-navy/50">{label}</div>
    </div>
  )
}

/* --------- K-Means cluster reveal --------- */

const VIEW_W = 760
const VIEW_H = 320
const PAD = { top: 24, right: 24, bottom: 38, left: 56 }
const PLOT_W = VIEW_W - PAD.left - PAD.right
const PLOT_H = VIEW_H - PAD.top - PAD.bottom

// Cluster centroids in data space (peak_consumption_pct, seasonal_ratio)
const CENTROIDS = [
  { id: 'seasonal', name: 'Seasonal Spiker', color: '#FF7A59', x: 50, y: 2.55, n: 95 },
  { id: 'peak-heavy', name: 'Peak Heavy', color: '#E5005B', x: 78, y: 1.55, n: 115 },
  { id: 'green', name: 'Green Saver', color: '#00C389', x: 35, y: 1.20, n: 90 },
] as const

const X_DOMAIN: [number, number] = [5, 95] // peak %
const Y_DOMAIN: [number, number] = [0.9, 3.1] // seasonal ratio

function scaleX(v: number) {
  return PAD.left + ((v - X_DOMAIN[0]) / (X_DOMAIN[1] - X_DOMAIN[0])) * PLOT_W
}
function scaleY(v: number) {
  return PAD.top + (1 - (v - Y_DOMAIN[0]) / (Y_DOMAIN[1] - Y_DOMAIN[0])) * PLOT_H
}

// Deterministic hash → reproducible jitter without re-renders shuffling positions
function mulberry32(seed: number) {
  let t = seed
  return () => {
    t |= 0
    t = (t + 0x6d2b79f5) | 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

type Dot = {
  id: number
  cluster: typeof CENTROIDS[number]
  scrambledX: number
  scrambledY: number
  targetX: number
  targetY: number
}

function ClusterReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-120px' })
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (!inView) return
    const t = setTimeout(() => setRevealed(true), 1500)
    return () => clearTimeout(t)
  }, [inView])

  const dots: Dot[] = useMemo(() => {
    const rand = mulberry32(7)
    const out: Dot[] = []
    let i = 0
    for (const c of CENTROIDS) {
      for (let k = 0; k < c.n; k++) {
        // jittered target around the centroid (data space)
        const dx = (rand() - 0.5) * 14
        const dy = (rand() - 0.5) * 0.32
        const tx = Math.max(X_DOMAIN[0] + 1, Math.min(X_DOMAIN[1] - 1, c.x + dx))
        const ty = Math.max(Y_DOMAIN[0] + 0.05, Math.min(Y_DOMAIN[1] - 0.05, c.y + dy))
        // scrambled "raw" position uniformly across the plot
        const sx = X_DOMAIN[0] + 2 + rand() * (X_DOMAIN[1] - X_DOMAIN[0] - 4)
        const sy = Y_DOMAIN[0] + 0.1 + rand() * (Y_DOMAIN[1] - Y_DOMAIN[0] - 0.2)
        out.push({
          id: i++,
          cluster: c,
          scrambledX: scaleX(sx),
          scrambledY: scaleY(sy),
          targetX: scaleX(tx),
          targetY: scaleY(ty),
        })
      }
    }
    return out
  }, [])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6 }}
      className="card-strong mb-8 p-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="kicker">K-Means · 3 clusters discovered live</div>
          <div className="mt-1 font-display text-lg font-bold text-engie-navy">
            peak_consumption_pct × seasonal_ratio
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-engie-magenta/25 bg-engie-magenta/5 px-3 py-1.5">
          <Sparkles className="h-3.5 w-3.5 text-engie-magenta" />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-engie-magenta">
            {revealed ? 'Clustered · 3 segments' : 'Scoring 300 customers…'}
          </span>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-engie-deep/10 bg-gradient-to-br from-white via-mist/40 to-white">
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="block h-auto w-full">
          {/* Grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((g) => (
            <line
              key={`gx-${g}`}
              x1={PAD.left + g * PLOT_W}
              x2={PAD.left + g * PLOT_W}
              y1={PAD.top}
              y2={PAD.top + PLOT_H}
              stroke="rgba(0,30,98,0.06)"
              strokeWidth={1}
            />
          ))}
          {[0, 0.25, 0.5, 0.75, 1].map((g) => (
            <line
              key={`gy-${g}`}
              x1={PAD.left}
              x2={PAD.left + PLOT_W}
              y1={PAD.top + g * PLOT_H}
              y2={PAD.top + g * PLOT_H}
              stroke="rgba(0,30,98,0.06)"
              strokeWidth={1}
            />
          ))}

          {/* Axes */}
          <line
            x1={PAD.left}
            x2={PAD.left + PLOT_W}
            y1={PAD.top + PLOT_H}
            y2={PAD.top + PLOT_H}
            stroke="rgba(0,30,98,0.25)"
            strokeWidth={1.2}
          />
          <line
            x1={PAD.left}
            x2={PAD.left}
            y1={PAD.top}
            y2={PAD.top + PLOT_H}
            stroke="rgba(0,30,98,0.25)"
            strokeWidth={1.2}
          />

          {/* X axis label */}
          <text
            x={PAD.left + PLOT_W / 2}
            y={VIEW_H - 8}
            textAnchor="middle"
            fontSize="11"
            fontFamily="JetBrains Mono, monospace"
            fill="rgba(0,30,98,0.55)"
          >
            peak_consumption_pct →
          </text>
          {/* Y axis label */}
          <text
            x={-VIEW_H / 2}
            y={14}
            transform={`rotate(-90)`}
            textAnchor="middle"
            fontSize="11"
            fontFamily="JetBrains Mono, monospace"
            fill="rgba(0,30,98,0.55)"
          >
            seasonal_ratio ↑
          </text>

          {/* Dots */}
          {dots.map((d) => (
            <motion.circle
              key={d.id}
              r={4}
              initial={{ cx: d.scrambledX, cy: d.scrambledY, fill: '#9CA8BD', opacity: 0 }}
              animate={
                inView
                  ? revealed
                    ? { cx: d.targetX, cy: d.targetY, fill: d.cluster.color, opacity: 0.92 }
                    : { cx: d.scrambledX, cy: d.scrambledY, fill: '#9CA8BD', opacity: 0.7 }
                  : { opacity: 0 }
              }
              transition={{
                duration: revealed ? 1.1 : 0.5,
                delay: revealed ? (d.id % 30) * 0.012 : (d.id % 40) * 0.005,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          ))}

          {/* Cluster labels (after reveal) */}
          {CENTROIDS.map((c, i) => (
            <motion.g
              key={c.id}
              initial={{ opacity: 0, y: -4 }}
              animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0 }}
              transition={{ duration: 0.5, delay: 1.0 + i * 0.08 }}
            >
              <rect
                x={scaleX(c.x) - 52}
                y={scaleY(c.y) - 30}
                width={104}
                height={20}
                rx={10}
                fill="#fff"
                stroke={c.color}
                strokeWidth={1.4}
              />
              <text
                x={scaleX(c.x)}
                y={scaleY(c.y) - 16}
                textAnchor="middle"
                fontSize="11"
                fontFamily="Plus Jakarta Sans, sans-serif"
                fontWeight={700}
                fill={c.color}
              >
                {c.name}
              </text>
            </motion.g>
          ))}
        </svg>
      </div>

      {/* Caption */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-engie-navy/70">
          {revealed ? (
            <>
              <strong className="text-engie-navy">3 segments emerge</strong> — each one maps to a
              different commercial play. Genie can name them and find the customers in seconds.
            </>
          ) : (
            <>Raw customer features arriving from <code className="font-mono text-[12px]">gold_customer_energy_profile</code>. Watch K-Means run.</>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          {CENTROIDS.map((c) => (
            <span
              key={c.id}
              className="flex items-center gap-1.5 rounded-full border border-engie-deep/10 bg-white px-2.5 py-1 text-[11px] text-engie-navy/75"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
              {c.name}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
