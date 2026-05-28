'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import SettlementVerdictCard from '@/components/SettlementVerdictCard'
import LoadingState from '@/components/LoadingState'
import MarketStatusBadge from '@/components/MarketStatusBadge'
import type { Settlement, Market, Outcome } from '@/types'

type StepState = 'idle' | 'loading' | 'success' | 'error'

interface StepMessage {
  type: 'success' | 'error'
  text: string
}

// Maps each status to human-readable action label and next step description
const LIFECYCLE: Record<string, { action: string; nextLabel: string; description: string; buttonStyle: string }> = {
  open: {
    action: 'advance',
    nextLabel: 'Close Market',
    description: 'Staking period is open. Close the market to stop new stakes and begin evidence collection.',
    buttonStyle: 'rgba(56, 189, 248, 0.15)',
  },
  closed: {
    action: 'advance',
    nextLabel: 'Open Evidence Phase',
    description: 'Market is closed to new stakes. Open the evidence phase to allow participants to submit supporting evidence.',
    buttonStyle: 'rgba(168, 85, 247, 0.15)',
  },
  evidence_phase: {
    action: 'settle',
    nextLabel: 'Submit to GenLayer',
    description: 'Evidence phase is active. When ready, package all evidence and submit to GenLayer validator consensus for settlement.',
    buttonStyle: 'rgba(108, 92, 231, 0.2)',
  },
  settlement_pending: {
    action: 'sync',
    nextLabel: 'Sync Verdict from GenLayer',
    description: 'Settlement transaction submitted. Poll GenLayer to check if validator consensus has reached a verdict.',
    buttonStyle: 'rgba(251, 191, 36, 0.15)',
  },
}

export default function SettlementPage() {
  const { id } = useParams()
  const [market, setMarket] = useState<Market | null>(null)
  const [outcomes, setOutcomes] = useState<Outcome[]>([])
  const [settlement, setSettlement] = useState<Settlement | null>(null)
  const [loading, setLoading] = useState(true)
  const [stepState, setStepState] = useState<StepState>('idle')
  const [message, setMessage] = useState<StepMessage | null>(null)

  useEffect(() => { if (id) fetchData() }, [id])

  async function fetchData() {
    try {
      setLoading(true)
      const [mRes, sRes] = await Promise.all([
        fetch(`/api/markets/${id}`),
        fetch(`/api/settlement?market_id=${id}`),
      ])
      if (mRes.ok) { const d = await mRes.json(); setMarket(d.market); setOutcomes(d.outcomes || []) }
      if (sRes.ok) { const d = await sRes.json(); setSettlement(d.settlement || null) }
    } finally {
      setLoading(false)
    }
  }

  async function handleAdvance() {
    try {
      setStepState('loading')
      setMessage(null)
      const res = await fetch(`/api/markets/${id}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'advance' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to advance market')
      setMessage({ type: 'success', text: `Market advanced: ${data.from} → ${data.to}` })
      setStepState('success')
      setTimeout(fetchData, 1500)
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message })
      setStepState('error')
    }
  }

  async function handleSettle() {
    try {
      setStepState('loading')
      setMessage(null)
      const res = await fetch('/api/settlement/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market_id: id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit settlement')
      setMessage({ type: 'success', text: 'Settlement packet submitted to GenLayer. Validator consensus is running.' })
      setStepState('success')
      setTimeout(fetchData, 2000)
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message })
      setStepState('error')
    }
  }

  async function handleSync() {
    try {
      setStepState('loading')
      setMessage(null)
      const res = await fetch('/api/settlement/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market_id: id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Verdict not ready yet — try again shortly')
      setMessage({ type: 'success', text: `Verdict synced: ${data.settlement?.verdict || 'settled'}` })
      setStepState('success')
      setTimeout(fetchData, 1500)
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message })
      setStepState('error')
    }
  }

  async function handleCancel() {
    if (!confirm('Cancel this market? All stakes will become refundable.')) return
    try {
      setStepState('loading')
      setMessage(null)
      const res = await fetch(`/api/markets/${id}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to cancel market')
      setMessage({ type: 'success', text: 'Market cancelled. Stakes are now refundable.' })
      setStepState('success')
      setTimeout(fetchData, 1500)
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message })
      setStepState('error')
    }
  }

  if (loading) return <div className="max-w-4xl mx-auto px-6 py-10"><LoadingState /></div>

  const lifecycle = market ? LIFECYCLE[market.status] : null
  const isTerminal = market && ['settled', 'invalid', 'cancelled'].includes(market.status)

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        <Link href="/markets">Markets</Link>
        <span>/</span>
        <Link href={`/markets/${id}`}>{market?.title?.slice(0, 30)}...</Link>
        <span>/</span>
        <span style={{ color: 'var(--text-faint)' }}>Settlement</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-main)' }}>Settlement Lifecycle</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Manage market state transitions and trigger GenLayer validator consensus.
        </p>
      </div>

      {/* Status badge */}
      {market && (
        <div className="mb-6">
          <MarketStatusBadge status={market.status} />
        </div>
      )}

      {/* Progress steps */}
      <div className="genseer-card p-5 mb-6">
        <div className="flex items-center justify-between">
          {[
            { label: 'Open', status: 'open' },
            { label: 'Closed', status: 'closed' },
            { label: 'Evidence', status: 'evidence_phase' },
            { label: 'Pending', status: 'settlement_pending' },
            { label: 'Settled', status: 'settled' },
          ].map((step, i, arr) => {
            const statuses = ['open', 'closed', 'evidence_phase', 'settlement_pending', 'settled', 'invalid', 'cancelled']
            const currentIdx = statuses.indexOf(market?.status || 'open')
            const stepIdx = statuses.indexOf(step.status)
            const isDone = currentIdx > stepIdx
            const isCurrent = market?.status === step.status
            return (
              <div key={step.status} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1"
                    style={{
                      background: isDone
                        ? 'var(--signal-green)'
                        : isCurrent
                        ? 'var(--primary)'
                        : 'var(--surface-raised)',
                      color: isDone || isCurrent ? 'white' : 'var(--text-faint)',
                    }}
                  >
                    {isDone ? '✓' : i + 1}
                  </div>
                  <span
                    className="text-xs"
                    style={{ color: isCurrent ? 'var(--text-main)' : isDone ? 'var(--signal-green)' : 'var(--text-faint)' }}
                  >
                    {step.label}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div
                    className="h-0.5 flex-1 mx-1 mb-5"
                    style={{ background: isDone ? 'var(--signal-green)' : 'var(--border)' }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Feedback message */}
      {message && (
        <div
          className="rounded-xl px-5 py-4 mb-6 text-sm font-medium"
          style={{
            background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: message.type === 'success' ? 'var(--signal-green)' : 'var(--danger-red)',
          }}
        >
          {message.text}
        </div>
      )}

      {/* Action panel */}
      {!isTerminal && lifecycle && (
        <div
          className="genseer-card p-6 mb-6"
          style={{ background: lifecycle.buttonStyle, border: '1px solid var(--border)' }}
        >
          <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
            {lifecycle.description}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={
                lifecycle.action === 'advance'
                  ? handleAdvance
                  : lifecycle.action === 'settle'
                  ? handleSettle
                  : handleSync
              }
              disabled={stepState === 'loading'}
              className="genseer-button px-6 py-2.5 text-sm"
              style={{ opacity: stepState === 'loading' ? 0.7 : 1 }}
            >
              {stepState === 'loading' ? 'Processing…' : lifecycle.nextLabel}
            </button>

            {['open', 'closed'].includes(market?.status || '') && (
              <button
                onClick={handleCancel}
                disabled={stepState === 'loading'}
                className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: 'var(--danger-red)',
                  background: 'rgba(239,68,68,0.06)',
                  opacity: stepState === 'loading' ? 0.5 : 1,
                }}
              >
                Cancel Market
              </button>
            )}

            {market?.status === 'settlement_pending' && (
              <p className="self-center text-xs" style={{ color: 'var(--text-faint)' }}>
                GenLayer validator consensus may take a few minutes.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Settled / Invalid / Cancelled terminal states */}
      {market?.status === 'cancelled' && (
        <div className="genseer-card p-8 text-center mb-6">
          <div className="text-3xl mb-3">🚫</div>
          <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text-main)' }}>Market Cancelled</h3>
          <p style={{ color: 'var(--text-muted)' }}>All stakes are refundable from the Claim page.</p>
          <Link href={`/markets/${id}/claim`} className="genseer-button px-6 py-2.5 text-sm mt-4 inline-block">
            Go to Claims
          </Link>
        </div>
      )}

      {/* Verdict card */}
      {settlement ? (
        <SettlementVerdictCard settlement={settlement} outcomes={outcomes} />
      ) : ['settled', 'invalid'].includes(market?.status || '') ? (
        <div className="genseer-card p-12 text-center">
          <div className="text-4xl mb-4">🔮</div>
          <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>
            Verdict Not Synced Yet
          </h3>
          <p className="mb-6" style={{ color: 'var(--text-muted)' }}>
            The market is marked {market?.status} but the verdict details have not been synced from GenLayer yet.
          </p>
          <button onClick={handleSync} disabled={stepState === 'loading'} className="genseer-button px-6 py-3">
            {stepState === 'loading' ? 'Syncing…' : 'Sync Verdict Now'}
          </button>
        </div>
      ) : !lifecycle ? null : (
        <div className="genseer-card p-12 text-center">
          <div className="text-4xl mb-4">🔮</div>
          <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>No Verdict Yet</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            Complete the lifecycle steps above to reach settlement.
          </p>
        </div>
      )}
    </div>
  )
}
