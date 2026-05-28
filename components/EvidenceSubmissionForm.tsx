'use client'

import { useState } from 'react'
import { EVIDENCE_SOURCE_TYPES } from '@/lib/utils/constants'
import { validateEvidenceSubmission } from '@/lib/utils/validation'
import type { Outcome } from '@/types'

interface Props {
  marketId: string
  outcomes: Outcome[]
  walletAddress: string
  onSuccess: () => void
}

export default function EvidenceSubmissionForm({ marketId, outcomes, walletAddress, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [form, setForm] = useState({
    sourceUrl: '',
    sourceType: '',
    title: '',
    description: '',
    supportsOutcomeIndex: null as number | null,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validation = validateEvidenceSubmission({
      sourceUrl: form.sourceUrl,
      sourceType: form.sourceType,
      description: form.description,
      supportsOutcomeIndex: form.supportsOutcomeIndex,
      totalOutcomes: outcomes.length,
    })
    if (!validation.valid) { setErrors(validation.errors); return }
    setErrors([])
    try {
      setLoading(true)
      const res = await fetch('/api/evidence/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, market_id: marketId, wallet_address: walletAddress }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')
      onSuccess()
    } catch (err) {
      setErrors([(err as Error).message])
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-bold" style={{ color: 'var(--text-main)' }}>Submit Evidence</h3>

      <div>
        <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-faint)' }}>Source URL *</label>
        <input type="url" value={form.sourceUrl}
          onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))}
          placeholder="https://" className="genseer-input text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-faint)' }}>Source Type *</label>
          <select value={form.sourceType}
            onChange={(e) => setForm((f) => ({ ...f, sourceType: e.target.value }))}
            className="genseer-input text-sm">
            <option value="">Select type...</option>
            {EVIDENCE_SOURCE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-faint)' }}>Supports Outcome</label>
          <select
            value={form.supportsOutcomeIndex ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, supportsOutcomeIndex: e.target.value !== '' ? parseInt(e.target.value) : null }))}
            className="genseer-input text-sm">
            <option value="">None / General</option>
            {outcomes.map((o) => (
              <option key={o.id} value={o.outcome_index}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-faint)' }}>Title (optional)</label>
        <input type="text" value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Evidence title" className="genseer-input text-sm" />
      </div>

      <div>
        <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-faint)' }}>Why does this matter? *</label>
        <textarea value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Explain why this evidence is relevant and credible..."
          rows={3} className="genseer-input text-sm" />
      </div>

      {errors.length > 0 && (
        <div className="rounded-xl p-3" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-red)' }}>
          {errors.map((e, i) => <p key={i} className="text-xs">&bull; {e}</p>)}
        </div>
      )}

      <button type="submit" disabled={loading} className="genseer-button w-full py-3 text-sm">
        {loading ? 'Submitting...' : 'Submit Evidence'}
      </button>
    </form>
  )
}
