'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface Notification {
  id: string
  market_id: string | null
  type: string
  message: string
  read: boolean
  created_at: string
}

interface Props {
  wallet: string
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const TYPE_ICONS: Record<string, string> = {
  market_settled: '🏆',
  verdict_synced: '🔮',
  evidence_challenged: '⚔️',
  market_auto_closed: '🔒',
  default: '🔔',
}

export default function NotificationBell({ wallet }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchNotifications()
    // Poll every 30s
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [wallet])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function fetchNotifications() {
    try {
      const res = await fetch(`/api/notifications?wallet=${wallet}`)
      if (res.ok) {
        const d = await res.json()
        setNotifications(d.notifications || [])
        setUnread(d.unread || 0)
      }
    } catch {
      // silent
    }
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnread(0)
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet }),
    }).catch(() => {})
  }

  async function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
    setUnread((u) => Math.max(0, u - 1))
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet, id }),
    }).catch(() => {})
  }

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all"
        style={{
          background: open ? 'rgba(108,92,231,0.15)' : 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border)',
        }}
        title="Notifications"
      >
        <span className="text-base">🔔</span>
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: 'var(--primary)', color: 'white', fontSize: 10 }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 mt-2 w-80 rounded-2xl z-50 overflow-hidden"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
              Notifications
            </span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs"
                style={{ color: 'var(--primary-glow)' }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-sm" style={{ color: 'var(--text-faint)' }}>
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className="flex gap-3 px-4 py-3 cursor-pointer transition-all"
                  style={{
                    background: n.read ? 'transparent' : 'rgba(108,92,231,0.06)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span className="text-lg shrink-0 mt-0.5">
                    {TYPE_ICONS[n.type] || TYPE_ICONS.default}
                  </span>
                  <div className="flex-1 min-w-0">
                    {n.market_id ? (
                      <Link
                        href={`/markets/${n.market_id}`}
                        className="text-sm leading-snug hover:underline"
                        style={{ color: n.read ? 'var(--text-muted)' : 'var(--text-main)' }}
                        onClick={() => setOpen(false)}
                      >
                        {n.message}
                      </Link>
                    ) : (
                      <p
                        className="text-sm leading-snug"
                        style={{ color: n.read ? 'var(--text-muted)' : 'var(--text-main)' }}
                      >
                        {n.message}
                      </p>
                    )}
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                  {!n.read && (
                    <span
                      className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                      style={{ background: 'var(--primary)' }}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
