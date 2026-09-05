import { motion } from 'framer-motion'
import { GenieMark } from './Logo'

const links = [
  { id: 'what', label: 'What is Genie Code' },
  { id: 'devkit', label: 'AI Dev Kit' },
  { id: 'brief', label: 'The brief' },
  { id: 'scenario', label: 'Architecture' },
  { id: 'prompts', label: '10 Prompts' },
  { id: 'profiles', label: 'Customer Profiles' },
  { id: 'roadmap', label: 'Roadmap' },
]

export default function Nav() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="sticky top-0 z-40 border-b border-white/40 bg-white/60 backdrop-blur-xl"
    >
      <div className="container-pitch flex h-16 items-center justify-between">
        <a href="#top" className="flex items-center gap-2.5">
          <GenieMark className="h-7 w-7" />
          <div className="leading-tight">
            <div className="font-display text-sm font-bold text-engie-navy">Genie Code</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-engie-deep/60">Retail Energy Demo</div>
          </div>
        </a>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              className="animated-underline rounded-full px-3 py-1.5 text-sm font-medium text-engie-navy/80 hover:text-engie-navy"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <a href="#cta" className="btn-primary">
          Get the demo
        </a>
      </div>
    </motion.header>
  )
}
