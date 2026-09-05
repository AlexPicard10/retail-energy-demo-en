import { motion } from 'framer-motion'
import { ArrowRight, Github, FileText } from 'lucide-react'

export default function CTA() {
  return (
    <section id="cta" className="pt-4 pb-20 md:pt-6 md:pb-24">
      <div className="container-pitch">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-3xl bg-engie-gradient p-1 shadow-glow"
        >
          <div className="absolute inset-0 opacity-30 mix-blend-overlay">
            <svg viewBox="0 0 600 200" preserveAspectRatio="none" className="h-full w-full">
              <defs>
                <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1" fill="#fff" />
                </pattern>
              </defs>
              <rect width="600" height="200" fill="url(#dots)" />
            </svg>
          </div>
          <div className="relative rounded-[22px] bg-engie-navy p-10 text-white md:p-14">
            <div className="grid gap-8 md:grid-cols-[1.5fr_1fr] md:items-end">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-engie-glow">
                  Run the demo · 15 minutes to first value
                </div>
                <h2 className="mt-3 font-display text-4xl font-extrabold leading-[1.05] tracking-tight md:text-5xl">
                  Clone the repo. <br className="hidden md:block" />
                  <span className="bg-gradient-to-r from-engie-glow via-engie-blue to-white bg-clip-text text-transparent">
                    Spin up the data. Run the prompts.
                  </span>
                </h2>
                <p className="mt-4 max-w-xl text-base text-white/75">
                  Everything you need is in <span className="font-mono text-engie-glow">RetailEnergy_DemoPackage_EN/</span> —
                  the scenario script, the synthetic data generator, and the visuals.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <a
                  href="https://github.com/databricks-solutions/ai-dev-kit"
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/10 px-5 py-3.5 text-sm font-semibold transition hover:bg-white/20"
                >
                  <span className="flex items-center gap-2.5">
                    <Github className="h-4 w-4" />
                    Install AI Dev Kit skills
                  </span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
                <a
                  href="#scenario"
                  className="group inline-flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/10 px-5 py-3.5 text-sm font-semibold transition hover:bg-white/20"
                >
                  <span className="flex items-center gap-2.5">
                    <FileText className="h-4 w-4" />
                    Read the 9 prompts
                  </span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
                <a
                  href="#top"
                  className="group inline-flex items-center justify-between gap-3 rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-engie-navy shadow-lg transition hover:shadow-2xl"
                >
                  <span>Back to top</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
              </div>
            </div>

            <div className="mt-10 grid gap-4 border-t border-white/10 pt-8 md:grid-cols-3">
              <Quick step="1" title="Generate data" body="python3 02_Setup/energy_retail_demo_setup.py --catalog <YOUR_CATALOG> --schema <YOUR_SCHEMA>" />
              <Quick step="2" title="Install skills" body="curl … install_skills.sh | bash --install-to-genie" />
              <Quick step="3" title="Follow the guide" body="01_Scenario/ENERGY_RETAIL_DEMO_GUIDE_EN.md" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function Quick({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-engie-magenta text-xs font-bold">{step}</span>
        <div className="font-display text-sm font-bold">{title}</div>
      </div>
      <code className="mt-2 block break-words font-mono text-[11px] leading-relaxed text-engie-glow/90">{body}</code>
    </div>
  )
}
