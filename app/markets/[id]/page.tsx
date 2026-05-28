'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import MarketStatusBadge from '@/components/MarketStatusBadge'
import OutcomePoolCard from '@/components/OutcomePoolCard'
import PoolProbabilityBar from '@/components/PoolProbabilityBar'
import StakeModal from '@/components/StakeModal'
import LoadingState from '@/components/LoadingState'
import { formatDateTime, formatTimeRemaining, formatCategoryLabel } from '@/lib/utils/formatting'
import { useWallet } from '@/contexts/WalletContext'
import { supabase } from '@/lib/supabase/client'
import type { Market, Outcome } from '@/types'

export default function MarketDetailPage() {
  const { id } = useParams()
  const { address: walletAddress, isConnected, connect } = useWallet()
  const [market, setMarket] = useState<Market | null>(null)
  const [outcomes, setOutcomes] = useState<Outcome[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stakeModalOpen, setStakeModalOpen] = useState(false)
  const [selectedOutcomeIndex, setSelectedOutcomeIndex] = useState<number | null>(null)
  const [walletPrompt, setWalletPrompt] = useState(false)
  const [liveConnected, setLiveConnected] = useState(false)
  const fetchRef = useRef(fetchMarket)
  fetchRef.current = fetchMarket

  useEffect(() => {
    if (id) fetchMarket()
  }, [id])

  // Supabase Realtime — listen for stake broadcasts and postgres changes
  useEffect(() => {
    if (!id) return

    const channel = supabase
      .channel(`market-pool-${id}`)
      // Broadcast: instant update when someone stakes (sent by /api/stake/record)
      .on('broadcast', { event: 'stake_recorded' }, () => { fetchRef.current() })
      // Postgres changes: fires if outcomes table is in realtime publication
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'outcomes', filter: `market_id=eq.${id}` },
        () => { fetchRef.current() }
      )
      .subscribe((status) => {
        setLiveConnected(status === 'SUBSCRIBED')
      })

    // Fallback: poll every 20s when not live (e.g. realtime not configured)
    const poll = setInterval(() => {
      if (!liveConnected) fetchRef.current()
    }, 20000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
    }
  }, [id, liveConnected])

  async function fetchMarket() {
    try {
      setLoading(true)
      const res = await fetch(`/api/markets/${id}`)
      if (!res.ok) throw new Error('Market not found')
      const data = await res.json()
      setMarket(data.market)
      setOutcomes(data.outcomes || [])
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="max-w-4xl mx-auto px-6 py-10"><LoadingState message="Loading market..." /></div>
  if (error || !market) return (
    <div className="max-w-4xl mx-auto px-6 py-10 text-center">
      <p style={{ color: 'var(--danger-red)' }}>{error || 'Market not found'}</p>
      <Link href="/markets" className="mt-4 genseer-button px-6 py-2 text-sm inline-block">Back to Markets</Link>
    </div>
  )

  const totalPool = outcomes.reduce((sum, o) => sum + o.total_staked, 0)

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        <Link href="/markets" className="hover:text-primary-glow transition-colors">Markets</Link>
        <span>/</span>
        <span style={{ color: 'var(--text-faint)' }}>{market.title.slice(0, 40)}...</span>
      </div>

      {/* Market Header */}
      <div className="genseer-card p-8 mb-6">
        <div className="flex flex-wrap items-start gap-3 mb-4">
          <MarketStatusBadge status={market.status} />
          <span className="px-3 py-1 rounded-full text-xs font-medium"
                style={{ background: 'rgba(56, 189, 248, 0.12)', color: 'var(--electric-blue)' }}>
            {formatCategoryLabel(market.category)}
          </span>
        </div>
        <h1 className="text-2xl font-black mb-4" style={{ color: 'var(--text-main)' }}>{market.title}</h1>
        <p className="mb-6" style={{ color: 'var(--text-muted)' }}>{market.description}</p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Pool', value: `${totalPool.toLocaleString()} units` },
            { label: 'Closes', value: formatTimeRemaining(market.close_at) },
            { label: 'Evidence Ends', value: formatDateTime(market.evidence_ends_at) },
            { label: 'Settlement', value: formatDateTime(market.settlement_at) },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl p-4" style={{ background: 'var(--surface-soft)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--text-faint)' }}>{stat.label}</div>
              <div className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pool Probability */}
      {totalPool > 0 && (
        <div className="genseer-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold" style={{ color: 'var(--text-main)' }}>Market Belief</h2>
            {liveConnected && (
              <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full"
                    style={{ background: 'rgba(0,200,110,0.1)', color: 'var(--signal-green)' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--signal-green)' }} />
                Live
              </span>
            )}
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--text-faint)' }}>Pool distribution shows collective stake, not settlement outcome</p>
          {outcomes.map((outcome) => (
            <PoolProbabilityBar
              key={outcome.id}
              label={outcome.label}
              outcomePool={outcome.total_staked}
              totalPool={totalPool}
            />
          ))}
        </div>
      )}

      {/* Outcomes */}
      <div className="genseer-card p-6 mb-6">
        <h2 className="font-bold mb-4" style={{ color: 'var(--text-main)' }}>Outcomes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {outcomes.map((outcome) => (
            <OutcomePoolCard
              key={outcome.id}
              outcome={outcome}
              totalPool={totalPool}
              marketStatus={market.status}
              onStake={() => {
                if (!isConnected) { setWalletPrompt(true); return }
                setSelectedOutcomeIndex(outcome.outcome_index)
                setStakeModalOpen(true)
              }}
            />
          ))}
        </div>
      </div>

      {/* Settlement Criteria */}
      <div className="genseer-card p-6 mb-6">
        <h2 className="font-bold mb-3" style={{ color: 'var(--text-main)' }}>Settlement Criteria</h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{market.settlement_criteria}</p>
        {market.approved_sources?.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-faint)' }}>Approved Sources</div>
            <div className="flex flex-wrap gap-2">
              {market.approved_sources.map((source, i) => (
                <span key={i} className="px-3 py-1 rounded-full text-xs"
                      style={{ background: 'rgba(108, 92, 231, 0.1)', color: 'var(--primary-glow)' }}>
                  {source}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Links */}
      <div className="flex flex-wrap gap-4">
        <Link href={`/markets/${id}/evidence`}
          className="flex-1 text-center py-3 px-6 rounded-2xl font-bold text-sm transition-all"
          style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', color: 'var(--electric-blue)' }}>
          Evidence & Challenges
        </Link>
        <Link href={`/markets/${id}/settlement`}
          className="flex-1 text-center py-3 px-6 rounded-2xl font-bold text-sm transition-all"
          style={{ background: 'rgba(108, 92, 231, 0.1)', border: '1px solid rgba(108, 92, 231, 0.2)', color: 'var(--primary-glow)' }}>
          Settlement Verdict
        </Link>
        <Link href={`/markets/${id}/claim`}
          className="flex-1 text-center py-3 px-6 rounded-2xl font-bold text-sm transition-all"
          style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: 'var(--signal-green)' }}>
          Claim Payout / Refund
        </Link>
      </div>

      {/* Wallet connect prompt */}
      {walletPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        >
          <div className="genseer-card w-full max-w-sm p-8 text-center">
            <div className="text-4xl mb-4">🔌</div>
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>Wallet Required</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Connect your wallet to stake on this market.</p>
            <div className="flex gap-3">
              <button onClick={() => setWalletPrompt(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>Cancel</button>
              <button onClick={() => { setWalletPrompt(false); connect() }} className="genseer-button flex-1 py-2.5 text-sm">
                Connect Wallet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stake Modal */}
      {stakeModalOpen && selectedOutcomeIndex !== null && walletAddress && (
        <StakeModal
          marketId={market.id}
          outcomes={outcomes}
          selectedOutcomeIndex={selectedOutcomeIndex}
          walletAddress={walletAddress}
          onClose={() => setStakeModalOpen(false)}
          onSuccess={() => { setStakeModalOpen(false); fetchMarket() }}
        />
      )}
    </div>
  )
}
