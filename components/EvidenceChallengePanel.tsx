'use client'

import { useState } from 'react'
import { EVIDENCE_CHALLENGE_REASONS } from '@/lib/utils/constants'
import { validateEvidenceChallenge } from '@/lib/utils/validation'
import type { EvidenceItem } from '@/types'

interface Props {
  evidenceItem: EvidenceItem
  marketId: string
  walletAddress: string
  onSuccess: () => void
}

export default function EvidenceChallengePanel({ evidenceItem, marketId, walletAddress, onSuccess }: Props) {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validation = validateEvidenceChallenge({ reason, details })
    if (!validation.valid) { setErrors(validation.errors); return }
    setErrors([])
    try {
      setLoading(true)
      const res = await fetch('/api/evidence/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidence_id: evidenceItem.id,
          market_id: marketId,
          wallet_address: walletAddress,
          reason,
          details,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Challenge failed')
      onSuccess()
    } catch (err) {
      setErrors([(err as Error).message])
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl p-3" style={{ background: 'var(--surface-soft)' }}>
        <div className="text-xs mb-1" style={{ color: 'var(--text-faint)' }}>Challenging evidence:</div>
        <div className="text-sm font-medium truncate" style={{ color: 'var(--text-muted)' }}>
          {evidenceItem.title || evidenceItem.source_url}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-faint)' }}>Challenge Reason *</label>
        <div className="grid grid-cols-2 gap-2">
          {EVIDENCE_CHALLENGE_REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setReason(r.value)}
              className="text-left px-3 py-2 rounded-xl text-xs transition-all"
              style={{
                background: reason === r.value ? 'rgba(245, 158, 11, 0.15)' : 'var(--surface-soft)',
                border: `1px solid ${reason === r.value ? 'rgba(245, 158, 11, 0.4)' : 'var(--border)'}`,
                color: reason === r.value ? 'var(--warning-amber)' : 'var(--text-muted)',
                fontWeight: reason === r.value ? '600' : '400',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-faint)' }}>
          Details *
        </label>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Explain why this evidence is invalid..."
          rows={3}
          className="genseer-input text-sm"
        />
      </div>

      {errors.length > 0 && (
        <div className="rounded-xl p-3" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-red)' }}>
          {errors.map((e, i) => <p key={i} className="text-xs">&bull; {e}</p>)}
        </div>
      )}

      <button type="submit" disabled={loading} className="genseer-button w-full py-3 text-sm"
              style={{ background: 'linear-gradient(135deg, var(--warning-amber), var(--danger-red))' }}>
        {loading ? 'Submitting...' : 'Submit Challenge'}
      </button>
    </form>
  )
}
