import { motion } from 'framer-motion'
import { Clock, Layers3, Search, Network } from 'lucide-react'
import SectionHeader from '../components/SectionHeader'

const items = [
  {
    icon: <Clock className="h-5 w-5" />,
    title: 'Scheduled Agents',
    body: 'Automate analytics and AI workflows on a schedule. Keep dashboards and AI apps always up to date.',
    color: '#00AAFF',
  },
  {
    icon: <Layers3 className="h-5 w-5" />,
    title: 'Canvas with Artifacts',
    body: 'Work in a shared canvas for code, prompts, and outputs. Reuse proven workflows as templates.',
    color: '#0033A0',
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: 'Drive & SharePoint search',
    body: 'Ask Genie Code to search across Drive and SharePoint. Find the right document instantly from one place.',
    color: '#E5005B',
  },
  {
    icon: <Network className="h-5 w-5" />,
    title: 'Knowledge Extraction',
    body: 'Turn unstructured content into a connected knowledge graph. See how customers, products, and systems relate.',
    color: '#00C389',
  },
]

export default function Roadmap() {
  return (
    <section id="roadmap" className="pt-4 pb-20 md:pt-6 md:pb-24">
      <div className="container-pitch">
        <SectionHeader
          number="06"
          kicker="What's next"
          title={
            <>
              Genie Code is our <span className="text-gradient">fastest-growing product.</span>
            </>
          }
          subtitle="In the coming weeks, we plan to ship the following."
        />

        <div className="grid gap-5 md:grid-cols-2">
          {items.map((it, i) => (
            <motion.div
              key={it.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className="card relative overflow-hidden p-7 transition hover:-translate-y-1 hover:shadow-glow"
            >
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl" style={{ backgroundColor: it.color }} />
              <div
                className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-md"
                style={{ backgroundColor: it.color }}
              >
                {it.icon}
              </div>
              <div className="font-display text-2xl font-bold text-engie-navy">{it.title}</div>
              <p className="mt-3 text-sm leading-relaxed text-engie-navy/75">{it.body}</p>
              <div className="mt-5 flex items-center gap-2 text-[11px] text-engie-navy/55">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: it.color }} />
                Shipping soon
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
