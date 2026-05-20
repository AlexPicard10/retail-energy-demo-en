export function GenieMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="lg-genie" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5BD7FF" />
          <stop offset="50%" stopColor="#00AAFF" />
          <stop offset="100%" stopColor="#0033A0" />
        </linearGradient>
      </defs>
      <path
        d="M32 6 l5 17 17 6 -17 6 -5 17 -5 -17 -17 -6 17 -6 z"
        fill="url(#lg-genie)"
      />
    </svg>
  )
}

export function DatabricksMark({ className = '' }: { className?: string }) {
  return <img src="/databricks-emblem.png" alt="Databricks" className={className} />
}
