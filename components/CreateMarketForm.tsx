'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MARKET_CATEGORIES, MARKET_TEMPLATES } from '@/lib/utils/constants'
import { validateMarketForm } from '@/lib/utils/validation'
import { useWallet } from '@/contexts/WalletContext'

export default function CreateMarketForm() {
  const router = useRouter()
  const { address: walletAddress, isConnected, connect } = useWallet()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'crypto_launch',
    outcomes: ['', '', '', ''],
    closeAt: '',
    evidenceEndsAt: '',
    settlementAt: '',
    settlementCriteria: '',
    approvedSources: '',
    minimumTotalPool: 100,
    minimumOpposingRatioBps: 1000,
    platformFeeBps: 500,
  })

  function applyTemplate(category: string) {
    const template = MARKET_TEMPLATES[category as keyof typeof MARKET_TEMPLATES]
    if (!template) return
    setForm((f) => ({
      ...f,
      category,
      title: template.title,
      outcomes: [...template.outcomes, '', ''].slice(0, 4),
      settlementCriteria: template.settlementCriteria,
    }))
  }

  function updateOutcome(index: number, value: string) {
    const outcomes = [...form.outcomes]
    outcomes[index] = value
    setForm((f) => ({ ...f, outcomes }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isConnected || !walletAddress) {
      setErrors(['Please connect your wallet before creating a market.'])
      return
    }
    const filteredOutcomes = form.outcomes.filter((o) => o.trim())
    const validation = validateMarketForm({
      ...form,
      outcomes: filteredOutcomes,
    })
    if (!validation.valid) {
      setErrors(validation.errors)
      return
    }
    setErrors([])
    try {
      setLoading(true)
      const res = await fetch('/api/markets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          outcomes: filteredOutcomes,
          approvedSources: form.approvedSources.split('\n').map((s) => s.trim()).filter(Boolean),
          walletAddress,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create market')
      router.push(`/markets/${data.market.id}`)
    } catch (err) {
      setErrors([(err as Error).message])
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Template Quick-fill */}
      <div className="genseer-card p-5">
        <div className="text-xs font-medium mb-3" style={{ color: 'var(--text-faint)' }}>Quick-fill from template</div>
        <div className="flex gap-2 flex-wrap">
          {MARKET_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => applyTemplate(cat.value)}
              className="px-4 py-2 rounded-full text-xs font-medium transition-all"
              style={{
                background: form.category === cat.value ? 'var(--primary)' : 'rgba(255,255,255,0.04)',
                color: form.category === cat.value ? 'white' : 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Core Fields */}
      <div className="genseer-card p-6 space-y-5">
        <h2 className="font-bold" style={{ color: 'var(--text-main)' }}>Market Details</h2>

        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-faint)' }}>Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Did Project X launch create meaningful adoption?"
            className="genseer-input text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-faint)' }}>Description *</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Provide context for this market..."
            rows={3}
            className="genseer-input text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-faint)' }}>Category *</label>
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="genseer-input text-sm"
          >
            {MARKET_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Outcomes */}
      <div className="genseer-card p-6">
        <h2 className="font-bold mb-4" style={{ color: 'var(--text-main)' }}>Outcomes (min 2)</h2>
        <div className="space-y-3">
          {form.outcomes.map((outcome, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: 'var(--surface-raised)', color: 'var(--text-faint)' }}>
                {i + 1}
              </span>
              <input
                type="text"
                value={outcome}
                onChange={(e) => updateOutcome(i, e.target.value)}
                placeholder={`Outcome ${i + 1}${i < 2 ? ' *' : ' (optional)'}`}
                className="genseer-input text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dates */}
      <div className="genseer-card p-6">
        <h2 className="font-bold mb-4" style={{ color: 'var(--text-main)' }}>Timeline</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Market Close Date *', key: 'closeAt', hint: 'When staking ends' },
            { label: 'Evidence Deadline *', key: 'evidenceEndsAt', hint: 'After close date' },
            { label: 'Settlement Date *', key: 'settlementAt', hint: 'After evidence ends' },
          ].map((field) => (
            <div key={field.key}>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-faint)' }}>
                {field.label}
              </label>
              <input
                type="datetime-local"
                value={form[field.key as keyof typeof form] as string}
                onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                className="genseer-input text-sm"
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>{field.hint}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Settlement Criteria */}
      <div className="genseer-card p-6 space-y-4">
        <h2 className="font-bold" style={{ color: 'var(--text-main)' }}>Settlement Rules</h2>
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-faint)' }}>
            Settlement Criteria *
          </label>
          <textarea
            value={form.settlementCriteria}
            onChange={(e) => setForm((f) => ({ ...f, settlementCriteria: e.target.value }))}
            placeholder="Describe exactly how GenLayer should judge this market..."
            rows={4}
            className="genseer-input text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-faint)' }}>
            Approved Sources (one per line)
          </label>
          <textarea
            value={form.approvedSources}
            onChange={(e) => setForm((f) => ({ ...f, approvedSources: e.target.value }))}
            placeholder={'official blog\nanalytics dashboard\ncredible news'}
            rows={3}
            className="genseer-input text-sm"
          />
        </div>
      </div>

      {/* Liquidity */}
      <div className="genseer-card p-6">
        <h2 className="font-bold mb-4" style={{ color: 'var(--text-main)' }}>Liquidity Rules</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-faint)' }}>
              Min Total Pool (units)
            </label>
            <input
              type="number"
              value={form.minimumTotalPool}
              onChange={(e) => setForm((f) => ({ ...f, minimumTotalPool: parseInt(e.target.value) || 100 }))}
              className="genseer-input text-sm"
              min="10"
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-faint)' }}>
              Min Opposing Ratio (bps)
            </label>
            <input
              type="number"
              value={form.minimumOpposingRatioBps}
              onChange={(e) => setForm((f) => ({ ...f, minimumOpposingRatioBps: parseInt(e.target.value) || 1000 }))}
              className="genseer-input text-sm"
              min="100"
              max="5000"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>1000 = 10%</p>
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-faint)' }}>
              Platform Fee (bps)
            </label>
            <input
              type="number"
              value={form.platformFeeBps}
              onChange={(e) => setForm((f) => ({ ...f, platformFeeBps: parseInt(e.target.value) || 500 }))}
              className="genseer-input text-sm"
              min="0"
              max="1000"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>500 = 5%</p>
          </div>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          {errors.map((err, i) => (
            <p key={i} className="text-sm" style={{ color: 'var(--danger-red)' }}>&bull; {err}</p>
          ))}
        </div>
      )}

      {!isConnected ? (
        <button type="button" onClick={connect} className="genseer-button w-full py-4 text-base">
          Connect Wallet to Create Market
        </button>
      ) : (
        <button type="submit" disabled={loading} className="genseer-button w-full py-4 text-base">
          {loading ? 'Creating Market on GenLayer...' : 'Create Market on GenLayer'}
        </button>
      )}
    </form>
  )
}
