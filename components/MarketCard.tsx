import Link from 'next/link'
import MarketStatusBadge from './MarketStatusBadge'
import PoolProbabilityBar from './PoolProbabilityBar'
import { formatCategoryLabel, formatTimeRemaining, formatNumber } from '@/lib/utils/formatting'
import type { Market, Outcome } from '@/types'

interface Props {
  market: Market & { outcomes?: Outcome[] }
}

export default function MarketCard({ market }: Props) {
  const outcomes = market.outcomes || []
  const totalPool = outcomes.reduce((s, o) => s + o.total_staked, 0)

  return (
    <Link href={`/markets/${market.id}`}>
      <div
        className="genseer-card p-6 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-2xl group"
        style={{ borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <MarketStatusBadge status={market.status} />
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--electric-blue)' }}
          >
            {formatCategoryLabel(market.category)}
          </span>
        </div>

        {/* Title */}
        <h3
          className="font-bold text-base mb-3 line-clamp-2 group-hover:text-primary-glow transition-colors"
          style={{ color: 'var(--text-main)' }}
        >
          {market.title}
        </h3>

        {/* Pool */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs" style={{ color: 'var(--text-faint)' }}>Total Pool</div>
            <div className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
              {formatNumber(totalPool)} units
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs" style={{ color: 'var(--text-faint)' }}>Closes in</div>
            <div className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
              {formatTimeRemaining(market.close_at)}
            </div>
          </div>
        </div>

        {/* Probability bars */}
        {totalPool > 0 && outcomes.slice(0, 3).map((outcome) => (
          <PoolProbabilityBar
            key={outcome.id}
            label={outcome.label}
            outcomePool={outcome.total_staked}
            totalPool={totalPool}
            compact
          />
        ))}

        {outcomes.length > 3 && (
          <p className="text-xs mt-2" style={{ color: 'var(--text-faint)' }}>
            +{outcomes.length - 3} more outcomes
          </p>
        )}
      </div>
    </Link>
  )
}
