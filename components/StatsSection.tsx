'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Stats {
  total_markets: number
  open_markets: number
  settled_markets: number
  active_markets: number
  total_staked: number
  top_markets: { id: string; title: string; status: string; total_pool: number }[]
}

const STATUS_COLORS: Record<string, string> = {
  open: 'var(--signal-green)',
  closed: 'var(--text-faint)',
  evidence_phase: 'var(--electric-blue)',
  settlement_pending: '#fbbf24',
  settled: 'var(--primary-glow)',
  invalid: 'var(--danger-red)',
  cancelled: 'var(--text-faint)',
}

export default function StatsSection() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {})
  }, [])

  if (!stats) return null

  const statCards = [
    { label: 'Total Markets', value: stats.total_markets, icon: '📊' },
    { label: 'Open Now', value: stats.open_markets, icon: '🟢' },
    { label: 'Settled', value: stats.settled_markets, icon: '✅' },
    { label: 'Total Staked', value: `${stats.total_staked.toLocaleString()} units`, icon: '💰' },
  ]

  return (
    <section className="px-6 pb-10 max-w-6xl mx-auto">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="genseer-card p-5 text-center"
          >
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="text-2xl font-black mb-1" style={{ color: 'var(--text-main)' }}>
              {s.value}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-faint)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Top markets leaderboard */}
      {stats.top_markets.length > 0 && (
        <div className="genseer-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-black" style={{ color: 'var(--text-main)' }}>
              🏆 Top Markets by Pool
            </h2>
            <Link
              href="/markets"
              className="text-xs font-medium"
              style={{ color: 'var(--primary-glow)' }}
            >
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {stats.top_markets.map((m, i) => (
              <Link key={m.id} href={`/markets/${m.id}`}>
                <div
                  className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all cursor-pointer"
                  style={{ background: 'var(--surface-soft)' }}
                >
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                    style={{
                      background: i === 0 ? 'rgba(251,191,36,0.2)' : i === 1 ? 'rgba(156,163,175,0.15)' : 'rgba(180,120,80,0.15)',
                      color: i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : '#b47850',
                    }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-main)' }}>
                      {m.title}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>
                      {m.total_pool.toLocaleString()} units staked
                    </p>
                  </div>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      background: `${STATUS_COLORS[m.status] || 'var(--text-faint)'}20`,
                      color: STATUS_COLORS[m.status] || 'var(--text-faint)',
                    }}
                  >
                    {m.status.replace('_', ' ')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
