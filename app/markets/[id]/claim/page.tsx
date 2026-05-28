'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import ClaimPanel from '@/components/ClaimPanel'
import RefundPanel from '@/components/RefundPanel'
import LoadingState from '@/components/LoadingState'
import MarketStatusBadge from '@/components/MarketStatusBadge'
import { useWallet } from '@/contexts/WalletContext'
import type { Market, Outcome, Settlement } from '@/types'

export default function ClaimPage() {
  const { id } = useParams()
  const { address: walletAddress, isConnected, connect } = useWallet()
  const [market, setMarket] = useState<Market | null>(null)
  const [outcomes, setOutcomes] = useState<Outcome[]>([])
  const [settlement, setSettlement] = useState<Settlement | null>(null)
  const [loading, setLoading] = useState(true)

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

  if (loading) return <div className="max-w-4xl mx-auto px-6 py-10"><LoadingState /></div>

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        <Link href="/markets">Markets</Link>
        <span>/</span>
        <Link href={`/markets/${id}`}>{market?.title?.slice(0, 30)}...</Link>
        <span>/</span>
        <span style={{ color: 'var(--text-faint)' }}>Claim</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-main)' }}>
          Claim Payout / Refund
        </h1>
        {market && <div className="mt-2"><MarketStatusBadge status={market.status} /></div>}
      </div>

      {!isConnected ? (
        <div className="genseer-card p-12 text-center">
          <div className="text-4xl mb-4">🔌</div>
          <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>Connect Your Wallet</h3>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            Connect your wallet to claim payouts or refunds.
          </p>
          <button onClick={connect} className="genseer-button px-8 py-3">Connect Wallet</button>
        </div>
      ) : !market ? (
        <div className="genseer-card p-8 text-center" style={{ color: 'var(--text-muted)' }}>
          Market not found
        </div>
      ) : market.status === 'settled' && settlement && walletAddress ? (
        <ClaimPanel
          marketId={id as string}
          market={market}
          outcomes={outcomes}
          settlement={settlement}
          walletAddress={walletAddress}
          onSuccess={fetchData}
        />
      ) : (market.status === 'invalid' || market.status === 'cancelled') && walletAddress ? (
        <RefundPanel
          marketId={id as string}
          market={market}
          walletAddress={walletAddress}
          onSuccess={fetchData}
        />
      ) : (
        <div className="genseer-card p-12 text-center">
          <div className="text-4xl mb-4">⏳</div>
          <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>
            Not Yet Available
          </h3>
          <p style={{ color: 'var(--text-muted)' }}>
            Claims are available after market settlement or if the market is marked invalid.
            Current status: <strong>{market.status}</strong>
          </p>
        </div>
      )}
    </div>
  )
}
