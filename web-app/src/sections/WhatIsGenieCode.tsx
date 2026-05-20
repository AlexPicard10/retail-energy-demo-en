import { motion } from 'framer-motion'
import { MessageSquare, Code2, Database, Layers, Lock, FileText } from 'lucide-react'
import SectionHeader from '../components/SectionHeader'

export default function WhatIsGenieCode() {
  return (
    <section id="what" className="pt-4 pb-20 md:pt-6 md:pb-24">
      <div className="container-pitch">
        <SectionHeader
          number="01"
          kicker="The picture"
          title={<>Genie brings new AI capabilities <span className="text-gradient">to all roles.</span></>}
          subtitle="Two AI surfaces, one Data Intelligence Platform. Business users ask questions in plain language; technical users build the products that answer them."
        />

        <div className="grid gap-6 md:grid-cols-2">
          <Card
            badge="Business users"
            badgeTone="blue"
            icon={<MessageSquare className="h-6 w-6" />}
            title="Genie"
            tagline="Answers your questions with data."
            bullets={[
              'Natural-language queries on Gold tables',
              'Cross-filter dashboards on the fly',
              'No SQL required',
            ]}
          />
          <Card
            badge="Technical users"
            badgeTone="magenta"
            icon={<Code2 className="h-6 w-6" />}
            title="Genie Code"
            tagline="Builds things with data."
            featured
            bullets={[
              'Pipelines, notebooks, SQL, dashboards',
              'Multi-step data & analysis tasks',
              'Customizable via skills, MCP, instructions',
            ]}
          />
        </div>

        {/* Foundation row */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7 }}
          className="mt-8"
        >
          <div className="card overflow-hidden p-6 md:p-8">
            <div className="kicker mb-5 flex items-center gap-2">
              <span className="text-engie-magenta">·</span>
              <span>Built on the Data Intelligence Platform</span>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <Foundation icon={<Layers className="h-5 w-5" />} label="Lakehouse" sub="Data warehousing" />
              <Foundation icon={<Database className="h-5 w-5" />} label="Lakebase" sub="Serverless Postgres" />
              <Foundation icon={<Database className="h-5 w-5" />} label="Lakeflow" sub="Ingest, ETL, streaming" />
              <Foundation icon={<Lock className="h-5 w-5" />} label="Unity Catalog" sub="Unified governance" />
              <Foundation icon={<FileText className="h-5 w-5" />} label="Open Formats" sub="Postgres · Delta · Iceberg" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function Card({
  badge,
  badgeTone,
  icon,
  title,
  tagline,
  bullets,
  featured = false,
}: {
  badge: string
  badgeTone: 'blue' | 'magenta'
  icon: React.ReactNode
  title: string
  tagline: string
  bullets: string[]
  featured?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6 }}
      className={`relative overflow-hidden rounded-2xl border ${
        featured
          ? 'border-engie-magenta/30 bg-gradient-to-br from-white via-white to-engie-magenta/5 shadow-[0_30px_80px_-30px_rgba(229,0,91,0.35)]'
          : 'border-white/60 bg-white/80 shadow-soft'
      } p-7`}
    >
      {featured && (
        <div className="absolute right-4 top-4">
          <span className="pill-magenta">Today&apos;s focus</span>
        </div>
      )}
      <div className={badgeTone === 'magenta' ? 'pill-magenta' : 'pill'}>{badge}</div>
      <div className="mt-5 flex items-center gap-4">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg ${
            badgeTone === 'magenta' ? 'bg-magenta-gradient' : 'bg-engie-gradient'
          }`}
        >
          {icon}
        </div>
        <div>
          <div className="font-display text-3xl font-extrabold tracking-tight text-engie-navy">{title}</div>
          <div className="font-mono text-xs uppercase tracking-wider text-engie-navy/50">{tagline}</div>
        </div>
      </div>
      <ul className="mt-6 space-y-2.5">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2.5 text-sm text-engie-navy/80">
            <span
              className={`mt-1 h-1.5 w-1.5 flex-none rounded-full ${
                badgeTone === 'magenta' ? 'bg-engie-magenta' : 'bg-engie-blue'
              }`}
            />
            {b}
          </li>
        ))}
      </ul>
    </motion.div>
  )
}

function Foundation({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div className="rounded-xl border border-engie-deep/10 bg-white px-4 py-3.5">
      <div className="flex items-center gap-2 text-engie-deep">
        {icon}
        <span className="font-display text-sm font-bold text-engie-navy">{label}</span>
      </div>
      <div className="mt-1 text-[11px] text-engie-navy/55">{sub}</div>
    </div>
  )
}
