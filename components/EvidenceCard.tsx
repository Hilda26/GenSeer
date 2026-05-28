import { EVIDENCE_SOURCE_TYPES } from '@/lib/utils/constants'
import { formatDateTime } from '@/lib/utils/formatting'
import type { EvidenceItem, Outcome } from '@/types'

interface Props {
  evidence: EvidenceItem
  outcomes: Outcome[]
  onChallenge: () => void
}

const STATUS_COLORS: Record<string, string> = {
  submitted: 'var(--electric-blue)',
  challenged: 'var(--warning-amber)',
  accepted: 'var(--signal-green)',
  rejected: 'var(--danger-red)',
}

export default function EvidenceCard({ evidence, outcomes, onChallenge }: Props) {
  const supportedOutcome = outcomes.find((o) => o.outcome_index === evidence.supports_outcome_index)
  const sourceTypeLabel = EVIDENCE_SOURCE_TYPES.find((t) => t.value === evidence.source_type)?.label || evidence.source_type
  const statusColor = STATUS_COLORS[evidence.status] || 'var(--text-muted)'
  const challengeCount = evidence.challenges?.length || 0

  return (
    <div className="genseer-card p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          {evidence.title && (
            <h4 className="font-bold text-sm mb-1" style={{ color: 'var(--text-main)' }}>{evidence.title}</h4>
          )}
          <a
            href={evidence.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs hover:underline truncate block"
            style={{ color: 'var(--electric-blue)', maxWidth: '300px' }}
          >
            {evidence.source_url}
          </a>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ background: `${statusColor}18`, color: statusColor }}
          >
            {evidence.status}
          </span>
        </div>
      </div>

      <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>{evidence.description}</p>

      <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--text-faint)' }}>
        <span className="px-2.5 py-1 rounded-full" style={{ background: 'var(--surface-soft)' }}>
          {sourceTypeLabel}
        </span>
        {supportedOutcome && (
          <span className="px-2.5 py-1 rounded-full" style={{ background: 'rgba(108, 92, 231, 0.1)', color: 'var(--primary-glow)' }}>
            Supports: {supportedOutcome.label}
          </span>
        )}
        {challengeCount > 0 && (
          <span className="px-2.5 py-1 rounded-full" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning-amber)' }}>
            {challengeCount} challenge{challengeCount > 1 ? 's' : ''}
          </span>
        )}
        <span>{formatDateTime(evidence.created_at)}</span>
      </div>

      <div className="flex justify-end mt-3">
        <button
          onClick={onChallenge}
          className="text-xs px-4 py-2 rounded-xl transition-all"
          style={{
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: 'var(--warning-amber)',
            background: 'rgba(245, 158, 11, 0.05)',
          }}
        >
          Challenge
        </button>
      </div>
    </div>
  )
}
