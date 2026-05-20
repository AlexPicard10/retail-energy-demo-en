import { GenieMark, DatabricksMark } from '../components/Logo'

export default function Footer() {
  return (
    <footer className="border-t border-engie-deep/10 bg-white/40 py-10 backdrop-blur">
      <div className="container-pitch flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <GenieMark className="h-6 w-6" />
          <div className="leading-tight">
            <div className="font-display text-sm font-bold text-engie-navy">Genie Code · Retail Energy Demo</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-engie-deep/60">
              Databricks demo package · 2026
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-engie-navy/60">
          <DatabricksMark className="h-4 w-4" />
          <span>Databricks</span>
          <span className="text-engie-navy/30">·</span>
          <span>Synthetic data · MIT licensed</span>
        </div>
      </div>
    </footer>
  )
}
