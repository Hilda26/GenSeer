import type { User } from '@/types'

interface Props {
  user: User
  detailed?: boolean
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  const pct = Math.min(100, score)
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span className="font-bold text-sm" style={{ color }}>{score}</span>
      </div>
      <div className="w-full rounded-full h-2" style={{ background: 'rgba(148, 163, 184, 0.1)' }}>
        <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default function ReputationPanel({ user, detailed = false }: Props) {
  return (
    <div className="genseer-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-bold" style={{ color: 'var(--text-main)' }}>Reputation</h2>
        <div className="text-right">
          <div className="text-2xl font-black" style={{ color: 'var(--primary-glow)' }}>
            {user.reputation_score}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-faint)' }}>total score</div>
        </div>
      </div>

      <ScoreBar label="Prediction Accuracy" score={user.prediction_accuracy} color="var(--signal-green)" />
      <ScoreBar label="Evidence Quality" score={user.evidence_score} color="var(--electric-blue)" />
      <ScoreBar label="Challenge Score" score={user.challenge_score} color="var(--warning-amber)" />
      <ScoreBar label="Creator Score" score={user.creator_score} color="var(--primary-glow)" />

      {detailed && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="text-xs font-medium mb-3" style={{ color: 'var(--text-faint)' }}>
            Reputation components
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Correct predictions', value: 'Based on settled markets' },
              { label: 'Evidence accepted', value: 'Quality evidence submissions' },
              { label: 'Valid challenges', value: 'Successful evidence challenges' },
              { label: 'Good markets', value: 'Markets that settled normally' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl p-3" style={{ background: 'var(--surface-soft)' }}>
                <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-main)' }}>{item.label}</div>
                <div className="text-xs" style={{ color: 'var(--text-faint)' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
