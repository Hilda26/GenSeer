interface Props {
  label: string
  outcomePool: number
  totalPool: number
  compact?: boolean
}

export default function PoolProbabilityBar({ label, outcomePool, totalPool, compact = false }: Props) {
  const pct = totalPool > 0 ? (outcomePool / totalPool) * 100 : 0

  return (
    <div className={compact ? 'mb-1.5' : 'mb-3'}>
      <div className="flex items-center justify-between mb-1">
        <span
          className={compact ? 'text-xs' : 'text-sm font-medium'}
          style={{ color: 'var(--text-muted)' }}
        >
          {label}
        </span>
        <span
          className={compact ? 'text-xs font-bold' : 'text-sm font-bold'}
          style={{ color: 'var(--text-main)' }}
        >
          {pct.toFixed(1)}%
        </span>
      </div>
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: compact ? '4px' : '8px', background: 'rgba(148, 163, 184, 0.1)' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, var(--primary), var(--electric-blue))',
          }}
        />
      </div>
    </div>
  )
}
