'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import MarketCard from '@/components/MarketCard'
import LoadingState from '@/components/LoadingState'
import EmptyState from '@/components/EmptyState'
import { MARKET_CATEGORIES } from '@/lib/utils/constants'
import type { Market, Outcome } from '@/types'

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'evidence_phase', label: 'Evidence Phase' },
  { value: 'settlement_pending', label: 'Settling' },
  { value: 'settled', label: 'Settled' },
  { value: 'invalid', label: 'Invalid' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'closes_soon', label: 'Closes Soonest' },
  { value: 'most_staked', label: 'Most Staked' },
  { value: 'oldest', label: 'Oldest' },
]

function getMarketPool(m: Market) {
  return (m.outcomes || []).reduce((sum: number, o: Outcome) => sum + (o.total_staked || 0), 0)
}

export default function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    fetchMarkets()
  }, [statusFilter, categoryFilter])

  async function fetchMarkets() {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (categoryFilter) params.set('category', categoryFilter)
      const res = await fetch(`/api/markets?${params}`)
      if (!res.ok) throw new Error('Failed to fetch markets')
      const data = await res.json()
      setMarkets(data.markets || [])
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const filtered = markets.filter((m) =>
    !search || m.title.toLowerCase().includes(search.toLowerCase())
  )

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'closes_soon') return new Date(a.close_at).getTime() - new Date(b.close_at).getTime()
    if (sortBy === 'most_staked') return getMarketPool(b) - getMarketPool(a)
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime() // newest
  })

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
        <div className="flex-1">
          <h1 className="text-3xl font-black" style={{ color: 'var(--text-main)' }}>
            Markets
          </h1>
          <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
            Subjective prediction markets settled by GenLayer validator consensus
          </p>
        </div>
        <Link href="/markets/create" className="genseer-button px-6 py-3 text-sm whitespace-nowrap">
          + Create Market
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Search + Sort row */}
        <div className="flex gap-3 w-full">
          <input
            type="text"
            placeholder="Search markets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="genseer-input flex-1 min-w-48 text-sm"
            style={{ maxWidth: 320 }}
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="genseer-input text-sm"
            style={{ minWidth: 160 }}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        {/* Status pills */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                background: statusFilter === f.value ? 'var(--primary)' : 'rgba(255,255,255,0.04)',
                color: statusFilter === f.value ? 'white' : 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        {/* Category pills */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setCategoryFilter('')}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{
              background: !categoryFilter ? 'var(--primary)' : 'rgba(255,255,255,0.04)',
              color: !categoryFilter ? 'white' : 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}
          >
            All Categories
          </button>
          {MARKET_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                background: categoryFilter === cat.value ? 'var(--primary)' : 'rgba(255,255,255,0.04)',
                color: categoryFilter === cat.value ? 'white' : 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <LoadingState message="Loading markets..." />
      ) : error ? (
        <div className="genseer-card p-8 text-center">
          <p style={{ color: 'var(--danger-red)' }}>{error}</p>
          <button onClick={fetchMarkets} className="mt-4 genseer-button px-6 py-2 text-sm">
            Retry
          </button>
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          title="No markets found"
          description={search ? `No markets match "${search}"` : 'Be the first to create a market'}
          action={<Link href="/markets/create" className="genseer-button px-6 py-3 text-sm inline-block">Create Market</Link>}
        />
      ) : (
        <>
          <div className="text-xs mb-4" style={{ color: 'var(--text-faint)' }}>
            {sorted.length} market{sorted.length !== 1 ? 's' : ''}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
