import type { Settlement, Outcome } from '@/types'

interface Props {
  settlement: Settlement
  outcomes: Outcome[]
}

const VERDICT_CONFIG = {
  settled: { color: 'var(--signal-green)', bg: 'rgba(34, 197, 94, 0.1)', label: 'Settled' },
  inconclusive: { color: 'var(--warning-amber)', bg: 'rgba(245, 158, 11, 0.1)', label: 'Inconclusive' },
  invalid: { color: 'var(--danger-red)', bg: 'rgba(239, 68, 68, 0.1)', label: 'Invalid' },
}

const STRENGTH_CONFIG = {
  strong: { color: 'var(--signal-green)' },
  moderate: { color: 'var(--electric-blue)' },
  weak: { color: 'var(--warning-amber)' },
  insufficient: { color: 'var(--danger-red)' },
}

export default function SettlementVerdictCard({ settlement, outcomes: _outcomes }: Props) {
  const verdictConfig = VERDICT_CONFIG[settlement.verdict as keyof typeof VERDICT_CONFIG] || VERDICT_CONFIG.inconclusive
  const strengthConfig = settlement.evidence_strength
    ? STRENGTH_CONFIG[settlement.evidence_strength as keyof typeof STRENGTH_CONFIG]
    : { color: 'var(--text-muted)' }

  return (
    <div className="space-y-4">
      {/* Verdict Banner */}
      <div
        className="rounded-2xl p-6 flex items-center gap-4"
        style={{ background: verdictConfig.bg, border: `1px solid ${verdictConfig.color}30` }}
      >
        <div>
          <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-faint)' }}>GenLayer Verdict</div>
          <div className="text-2xl font-black" style={{ color: verdictConfig.color }}>
            {verdictConfig.label}
          </div>
          {settlement.winning_outcome_label && (
            <div className="mt-1 font-medium" style={{ color: 'var(--text-main)' }}>
              Winner: {settlement.winning_outcome_label}
            </div>
          )}
          {settlement.refund_recommended && (
            <div className="mt-1 text-sm" style={{ color: 'var(--warning-amber)' }}>
              Refund recommended
            </div>
          )}
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs" style={{ color: 'var(--text-faint)' }}>Confidence</div>
          <div className="text-2xl font-black" style={{ color: 'var(--text-main)' }}>
            {settlement.confidence}%
          </div>
        </div>
      </div>

      {/* Evidence Strength */}
      {settlement.evidence_strength && (
        <div className="genseer-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Evidence Strength</span>
            <span className="font-bold capitalize" style={{ color: strengthConfig.color }}>
              {settlement.evidence_strength}
            </span>
          </div>
        </div>
      )}

      {/* Analysis Panels */}
      {[
        { label: 'Sentiment Analysis', value: settlement.sentiment_analysis },
        { label: 'Metrics Analysis', value: settlement.metrics_analysis },
        { label: 'Sceptic Analysis', value: settlement.sceptic_analysis },
        { label: 'Context Analysis', value: settlement.context_analysis },
      ].filter((item) => item.value).map((item) => (
        <div key={item.label} className="genseer-card p-5">
          <div className="text-xs font-bold mb-2" style={{ color: 'var(--text-faint)' }}>{item.label}</div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{item.value}</p>
        </div>
      ))}

      {/* Reasoning */}
      <div className="genseer-card p-5">
        <div className="text-xs font-bold mb-2" style={{ color: 'var(--primary-glow)' }}>GenLayer Reasoning</div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{settlement.reasoning}</p>
      </div>

      {/* Evidence Summary */}
      <div className="genseer-card p-5">
        <div className="text-xs font-bold mb-2" style={{ color: 'var(--text-faint)' }}>Evidence Summary</div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{settlement.evidence_summary}</p>
      </div>

      {/* Counterarguments */}
      {settlement.counterarguments && (
        <div className="genseer-card p-5">
          <div className="text-xs font-bold mb-2" style={{ color: 'var(--warning-amber)' }}>Counterarguments</div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{settlement.counterarguments}</p>
        </div>
      )}
    </div>
  )
}
