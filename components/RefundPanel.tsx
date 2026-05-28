'use client'

import { useState } from 'react'
import type { Market } from '@/types'

interface Props {
  marketId: string
  market: Market
  walletAddress: string
  onSuccess: () => void
}

export default function RefundPanel({ marketId, market, walletAddress, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  async function handleRefund() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/claims/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market_id: marketId, wallet_address: walletAddress }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Refund failed')
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
      <div className="rounded-2xl p-5"
           style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
        <div className="text-xs font-bold mb-1" style={{ color: 'var(--text-faint)' }}>Market Status</div>
        <div className="text-lg font-black capitalize" style={{ color: 'var(--danger-red)' }}>
          {market.status === 'invalid' ? 'Invalid / No Contest' : 'Cancelled'}
        </div>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Full refund of your recorded stake is available via GenLayer.
        </p>
      </div>

      {claimed || txHash ? (
        <div className="genseer-card p-8 text-center">
          <div className="text-4xl mb-3">&#x2705;</div>
          <div className="font-bold text-lg mb-2" style={{ color: 'var(--signal-green)' }}>Refund Claimed</div>
          {txHash && <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>tx: {txHash}</div>}
        </div>
      ) : (
        <div className="genseer-card p-6">
          <h3 className="font-bold mb-4" style={{ color: 'var(--text-main)' }}>Claim Refund</h3>
          <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--surface-soft)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--text-faint)' }}>Refund amount</div>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
              100% of your total staked amount (no platform fee on refunds).
              GenLayer calculates and records the official refund.
            </div>
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 mb-4 text-sm"
                 style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-red)' }}>
              {error}
            </div>
          )}

          <button onClick={handleRefund} disabled={loading} className="genseer-button w-full"
                  style={{ background: 'linear-gradient(135deg, var(--warning-amber), var(--danger-red))' }}>
            {loading ? 'Claiming Refund on GenLayer...' : 'Claim Refund via GenLayer'}
          </button>
        </div>
      )}
    </div>
  )
}
