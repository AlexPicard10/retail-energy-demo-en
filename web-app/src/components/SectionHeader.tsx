import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

export default function SectionHeader({
  number,
  kicker,
  title,
  subtitle,
  align = 'left',
}: {
  number: string
  kicker: string
  title: ReactNode
  subtitle?: ReactNode
  align?: 'left' | 'center'
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6 }}
      className={`mb-10 ${align === 'center' ? 'text-center mx-auto max-w-3xl' : 'max-w-3xl'}`}
    >
      <div className={`kicker mb-3 flex items-center gap-2 ${align === 'center' ? 'justify-center' : ''}`}>
        <span className="text-engie-magenta">{number}</span>
        <span className="h-px w-6 bg-engie-deep/30" />
        <span>{kicker}</span>
      </div>
      <h2 className="font-display text-3xl font-bold leading-[1.1] tracking-tight text-engie-navy md:text-5xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base leading-relaxed text-engie-navy/70 md:text-lg">{subtitle}</p>
      )}
    </motion.div>
  )
}
