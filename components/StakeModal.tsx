'use client'

import { useState } from 'react'
import type { Outcome } from '@/types'
import { calculateUserPayoutPreview } from '@/lib/utils/payout'

interface Props {
  marketId: string
  outcomes: Outcome[]
  selectedOutcomeIndex: number
  walletAddress: string
  onClose: () => void
  onSuccess: () => void
}

export default function StakeModal({ marketId, outcomes, selectedOutcomeIndex, walletAddress, onClose, onSuccess }: Props) {
  const [amount, setAmount] = useState('')
  const [outcomeIndex, setOutcomeIndex] = useState(selectedOutcomeIndex)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const totalPool = outcomes.reduce((s, o) => s + o.total_staked, 0)
  const selectedOutcome = outcomes.find((o) => o.outcome_index === outcomeIndex)
  const amountNum = parseFloat(amount) || 0
  const previewPayout = selectedOutcome && amountNum > 0
    ? calculateUserPayoutPreview(
        amountNum,
        selectedOutcome.total_staked + amountNum,
        totalPool + amountNum
      )
    : 0

  async function handleStake() {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Enter a valid amount')
      return
    }
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/stake/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market_id: marketId,
          outcome_index: outcomeIndex,
          amount: parseFloat(amount),
          wallet_address: walletAddress,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Stake failed')
      setTxHash(data.genlayer_tx_hash || 'recorded')
      setTimeout(onSuccess, 1500)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
    >
      <div className="genseer-card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black" style={{ color: 'var(--text-main)' }}>Record Stake</h2>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>&#x2715;</button>
        </div>

        {txHash ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">&#x2705;</div>
            <div className="font-bold text-lg mb-2" style={{ color: 'var(--signal-green)' }}>Stake Recorded</div>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>GenLayer tx: {txHash.slice(0, 20)}...</div>
          </div>
        ) : (
          <>
            {/* Outcome selector */}
            <div className="mb-4">
              <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-faint)' }}>
                Outcome
              </label>
              <div className="space-y-2">
                {outcomes.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setOutcomeIndex(o.outcome_index)}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all"
                    style={{
                      background: outcomeIndex === o.outcome_index ? 'rgba(108, 92, 231, 0.15)' : 'var(--surface-soft)',
                      border: `1px solid ${outcomeIndex === o.outcome_index ? 'rgba(108, 92, 231, 0.4)' : 'var(--border)'}`,
                      color: outcomeIndex === o.outcome_index ? 'var(--primary-glow)' : 'var(--text-muted)',
                      fontWeight: outcomeIndex === o.outcome_index ? '700' : '400',
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div className="mb-4">
              <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-faint)' }}>
                Amount (testnet units)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 100"
                className="genseer-input text-sm"
                min="1"
              />
            </div>

            {/* Preview */}
            {amountNum > 0 && (
              <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--surface-soft)' }}>
                <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-faint)' }}>
                  Preview (if this outcome wins)
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>Estimated payout</span>
                  <span className="font-bold" style={{ color: 'var(--signal-green)' }}>
                    ~{previewPayout.toFixed(0)} units
                  </span>
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
                  Preview only. GenLayer contract is source of truth.
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl px-4 py-3 mb-4 text-sm"
                   style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-red)' }}>
                {error}
              </div>
            )}

            <button onClick={handleStake} disabled={loading} className="genseer-button w-full">
              {loading ? 'Submitting to GenLayer...' : 'Record Stake on GenLayer'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
