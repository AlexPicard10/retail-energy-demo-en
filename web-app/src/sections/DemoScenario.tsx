import { motion } from 'framer-motion'
import SectionHeader from '../components/SectionHeader'
import MedallionFlow from '../diagrams/MedallionFlow'

export default function DemoScenario() {
  return (
    <section id="scenario" className="pt-4 pb-20 md:pt-6 md:pb-24">
      <div className="container-pitch">
        <SectionHeader
          number="03"
          kicker="Architecture · the 45-minute flow"
          title={
            <>
              From raw smart-meter files to{' '}
              <span className="text-gradient-green">ML-powered dashboards.</span>
            </>
          }
          subtitle="Visual Data Prep builds the medallion on a canvas; Genie Code trains the model, scaffolds the pipeline that applies it, and authors the dashboard. Hover or click a pillar below to spotlight that part of the architecture — everything else fades to gray."
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <MedallionFlow />
        </motion.div>
      </div>
    </section>
  )
}
