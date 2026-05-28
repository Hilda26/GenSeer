import PoolProbabilityBar from './PoolProbabilityBar'
import type { Outcome } from '@/types'

interface Props {
  outcome: Outcome
  totalPool: number
  marketStatus: string
  onStake: () => void
}

export default function OutcomePoolCard({ outcome, totalPool, marketStatus, onStake }: Props) {
  const canStake = marketStatus === 'open'

  return (
    <div
      className="rounded-2xl p-5 transition-all"
      style={{
        background: 'var(--surface-soft)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
            {outcome.label}
          </div>
          {outcome.description && (
            <div className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
              {outcome.description}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="font-bold text-sm" style={{ color: 'var(--primary-glow)' }}>
            {outcome.total_staked.toLocaleString()}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-faint)' }}>units staked</div>
        </div>
      </div>

      <PoolProbabilityBar
        label=""
        outcomePool={outcome.total_staked}
        totalPool={totalPool}
        compact
      />

      {canStake && (
        <button
          onClick={onStake}
          className="mt-3 w-full py-2 rounded-xl text-xs font-bold transition-all"
          style={{
            background: 'rgba(108, 92, 231, 0.15)',
            border: '1px solid rgba(108, 92, 231, 0.3)',
            color: 'var(--primary-glow)',
          }}
        >
          Stake on This Outcome
        </button>
      )}
    </div>
  )
}
