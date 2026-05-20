import { motion } from 'framer-motion'
import { BookOpen, Wrench, Plug, Sparkles, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import SectionHeader from '../components/SectionHeader'

const installCmd =
  'curl -sSL https://raw.githubusercontent.com/databricks-solutions/ai-dev-kit/main/databricks-skills/install_skills.sh | bash -s -- --install-to-genie'

const components = [
  {
    icon: <BookOpen className="h-6 w-6" />,
    title: 'Skills',
    sub: 'Knowledge & Patterns',
    body: 'Best practices for building on Databricks — pipelines, SQL, jobs, dashboards, Genie. 17+ skills shipped.',
    tone: 'blue',
  },
  {
    icon: <Wrench className="h-6 w-6" />,
    title: 'Tools',
    sub: 'Executable Actions',
    body: 'Python functions wrapping the Databricks SDK — simpler, opinionated, reliable. 45+ tools.',
    tone: 'green',
  },
  {
    icon: <Plug className="h-6 w-6" />,
    title: 'MCP Server',
    sub: 'LLM-Invokable',
    body: 'Exposes Tools to any LLM via the Model Context Protocol. Plug into Genie Code, Claude Code, Cursor, Copilot.',
    tone: 'magenta',
  },
  {
    icon: <Sparkles className="h-6 w-6" />,
    title: 'Builder App',
    sub: 'Native AI Workspace',
    body: 'Databricks-native app for AI coding workflows — bring your own coding agent.',
    tone: 'navy',
  },
] as const

export default function AIDevKit() {
  const [copied, setCopied] = useState(false)
  const onCopy = async () => {
    await navigator.clipboard.writeText(installCmd)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <section id="devkit" className="pt-4 pb-20 md:pt-6 md:pb-24">
      <div className="container-pitch">
        <SectionHeader
          number="02"
          kicker="Customization"
          title={<>Plug Genie Code into <span className="text-gradient-magenta">your toolbox.</span></>}
          subtitle="The AI Dev Kit is an open repo of Skills, Tools, and an MCP server that turn any AI coding assistant into a Databricks expert."
        />

        {/* Components grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {components.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="card group p-6 transition hover:-translate-y-1 hover:shadow-glow"
            >
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-md ${toneBg(c.tone)}`}>
                {c.icon}
              </div>
              <div className="font-display text-xl font-bold text-engie-navy">{c.title}</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-engie-navy/50">{c.sub}</div>
              <p className="mt-3 text-sm leading-relaxed text-engie-navy/75">{c.body}</p>
              <div className={`mt-5 h-[2px] w-8 ${toneBar(c.tone)} transition-all group-hover:w-16`} />
            </motion.div>
          ))}
        </div>

        {/* Install command */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="card-dark mt-10 overflow-hidden"
        >
          <div className="flex flex-col gap-5 p-7 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-engie-glow">One-line install</div>
              <div className="mt-1 font-display text-lg font-bold">Install AI Dev Kit Skills for Genie Code</div>
              <div className="mt-1 text-sm text-white/70">
                Skills land in <span className="font-mono text-engie-glow">/Workspace/Users/&lt;you&gt;/.assistant/skills</span>
              </div>
            </div>
            <a
              href="https://github.com/databricks-solutions/ai-dev-kit"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              View repo →
            </a>
          </div>
          <div className="border-t border-white/10 bg-black/30 p-5">
            <div className="flex items-start gap-3">
              <pre className="flex-1 overflow-x-auto font-mono text-[12.5px] leading-relaxed text-engie-glow scrollbar-thin">
                <span className="text-white/40">$ </span>
                {installCmd}
              </pre>
              <button
                onClick={onCopy}
                className="flex-none rounded-lg border border-white/20 bg-white/10 p-2 text-white/80 transition hover:bg-white/20"
                aria-label="Copy command"
              >
                {copied ? <Check className="h-4 w-4 text-engie-green" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function toneBg(tone: string) {
  switch (tone) {
    case 'blue':
      return 'bg-engie-gradient'
    case 'green':
      return 'bg-gradient-to-br from-engie-green to-engie-blue'
    case 'magenta':
      return 'bg-magenta-gradient'
    case 'navy':
    default:
      return 'bg-gradient-to-br from-engie-navy to-engie-deep'
  }
}
function toneBar(tone: string) {
  switch (tone) {
    case 'blue':
      return 'bg-engie-blue'
    case 'green':
      return 'bg-engie-green'
    case 'magenta':
      return 'bg-engie-magenta'
    default:
      return 'bg-engie-navy'
  }
}
