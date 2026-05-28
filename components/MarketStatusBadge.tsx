const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: 'var(--text-faint)', bg: 'rgba(100, 116, 139, 0.15)' },
  open: { label: 'Open', color: 'var(--signal-green)', bg: 'rgba(34, 197, 94, 0.12)' },
  closed: { label: 'Closed', color: 'var(--text-muted)', bg: 'rgba(148, 163, 184, 0.1)' },
  evidence_phase: { label: 'Evidence Phase', color: 'var(--electric-blue)', bg: 'rgba(56, 189, 248, 0.12)' },
  settlement_pending: { label: 'Settling', color: 'var(--warning-amber)', bg: 'rgba(245, 158, 11, 0.12)' },
  settled: { label: 'Settled', color: 'var(--primary-glow)', bg: 'rgba(167, 139, 250, 0.12)' },
  invalid: { label: 'Invalid', color: 'var(--danger-red)', bg: 'rgba(239, 68, 68, 0.12)' },
  refunded: { label: 'Refunded', color: 'var(--warning-amber)', bg: 'rgba(245, 158, 11, 0.1)' },
  cancelled: { label: 'Cancelled', color: 'var(--text-faint)', bg: 'rgba(100, 116, 139, 0.1)' },
  disputed: { label: 'Disputed', color: 'var(--warning-amber)', bg: 'rgba(245, 158, 11, 0.15)' },
}

export default function MarketStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
      style={{ color: config.color, background: config.bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.color }} />
      {config.label}
    </span>
  )
}
