import { Fragment, useState } from 'react'
import { motion } from 'framer-motion'
import { Database, Brain, BarChart3, Check, type LucideIcon } from 'lucide-react'

// Render a box title so that:
//  - explicit "\n" stays as a hard break
//  - snake_case identifiers wrap only at underscores (no mid-word breaks)
//  - regular space-separated titles wrap normally on whitespace
function renderTitle(title: string) {
  if (title.includes('\n')) return title
  if (!title.includes('_')) return title
  const parts = title.split('_')
  return parts.map((p, i) => (
    <Fragment key={i}>
      {p}
      {i < parts.length - 1 && (
        <>
          _<wbr />
        </>
      )}
    </Fragment>
  ))
}

/**
 * MedallionFlow — replicates the reference DemoScenarioGenieCode.png layout:
 *  - Far-left: Energy Retail Raw Data sources card
 *  - Volume → Auto Loader
 *  - Lakeflow Declarative Pipeline container with:
 *      bronze_raw_data → silver_clean_data + silver_interactions
 *      → gold_business_marts (top) + gold_customer_energy_profile (center)
 *      → consumption_classifier (ML) → gold_customer_classifications (bottom)
 *  - Far-right: Consumer panel (Dashboard, Genie, App, Bot)
 *  - Numbered step annotations 1-8 around the diagram
 */

const W = 1500
const H = 700

type Box = {
  id: string
  x: number
  y: number
  w: number
  h: number
  variant:
    | 'sources'
    | 'bronze'
    | 'silver'
    | 'gold'
    | 'gold-feature'
    | 'gold-ml'
    | 'ml'
    | 'consumer'
  kicker?: string
  title: string
  body?: string[]
}

const boxes: Box[] = [
  // far left raw data
  {
    id: 'sources',
    x: 20,
    y: 220,
    w: 220,
    h: 270,
    variant: 'sources',
    kicker: 'Energy Retail',
    title: 'Raw Data',
    body: ['Customers', 'Smart meter readings', 'Monthly bills', 'Tariff plans', 'Customer interactions JSON'],
  },
  // Visual Data Prep container — built from the NL prompt + the AI_classify manual step
  {
    id: 'designer',
    x: 340,
    y: 240,
    w: 320,
    h: 230,
    variant: 'silver',
    kicker: 'Visual Data Prep',
    title: 'energy_retail_visual_prep',
    body: ['NL prompt + AI operator', 'on a single canvas flow'],
  },
  // Gold outputs of the canvas
  {
    id: 'gold-energy',
    x: 1020,
    y: 200,
    w: 260,
    h: 120,
    variant: 'gold-feature',
    title: 'gold_customer_energy_profile',
    body: ['6 ML features +', 'tariff context /customer'],
  },
  {
    id: 'gold-topics',
    x: 1020,
    y: 360,
    w: 260,
    h: 95,
    variant: 'gold',
    title: 'gold_customer_topics',
    body: ['ai_classify · 5 topics'],
  },
  // ML training + DLT scoring
  {
    id: 'ml',
    x: 680,
    y: 515,
    w: 240,
    h: 90,
    variant: 'ml',
    title: 'consumption_classifier',
    body: ['MLflow K-Means'],
  },
  {
    id: 'gold-class',
    x: 960,
    y: 515,
    w: 320,
    h: 90,
    variant: 'gold-ml',
    title: 'gold_customer_classifications',
    body: ['DLT + ML scoring'],
  },
  // consumer panel
  { id: 'consumer', x: 1340, y: 155, w: 160, h: 445, variant: 'consumer', title: 'Consumer' },
]

const variantStyles: Record<Box['variant'], string> = {
  sources:
    'border-[#9DC9BA]/60 bg-gradient-to-br from-[#E6F4EE] to-[#D6E7F2] text-[#0A2540]',
  bronze:
    'border-[#E0A578]/50 bg-gradient-to-br from-[#FFEAD5] to-[#FBD0A8] text-[#5A2E00]',
  silver:
    'border-[#B0BFD2]/60 bg-gradient-to-br from-[#EFF4FB] to-[#DAE3F0] text-[#0A2540]',
  gold:
    'border-[#E5BD52]/55 bg-gradient-to-br from-[#FFF3CC] to-[#FFE08F] text-[#4A3010]',
  'gold-feature':
    'border-[#E5BD52]/65 bg-gradient-to-br from-[#FFF3CC] to-[#FFD673] text-[#4A3010] ring-2 ring-[#E5005B]/40 ring-offset-2 ring-offset-white',
  'gold-ml':
    'border-[#E5BD52]/55 bg-gradient-to-br from-[#FFF3CC] to-[#FFE08F] text-[#4A3010]',
  ml:
    'border-[#A593E0]/55 bg-gradient-to-br from-[#EEE6FE] to-[#D2C2F8] text-[#2A1A5C]',
  consumer:
    'border-[#0E5147]/40 bg-gradient-to-br from-[#0F766E] via-[#0B5E58] to-[#0A3A35] text-white',
}

// Step number badges anchored on/near each box. Numbers map to the 7 core
// steps in the walkthrough rail (the Agents & Apps bonus, steps 8-10, is not
// part of this medallion diagram); we keep numbers only here to avoid the
// long text labels that previously crowded the canvas.
const stepBadges = [
  { id: 1, x: 240, y: 220, color: '#0066B8' }, // sources — Add source files
  { id: 2, x: 660, y: 240, color: '#0066B8' }, // designer — Visual Data Prep NL prompt
  { id: 3, x: 1280, y: 360, color: '#C77800' }, // gold_customer_topics — AI_classify
  { id: 4, x: 920, y: 508, color: '#6B4FD8' }, // consumption_classifier — Train K-Means
  { id: 5, x: 1280, y: 508, color: '#6B4FD8' }, // gold_customer_classifications — DLT scoring
  { id: 6, x: 1348, y: 200, color: '#00A872' }, // consumer — dashboard
  { id: 7, x: 1348, y: 320, color: '#00A872' }, // consumer — genie Q&A
] as const

type PillarKey = 'de' | 'ds' | 'analytics'

type Pillar = {
  key: PillarKey
  badge: string
  tool: string
  tagline: string
  duration: string
  color: string
  icon: LucideIcon
  boxes: string[]
  highlights: string[]
}

const PILLARS: Pillar[] = [
  {
    key: 'de',
    badge: 'Data Engineering',
    tool: 'Visual Data Prep',
    tagline: 'Bronze → Silver → Gold, built on a no-code visual canvas.',
    duration: '15 min',
    color: '#00AAFF',
    icon: Database,
    boxes: ['sources', 'designer', 'gold-energy', 'gold-topics'],
    highlights: [
      '5 raw files dropped on a single Visual Data Prep flow',
      'One NL prompt builds the customer energy profile',
      'AI operator (ai_classify) tags every interaction',
    ],
  },
  {
    key: 'ds',
    badge: 'Data Science',
    tool: 'Genie Code',
    tagline: 'Train K-Means, then build a Lakeflow pipeline that applies it.',
    duration: '12 min',
    color: '#E5005B',
    icon: Brain,
    boxes: ['ml', 'gold-class'],
    highlights: [
      'K-Means k=3 · MLflow tracking',
      'Model registered in Unity Catalog',
      'New pipeline → gold_customer_classifications',
    ],
  },
  {
    key: 'analytics',
    badge: 'Analytics',
    tool: 'Genie + AI/BI',
    tagline: 'Image-to-dashboard, then ask anything in plain English.',
    duration: '13 min',
    color: '#00C389',
    icon: BarChart3,
    boxes: ['consumer'],
    highlights: [
      'Lakeview dashboard from a sketch',
      'Cross-filtered widgets · shared dataset',
      'Genie Q&A — Peak Heavy at-risk call list',
    ],
  },
]

export default function MedallionFlow() {
  const [active, setActive] = useState<PillarKey | null>(null)
  const [hovered, setHovered] = useState<PillarKey | null>(null)
  const effective = hovered ?? active
  const activePillar = effective ? PILLARS.find((p) => p.key === effective) ?? null : null
  const highlightedBoxes = activePillar?.boxes ?? null

  const spotlight = Array.isArray(highlightedBoxes) && highlightedBoxes.length > 0
  const highlightSet = new Set(highlightedBoxes ?? [])

  // Bounding box around the highlighted nodes — drives the focus "cadre".
  const FRAME_PAD = 16
  const focusBoxes = spotlight ? boxes.filter((b) => highlightSet.has(b.id)) : []
  const frame = focusBoxes.length > 0
    ? (() => {
        const xs = focusBoxes.map((b) => b.x)
        const ys = focusBoxes.map((b) => b.y)
        const rs = focusBoxes.map((b) => b.x + b.w)
        const bs = focusBoxes.map((b) => b.y + b.h)
        const x = Math.min(...xs) - FRAME_PAD
        const y = Math.min(...ys) - FRAME_PAD
        return {
          x,
          y,
          w: Math.max(...rs) - x + FRAME_PAD,
          h: Math.max(...bs) - y + FRAME_PAD,
        }
      })()
    : null
  const focusColor = activePillar?.color ?? '#0066B8'
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-engie-deep/15 bg-white p-6 md:p-8 shadow-[0_30px_80px_-20px_rgba(0,30,98,0.15)]">
      {/* Backdrop */}
      <div aria-hidden className="absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(60% 50% at 30% 40%, rgba(0,189,255,0.10), transparent 70%),' +
              'radial-gradient(50% 40% at 75% 70%, rgba(229,0,91,0.08), transparent 70%),' +
              'radial-gradient(40% 40% at 80% 20%, rgba(0,195,137,0.06), transparent 70%)',
          }}
        />
        <svg className="absolute inset-0 h-full w-full opacity-[0.18]" aria-hidden>
          <defs>
            <pattern id="grid-flow" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#003D7C" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-flow)" />
        </svg>
      </div>

      {/* Header strip */}
      <div className="relative z-20 mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-engie-deep">
            Demo scenario · 7 core steps
          </div>
          <div className="mt-1 font-display text-xl font-bold text-engie-navy md:text-2xl">
            Visual Data Prep builds the Gold tables.{' '}
            <span className="bg-gradient-to-r from-engie-blue to-engie-magenta bg-clip-text text-transparent">
              Genie Code does the rest.
            </span>
          </div>
        </div>
      </div>

      {/* Diagram canvas */}
      <div className="relative z-10 w-full" style={{ aspectRatio: `${W} / ${H}` }}>
        {/* SVG layer */}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full"
        >
          <defs>
            {/* Line gradients */}
            <linearGradient id="g-cool" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#5BD7FF" />
              <stop offset="100%" stopColor="#00AAFF" />
            </linearGradient>
            <linearGradient id="g-warm" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#F2B843" />
              <stop offset="100%" stopColor="#FF9D60" />
            </linearGradient>
            <linearGradient id="g-magenta" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#E5005B" />
              <stop offset="100%" stopColor="#FF7A59" />
            </linearGradient>
            <linearGradient id="g-purple" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#A78BFA" />
              <stop offset="100%" stopColor="#7C5CD6" />
            </linearGradient>
            <linearGradient id="g-green" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#F2B843" />
              <stop offset="100%" stopColor="#00C389" />
            </linearGradient>

            <filter id="soft-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" />
            </filter>

            <marker id="arrow-cool" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#0066B8" />
            </marker>
            <marker id="arrow-warm" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#C77800" />
            </marker>
            <marker id="arrow-purple" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#6B4FD8" />
            </marker>
            <marker id="arrow-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#00A872" />
            </marker>

            {/* Particle paths */}
            <path id="p-src-designer" d="M 240 355 L 340 355" />
            <path id="p-designer-energy" d="M 660 305 C 800 285, 900 270, 1020 260" />
            <path id="p-designer-topics" d="M 660 405 C 800 410, 900 410, 1020 410" />
            <path id="p-energy-ml" d="M 1150 320 C 1150 430, 1000 495, 800 515" />
            <path id="p-ml-class" d="M 920 560 L 960 560" />
            <path id="p-energy-cons" d="M 1280 260 C 1310 240, 1320 240, 1340 240" />
            <path id="p-topics-cons" d="M 1280 410 C 1310 410, 1320 410, 1340 410" />
            <path id="p-class-cons" d="M 1280 560 C 1310 520, 1310 500, 1340 480" />
          </defs>

          {/* Visual Data Prep container — NL prompt + AI operator → 2 Gold tables */}
          <motion.rect
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            x={320}
            y={155}
            width={970}
            height={325}
            rx={20}
            fill="rgba(0,189,255,0.04)"
            stroke="rgba(0,61,124,0.35)"
            strokeWidth={1.5}
            strokeDasharray="6 4"
          />
          <motion.text
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.3 }}
            x={805}
            y={179}
            textAnchor="middle"
            fontSize="16"
            fontWeight="700"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fill="#003D7C"
          >
            Visual Data Prep · NL prompt + AI operator
          </motion.text>

          {/* Lakeflow Declarative Pipeline container — model application only */}
          <motion.rect
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            x={940}
            y={508}
            width={355}
            height={125}
            rx={16}
            fill="rgba(229,0,91,0.04)"
            stroke="rgba(229,0,91,0.4)"
            strokeWidth={1.5}
            strokeDasharray="6 4"
          />
          <motion.text
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.5 }}
            x={1117}
            y={622}
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fill="#8E0046"
          >
            Lakeflow Declarative Pipeline (applies the model)
          </motion.text>

          {/* === Connection lines + arrows === */}
          {/* Sources → Visual Data Prep */}
          <Connection d="M 240 355 L 340 355" stroke="#0066B8" marker="arrow-cool" delay={0.1} />
          <rect x={252} y={329} width={76} height={22} rx={7} fill="#fff" stroke="#0066B8" strokeOpacity="0.4" strokeWidth={1} />
          <text x={290} y={345} textAnchor="middle" fontSize="12" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif" fill="#0066B8">
            Drop &amp; preview
          </text>

          {/* Visual Data Prep → Gold customer_energy_profile (NL prompt) */}
          <Connection
            d="M 660 305 C 800 285, 900 270, 1020 260"
            stroke="#C77800"
            marker="arrow-warm"
            delay={0.4}
          />
          <text x={780} y={260} fontSize="12" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif" fill="#C77800">
            NL prompt
          </text>

          {/* Visual Data Prep → Gold customer_topics (AI_classify) */}
          <Connection
            d="M 660 405 C 800 410, 900 410, 1020 410"
            stroke="#C77800"
            marker="arrow-warm"
            delay={0.5}
          />
          <text x={780} y={400} fontSize="12" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif" fill="#C77800">
            AI · ai_classify
          </text>

          {/* Gold customer_energy_profile → ML (Training) */}
          <Connection
            d="M 1150 320 C 1150 430, 1000 495, 800 515"
            stroke="#6B4FD8"
            marker="arrow-purple"
            delay={0.7}
            dashed
          />
          <text x={970} y={477} fontSize="12" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif" fill="#6B4FD8">
            Training
          </text>

          {/* ML → Gold classifications (Inference) */}
          <Connection
            d="M 920 560 L 960 560"
            stroke="#6B4FD8"
            marker="arrow-purple"
            delay={0.8}
            dashed
          />
          <text x={940} y={553} textAnchor="middle" fontSize="12" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif" fill="#6B4FD8">
            Inference
          </text>

          {/* Gold customer_energy_profile → Consumer */}
          <Connection
            d="M 1280 260 C 1310 240, 1320 240, 1340 240"
            stroke="#00A872"
            marker="arrow-green"
            delay={0.85}
          />
          {/* Gold customer_topics → Consumer */}
          <Connection
            d="M 1280 410 C 1310 410, 1320 410, 1340 410"
            stroke="#00A872"
            marker="arrow-green"
            delay={0.88}
          />
          {/* Gold classifications → Consumer */}
          <Connection
            d="M 1280 560 C 1310 520, 1310 500, 1340 480"
            stroke="#00A872"
            marker="arrow-green"
            delay={0.9}
          />

          {/* Focus frame ("cadre") drawn just under the boxes */}
          <motion.rect
            initial={false}
            animate={{
              x: frame?.x ?? W / 2,
              y: frame?.y ?? H / 2,
              width: frame?.w ?? 0,
              height: frame?.h ?? 0,
              opacity: frame ? 1 : 0,
            }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            rx={22}
            fill={`${focusColor}14`}
            stroke={focusColor}
            strokeWidth={3.5}
            strokeDasharray="9 6"
            style={{ pointerEvents: 'none' }}
          />

          {/* === Particles flowing === */}
          <Particles href="#p-src-designer" color="#5BD7FF" duration={2.4} delay={1.0} count={2} />
          <Particles href="#p-designer-energy" color="#FFD577" duration={2.5} delay={1.6} count={2} />
          <Particles href="#p-designer-topics" color="#FFD577" duration={2.5} delay={1.7} count={2} />
          <Particles href="#p-energy-ml" color="#A78BFA" duration={2.4} delay={2.1} count={2} />
          <Particles href="#p-ml-class" color="#A78BFA" duration={1.8} delay={2.3} count={2} />
          <Particles href="#p-energy-cons" color="#00C389" duration={2.4} delay={2.4} count={2} />
          <Particles href="#p-topics-cons" color="#00C389" duration={2.5} delay={2.45} count={2} />
          <Particles href="#p-class-cons" color="#00C389" duration={2.6} delay={2.5} count={2} />
        </svg>

        {/* HTML layer for boxes */}
        <div className="absolute inset-0">
          {boxes.map((b, i) => (
            <BoxNode
              key={b.id}
              box={b}
              delay={i * 0.07}
              dimmed={spotlight && !highlightSet.has(b.id)}
              spotlighted={spotlight && highlightSet.has(b.id)}
              spotlightColor={focusColor}
            />
          ))}

          {/* Step number badges (small, attached to relevant boxes) */}
          {stepBadges.map((s, i) => (
            <StepBadge key={s.id} num={s.id} x={s.x} y={s.y} color={s.color} delay={1 + i * 0.04} />
          ))}
        </div>
      </div>

      {/* Interactive pillar strip — replaces the previous info pills, drives the spotlight */}
      <div className="relative z-10 mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        {PILLARS.map((p, i) => (
          <PillarCard
            key={p.key}
            pillar={p}
            isActive={active === p.key}
            isHovered={hovered === p.key}
            isDimmed={!!effective && effective !== p.key}
            onClick={() => setActive((prev) => (prev === p.key ? null : p.key))}
            onHoverStart={() => setHovered(p.key)}
            onHoverEnd={() => setHovered(null)}
            delay={i * 0.06}
          />
        ))}
      </div>
    </div>
  )
}

/* ----------------- helpers ----------------- */

function BoxNode({
  box,
  delay,
  dimmed,
  spotlighted,
  spotlightColor,
}: {
  box: Box
  delay: number
  dimmed?: boolean
  spotlighted?: boolean
  spotlightColor?: string
}) {
  const isConsumer = box.variant === 'consumer'
  const variantClass = variantStyles[box.variant]
  const glow = spotlighted && spotlightColor
    ? `0 0 0 2px ${spotlightColor}, 0 14px 36px -10px ${spotlightColor}80`
    : undefined

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      animate={{
        opacity: dimmed ? 0.4 : 1,
        scale: spotlighted ? 1.04 : 1,
        filter: spotlighted
          ? 'saturate(1.18)'
          : dimmed
            ? 'grayscale(1) brightness(1.05) saturate(0.15)'
            : 'saturate(1)',
      }}
      transition={{ duration: 0.4, delay }}
      className={`absolute rounded-2xl border ${variantClass} overflow-hidden ${
        spotlighted ? 'z-10' : ''
      }`}
      style={{
        left: `${(box.x / W) * 100}%`,
        top: `${(box.y / H) * 100}%`,
        width: `${(box.w / W) * 100}%`,
        height: `${(box.h / H) * 100}%`,
        boxShadow: glow,
      }}
    >
      <div className="relative flex h-full min-w-0 flex-col p-3 md:p-3.5">
        {isConsumer ? <ConsumerInner /> : null}

        {!isConsumer && box.kicker && (
          <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] opacity-85">{box.kicker}</div>
        )}

        {!isConsumer && (
          <>
            <div className="mt-1.5 font-display text-[13px] font-bold leading-tight whitespace-pre-line">
              {renderTitle(box.title)}
            </div>
            {box.body && (
              <div className="mt-1.5 space-y-0.5 font-sans text-[11.5px] font-medium leading-snug opacity-90">
                {box.body.map((b) => (
                  <div key={b}>{b}</div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Active pulse for ML feature box */}
        {box.variant === 'gold-feature' && (
          <div className="absolute right-2 top-2 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E5005B] opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#E5005B]"></span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function ConsumerInner() {
  return (
    <div className="flex h-full flex-col">
      <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#6EE7C7]">Consumer</div>
      <div className="mt-4 flex-1 space-y-3.5">
        <ConsumerRow icon="📊" label="Dashboard" sub="Lakeview / BI" />
        <ConsumerRow icon="✨" label="Genie" sub="Natural-language analytics" />
        <ConsumerRow icon="⚡" label="App" sub="Streamlit / API" />
        <ConsumerRow icon="🤖" label="Bot" sub="Agent" />
      </div>
    </div>
  )
}

function ConsumerRow({ icon, label, sub }: { icon: string; label: string; sub: string }) {
  return (
    <div className="flex items-start gap-2 text-white/90">
      <span className="text-lg leading-none">{icon}</span>
      <div className="leading-tight">
        <div className="font-display text-[13px] font-bold text-white">{label}</div>
        <div className="font-sans text-[10.5px] font-medium text-white/65">{sub}</div>
      </div>
    </div>
  )
}

function Connection({
  d,
  stroke,
  marker,
  delay,
  dashed,
}: {
  d: string
  stroke: string
  marker: string
  delay: number
  dashed?: boolean
}) {
  return (
    <>
      <motion.path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.20"
        filter="url(#soft-glow)"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay }}
      />
      <motion.path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={dashed ? '6 4' : undefined}
        markerEnd={`url(#${marker})`}
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay }}
      />
    </>
  )
}

function Particles({
  href,
  color,
  count = 2,
  duration = 2.4,
  delay = 0,
}: {
  href: string
  color: string
  count?: number
  duration?: number
  delay?: number
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <circle key={i} r="3" fill={color} filter="url(#soft-glow)">
          <animateMotion dur={`${duration}s`} begin={`${delay + (i * duration) / count}s`} repeatCount="indefinite">
            <mpath href={href} />
          </animateMotion>
          <animate
            attributeName="opacity"
            values="0;1;1;0"
            dur={`${duration}s`}
            begin={`${delay + (i * duration) / count}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </>
  )
}

function StepBadge({
  num,
  x,
  y,
  color,
  delay,
}: {
  num: number
  x: number
  y: number
  color: string
  delay: number
}) {
  // Small numbered circle anchored at (x,y) center.
  const size = 22
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay }}
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` }}
    >
      <span
        className="flex items-center justify-center rounded-full font-display font-bold text-white shadow-md ring-2 ring-white"
        style={{ background: color, width: size, height: size, fontSize: 11 }}
      >
        {num}
      </span>
    </motion.div>
  )
}

/* ----------------- Pillar Card (drives the diagram spotlight) ----------------- */

function PillarCard({
  pillar,
  isActive,
  isHovered,
  isDimmed,
  onClick,
  onHoverStart,
  onHoverEnd,
  delay,
}: {
  pillar: Pillar
  isActive: boolean
  isHovered: boolean
  isDimmed: boolean
  onClick: () => void
  onHoverStart: () => void
  onHoverEnd: () => void
  delay: number
}) {
  const Icon = pillar.icon
  const lit = isActive || isHovered
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      animate={{
        opacity: isDimmed ? 0.5 : 1,
        scale: lit ? 1.02 : 1,
        filter: isDimmed ? 'grayscale(0.6) saturate(0.55)' : 'none',
      }}
      transition={{ duration: 0.3, delay }}
      onClick={onClick}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onFocus={onHoverStart}
      onBlur={onHoverEnd}
      className={`group relative overflow-hidden rounded-2xl border bg-white p-4 text-left transition-shadow ${
        lit ? 'shadow-[0_18px_40px_-12px_rgba(0,30,98,0.25)]' : 'shadow-soft'
      }`}
      style={{ borderColor: lit ? pillar.color : 'rgba(0,30,98,0.10)' }}
      aria-pressed={isActive}
    >
      <div
        className="absolute inset-x-0 top-0 transition-all"
        style={{ backgroundColor: pillar.color, opacity: lit ? 1 : 0.6, height: lit ? 6 : 4 }}
      />
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 flex-none items-center justify-center rounded-xl text-white shadow-sm"
          style={{ backgroundColor: pillar.color }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white"
              style={{ backgroundColor: pillar.color }}
            >
              {pillar.badge}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-engie-navy/50">
              {pillar.duration}
            </span>
          </div>
          <div className="mt-1 font-display text-base font-bold leading-tight text-engie-navy">
            {pillar.tool}
          </div>
        </div>
      </div>
      <p className="mt-2 text-[12.5px] leading-snug text-engie-navy/70">{pillar.tagline}</p>
      <ul className="mt-3 space-y-1.5">
        {pillar.highlights.map((h) => (
          <li key={h} className="flex items-start gap-2 text-[12px] leading-snug text-engie-navy/80">
            <span
              className="mt-[3px] flex h-3.5 w-3.5 flex-none items-center justify-center rounded-full text-white"
              style={{ backgroundColor: pillar.color }}
            >
              <Check className="h-2.5 w-2.5" />
            </span>
            <span>{h}</span>
          </li>
        ))}
      </ul>
      <motion.div
        initial={false}
        animate={{ opacity: lit ? 1 : 0, y: lit ? 0 : 6 }}
        transition={{ duration: 0.25 }}
        className="mt-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em]"
        style={{ color: pillar.color }}
      >
        <span className="relative flex h-1.5 w-1.5">
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            style={{ background: pillar.color }}
          />
          <span
            className="relative inline-flex h-1.5 w-1.5 rounded-full"
            style={{ background: pillar.color }}
          />
        </span>
        Spotlighted in the diagram
      </motion.div>
    </motion.button>
  )
}
