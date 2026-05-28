interface Props {
  title: string
  description?: string
  action?: React.ReactNode
}

export default function EmptyState({ title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mb-4"
        style={{ background: 'var(--surface-raised)' }}
      >
        🔮
      </div>
      <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>{title}</h3>
      {description && (
        <p className="text-sm max-w-sm mb-6" style={{ color: 'var(--text-muted)' }}>{description}</p>
      )}
      {action}
    </div>
  )
}
