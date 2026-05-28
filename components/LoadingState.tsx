export default function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div
        className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mb-4"
        style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}
      />
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{message}</p>
    </div>
  )
}
