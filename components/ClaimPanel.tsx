'use client'

import { useState, useEffect } from 'react'
import { calculateUserPayoutPreview } from '@/lib/utils/payout'
import type { Market, Outcome, Settlement } from '@/types'

interface Props {
  marketId: string
  market: Market
  outcomes: Outcome[]
  settlement: Settlement
  walletAddress: string
  onSuccess: () => void
}

export default function ClaimPanel({ marketId, market, outcomes, settlement, walletAddress, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [userStakeInWinning, setUserStakeInWinning] = useState<number | null>(null)
  const [totalUserStaked, setTotalUserStaked] = useState<number>(0)

  const winningOutcome = outcomes.find((o) => o.outcome_index === settlement.winning_outcome_index)
  const totalPool = outcomes.reduce((s, o) => s + o.total_staked, 0)

  useEffect(() => {
    async function fetchUserStake() {
      try {
        const res = await fetch(`/api/stake/user?market_id=${marketId}&wallet=${walletAddress}`)
        if (!res.ok) return
        const data = await res.json()
        const winIdx = settlement.winning_outcome_index
        if (winIdx != null && data.stakes_by_outcome) {
          setUserStakeInWinning(data.stakes_by_outcome[winIdx] || 0)
        }
        setTotalUserStaked(data.total_staked || 0)
      } catch { /* silently ignore */ }
    }
    fetchUserStake()
  }, [marketId, walletAddress, settlement.winning_outcome_index])

  const previewPayout = winningOutcome && totalPool > 0 && userStakeInWinning != null
    ? calculateUserPayoutPreview(userStakeInWinning, winningOutcome.total_staked, totalPool, market.platform_fee_bps)
    : null

  async function handleClaim() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/claims/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market_id: marketId, wallet_address: walletAddress }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Claim failed')
      setClaimed(true)
      setTxHash(data.genlayer_tx_hash || 'recorded')
      onSuccess()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="genseer-card p-6">
        <div className="text-xs font-bold mb-1" style={{ color: 'var(--text-faint)' }}>GenLayer Verdict</div>
        <div className="text-xl font-black mb-1" style={{ color: 'var(--signal-green)' }}>
          {settlement.winning_outcome_label}
        </div>
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Confidence: {settlement.confidence}%
        </div>
      </div>

      {claimed || txHash ? (
        <div className="genseer-card p-8 text-center">
          <div className="text-4xl mb-3">&#x2705;</div>
          <div className="font-bold text-lg mb-2" style={{ color: 'var(--signal-green)' }}>Payout Claimed</div>
          {txHash && <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>tx: {txHash}</div>}
        </div>
      ) : (
        <div className="genseer-card p-6">
          <h3 className="font-bold mb-4" style={{ color: 'var(--text-main)' }}>Claim Payout</h3>
          <div className="rounded-xl p-4 mb-4 space-y-3" style={{ background: 'var(--surface-soft)' }}>
            <div className="flex justify-between items-center">
              <span className="text-xs" style={{ color: 'var(--text-faint)' }}>Your total stake</span>
              <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                {totalUserStaked > 0 ? `${totalUserStaked.toLocaleString()} units` : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs" style={{ color: 'var(--text-faint)' }}>Stake in winning outcome</span>
              <span className="text-sm font-bold" style={{ color: userStakeInWinning ? 'var(--signal-green)' : 'var(--text-muted)' }}>
                {userStakeInWinning != null ? `${userStakeInWinning.toLocaleString()} units` : '—'}
              </span>
            </div>
            {previewPayout != null && (
              <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                <span className="text-xs font-medium" style={{ color: 'var(--text-faint)' }}>Estimated payout</span>
                <span className="text-base font-black" style={{ color: 'var(--signal-green)' }}>
                  ~{previewPayout.toLocaleString()} units
                </span>
              </div>
            )}
            {previewPayout == null && (
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                GenLayer calculates the official payout amount from your stake in the winning pool.
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 mb-4 text-sm"
                 style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-red)' }}>
              {error}
            </div>
          )}

          <button onClick={handleClaim} disabled={loading} className="genseer-button w-full">
            {loading ? 'Claiming on GenLayer...' : 'Claim Payout via GenLayer'}
          </button>
        </div>
      )}
    </div>
  )
}
