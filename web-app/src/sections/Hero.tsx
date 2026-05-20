import { motion } from 'framer-motion'
import { Sparkles, ChevronRight } from 'lucide-react'
import { GenieMark, DatabricksMark } from '../components/Logo'
import TypewriterText from '../components/TypewriterText'

export default function Hero() {
  return (
    <section id="top" className="relative pt-4 pb-20 md:pt-6 md:pb-24">
      <div className="container-pitch">
        {/* Brand row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 flex flex-wrap items-center gap-3"
        >
          <div className="flex items-center gap-2 rounded-full border border-engie-deep/15 bg-white/70 px-4 py-2 backdrop-blur">
            <DatabricksMark className="h-5 w-5" />
            <span className="font-display text-sm font-semibold text-engie-navy">Databricks</span>
          </div>
          <div className="kicker">Retail Energy · B2C · 45-min workshop</div>
          <div className="ml-auto hidden items-center gap-2 rounded-full border border-engie-green/30 bg-engie-green/5 px-3 py-1.5 md:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-engie-green opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-engie-green"></span>
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-engie-green">Live · April 2026</span>
          </div>
        </motion.div>

        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          {/* Left: copy */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-engie-blue/30 bg-engie-blue/5 px-3 py-1"
            >
              <Sparkles className="h-3.5 w-3.5 text-engie-blue" />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-engie-deep">
                Visual Data Prep + Genie Code
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-tight text-engie-navy md:text-7xl"
            >
              Build with data{' '}
              <br className="hidden md:block" />
              at the speed of{' '}
              <span className="relative inline-block">
                <span className="text-gradient">thought.</span>
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 0.9 }}
                  className="absolute -bottom-2 left-0 right-0 h-[6px] origin-left rounded-full bg-gradient-to-r from-engie-blue via-engie-magenta to-engie-coral opacity-80"
                />
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="mt-7 max-w-xl text-lg leading-relaxed text-engie-navy/75 md:text-xl"
            >
              A 45-minute live workshop where <strong>Visual Data Prep</strong> builds the medallion
              pipeline on a no-code canvas, then <strong>Genie Code</strong> trains the model, builds the
              Lakeflow pipeline that applies it, and authors the executive dashboard from an image.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mt-9 flex flex-wrap items-center gap-3"
            >
              <a href="#scenario" className="btn-primary">
                <Sparkles className="h-4 w-4" />
                See the architecture
                <ChevronRight className="h-4 w-4" />
              </a>
            </motion.div>
          </div>

          {/* Right: live prompt preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative"
          >
            <PromptPreview />
            <FloatingBadges />
          </motion.div>
        </div>

      </div>
    </section>
  )
}

/* --------- Prompt preview card --------- */
function PromptPreview() {
  return (
    <div className="relative">
      {/* Halo */}
      <div className="pointer-events-none absolute -inset-6 rounded-[28px] bg-gradient-to-br from-engie-blue/30 via-transparent to-engie-magenta/30 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/85 shadow-[0_30px_80px_-20px_rgba(0,30,98,0.35)] backdrop-blur-xl">
        {/* Title bar */}
        <div className="flex items-center justify-between border-b border-engie-deep/10 bg-white/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <GenieMark className="h-5 w-5" />
            <span className="font-display text-sm font-bold text-engie-navy">Genie Code</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-engie-deep/50">/prompt</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-engie-magenta/60" />
            <span className="h-2 w-2 rounded-full bg-engie-coral/60" />
            <span className="h-2 w-2 rounded-full bg-engie-green/60" />
          </div>
        </div>

        {/* User prompt */}
        <div className="border-b border-engie-deep/5 px-5 py-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-engie-deep/55">You</div>
          <p className="mt-1.5 font-mono text-[13px] leading-relaxed text-engie-navy">
            <TypewriterText
              text='"Train K-Means (k=3) on gold_customer_energy_profile, register as consumption_classifier, then build a new Lakeflow pipeline that applies it to produce gold_customer_classifications."'
              speed={20}
              delay={400}
            />
          </p>
        </div>

        {/* Genie Code response */}
        <div className="space-y-2.5 px-5 py-4">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-engie-blue">
            <Sparkles className="h-3 w-3" />
            Genie Code
          </div>
          <Step delay={5.5} icon="✓" text="Trained K-Means · silhouette logged in MLflow" />
          <Step delay={6.2} icon="✓" text="Registered model · consumption_classifier v1 in UC" />
          <Step delay={6.9} icon="✓" text="Created pipeline · energy_retail_classification_pipeline" />
          <Step delay={7.6} icon="●" text="Materializing gold_customer_classifications…" pulse />
        </div>
      </div>
    </div>
  )
}

function Step({ icon, text, delay, pulse }: { icon: string; text: string; delay: number; pulse?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay }}
      className="flex items-center gap-2.5 rounded-lg bg-engie-blue/5 px-3 py-2"
    >
      <span
        className={`flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] font-bold ${
          pulse ? 'animate-pulse bg-engie-magenta text-white' : 'bg-engie-green text-white'
        }`}
      >
        {icon}
      </span>
      <span className="font-mono text-[12px] text-engie-navy/85">{text}</span>
    </motion.div>
  )
}

function FloatingBadges() {
  return (
    <>
      <motion.div
        className="pointer-events-none absolute -top-7 left-4 hidden md:block"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="rounded-full border border-engie-magenta/30 bg-white px-3 py-1.5 shadow-md">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-engie-magenta">7 steps · 2 hands-on</span>
        </div>
      </motion.div>
      <motion.div
        className="pointer-events-none absolute -bottom-5 right-4 hidden md:block"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="rounded-full border border-engie-blue/30 bg-white px-3 py-1.5 shadow-md">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-engie-deep">VDP · Lakeflow · MLflow · AI/BI</span>
        </div>
      </motion.div>
    </>
  )
}

