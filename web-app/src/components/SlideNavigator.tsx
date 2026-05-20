import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export type SlideMeta = { id: string; label: string }

type Props = {
  slides: SlideMeta[]
  active: number
  onGoto: (idx: number) => void
}

export default function SlideNavigator({ slides, active, onGoto }: Props) {
  const total = slides.length
  const current = slides[active]
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.6 }}
      className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4"
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-engie-deep/15 bg-white/90 px-2 py-1.5 shadow-[0_12px_30px_-12px_rgba(0,30,98,0.25)] backdrop-blur-md">
        <button
          onClick={() => onGoto(active - 1)}
          disabled={active === 0}
          aria-label="Previous slide"
          className="flex h-8 w-8 items-center justify-center rounded-full text-engie-navy transition hover:bg-engie-blue/10 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="hidden items-center gap-1 sm:flex">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => onGoto(i)}
              aria-label={`Go to slide ${i + 1}: ${s.label}`}
              className="group relative flex h-8 items-center justify-center px-2"
            >
              <span
                className={`block h-1.5 rounded-full transition-all ${
                  i === active ? 'w-6 bg-engie-blue' : 'w-1.5 bg-engie-navy/20 group-hover:bg-engie-navy/40'
                }`}
              />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 px-2 sm:hidden">
          <span className="font-mono text-[11px] tabular-nums text-engie-navy">{active + 1}</span>
          <span className="font-mono text-[11px] text-engie-navy/40">/</span>
          <span className="font-mono text-[11px] tabular-nums text-engie-navy/60">{total}</span>
        </div>

        <div className="hidden items-center gap-1 border-l border-engie-deep/10 pl-2 md:flex">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-engie-deep/60">
            {String(active + 1).padStart(2, '0')} · {current.label}
          </span>
        </div>

        <button
          onClick={() => onGoto(active + 1)}
          disabled={active === total - 1}
          aria-label="Next slide"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-engie-blue text-white transition hover:bg-engie-deep disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  )
}
