'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useWallet } from '@/contexts/WalletContext'
import MarketStatusBadge from '@/components/MarketStatusBadge'
import LoadingState from '@/components/LoadingState'

interface AdminMarket {
  id: string
  title: string
  status: string
  category: string
  close_at: string
  created_at: string
  total_pool: number
}

interface Summary {
  total: number
  by_status: Record<string, number>
  total_staked: number
}

type StepState = 'idle' | 'loading' | 'success' | 'error'

const ADMIN_WALLET = process.env.NEXT_PUBLIC_ADMIN_WALLET || ''

const STATUS_ORDER = ['open', 'closed', 'evidence_phase', 'settlement_pending', 'settled', 'invalid', 'cancelled']

export default function AdminPage() {
  const { address, isConnected, connect } = useWallet()
  const [markets, setMarkets] = useState<AdminMarket[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionState, setActionState] = useState<Record<string, StepState>>({})
  const [actionMsg, setActionMsg] = useState<Record<string, string>>({})
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')

  const isAdmin = isConnected && address?.toLowerCase() === ADMIN_WALLET.toLowerCase()

  useEffect(() => {
    if (isAdmin) fetchMarkets()
  }, [isAdmin])

  async function fetchMarkets() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/markets?wallet=${address}`)
      const data = await res.json()
      if (res.ok) {
        setMarkets(data.markets || [])
        setSummary(data.summary || null)
      }
    } finally {
      setLoading(false)
    }
  }

  async function advanceMarket(marketId: string, action: 'advance' | 'cancel') {
    setActionState((s) => ({ ...s, [marketId]: 'loading' }))
    setActionMsg((s) => ({ ...s, [marketId]: '' }))
    try {
      const res = await fetch(`/api/markets/${marketId}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setActionState((s) => ({ ...s, [marketId]: 'success' }))
      setActionMsg((s) => ({ ...s, [marketId]: action === 'cancel' ? 'Cancelled' : `${data.from} → ${data.to}` }))
      setTimeout(fetchMarkets, 1200)
    } catch (err) {
      setActionState((s) => ({ ...s, [marketId]: 'error' }))
      setActionMsg((s) => ({ ...s, [marketId]: (err as Error).message }))
    }
  }

  const filtered = markets
    .filter((m) => !filterStatus || m.status === filterStatus)
    .filter((m) => !search || m.title.toLowerCase().includes(search.toLowerCase()))

  if (!isConnected) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-2xl font-black mb-3" style={{ color: 'var(--text-main)' }}>Admin Area</h1>
        <p className="mb-6" style={{ color: 'var(--text-muted)' }}>Connect your wallet to access the admin dashboard.</p>
        <button onClick={connect} className="genseer-button px-8 py-3">Connect Wallet</button>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <div className="text-5xl mb-4">⛔</div>
        <h1 className="text-2xl font-black mb-3" style={{ color: 'var(--text-main)' }}>Access Denied</h1>
        <p className="mb-2" style={{ color: 'var(--text-muted)' }}>Your wallet is not authorised to access this area.</p>
        <p className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>{address}</p>
        <Link href="/" className="mt-6 genseer-button px-6 py-2.5 text-sm inline-block">Go Home</Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-main)' }}>Admin Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Manage all markets and lifecycle transitions.
          </p>
        </div>
        <button onClick={fetchMarkets} className="genseer-button px-4 py-2 text-sm">
          Refresh
        </button>
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="genseer-card p-4 text-center">
            <div className="text-2xl font-black mb-1" style={{ color: 'var(--text-main)' }}>{summary.total}</div>
            <div className="text-xs" style={{ color: 'var(--text-faint)' }}>Total Markets</div>
          </div>
          {Object.entries(summary.by_status)
            .sort(([a], [b]) => STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b))
            .slice(0, 3)
            .map(([status, count]) => (
              <div key={status} className="genseer-card p-4 text-center">
                <div className="text-2xl font-black mb-1" style={{ color: 'var(--text-main)' }}>{count}</div>
                <div className="text-xs capitalize" style={{ color: 'var(--text-faint)' }}>{status.replace('_', ' ')}</div>
              </div>
            ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search markets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="genseer-input text-sm"
          style={{ minWidth: 240 }}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="genseer-input text-sm"
          style={{ minWidth: 160 }}
        >
          <option value="">All Statuses</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <span className="self-center text-xs" style={{ color: 'var(--text-faint)' }}>
          {filtered.length} market{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Markets table */}
      {loading ? (
        <LoadingState />
      ) : (
        <div className="genseer-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Market', 'Status', 'Pool', 'Closes', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold"
                    style={{ color: 'var(--text-faint)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const state = actionState[m.id] || 'idle'
                const msg = actionMsg[m.id] || ''
                const canAdvance = ['open', 'closed', 'evidence_phase', 'settlement_pending'].includes(m.status)
                const canCancel = ['open', 'closed'].includes(m.status)
                return (
                  <tr
                    key={m.id}
                    style={{ borderBottom: '1px solid var(--border)' }}
                    className="hover:bg-surface-soft transition-colors"
                  >
                    <td className="px-4 py-3" style={{ maxWidth: 280 }}>
                      <Link
                        href={`/markets/${m.id}`}
                        className="font-medium line-clamp-2 hover:underline"
                        style={{ color: 'var(--text-main)' }}
                      >
                        {m.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <MarketStatusBadge status={m.status} />
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                      {m.total_pool.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-faint)' }}>
                      {new Date(m.close_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {canAdvance && (
                          <button
                            onClick={() => advanceMarket(m.id, 'advance')}
                            disabled={state === 'loading'}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                            style={{
                              background: 'rgba(108,92,231,0.15)',
                              color: 'var(--primary-glow)',
                              border: '1px solid rgba(108,92,231,0.3)',
                              opacity: state === 'loading' ? 0.5 : 1,
                            }}
                          >
                            {state === 'loading' ? '…' : 'Advance'}
                          </button>
                        )}
                        {canCancel && (
                          <button
                            onClick={() => advanceMarket(m.id, 'cancel')}
                            disabled={state === 'loading'}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                            style={{
                              background: 'rgba(239,68,68,0.08)',
                              color: 'var(--danger-red)',
                              border: '1px solid rgba(239,68,68,0.25)',
                              opacity: state === 'loading' ? 0.5 : 1,
                            }}
                          >
                            Cancel
                          </button>
                        )}
                        <Link
                          href={`/markets/${m.id}/settlement`}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{
                            background: 'rgba(56,189,248,0.1)',
                            color: 'var(--electric-blue)',
                            border: '1px solid rgba(56,189,248,0.2)',
                          }}
                        >
                          Settlement
                        </Link>
                        {msg && (
                          <span
                            className="text-xs"
                            style={{ color: state === 'error' ? 'var(--danger-red)' : 'var(--signal-green)' }}
                          >
                            {msg}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-12" style={{ color: 'var(--text-faint)' }}>
              No markets match your filters.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
