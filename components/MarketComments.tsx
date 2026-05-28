'use client'

import { useState, useEffect, useRef } from 'react'

interface Comment {
  id: string
  wallet_address: string
  username: string | null
  text: string
  created_at: string
}

interface Props {
  marketId: string
  walletAddress?: string | null
  isConnected: boolean
  onConnect: () => void
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

function shortWallet(w: string) {
  return `${w.slice(0, 6)}…${w.slice(-4)}`
}

export default function MarketComments({ marketId, walletAddress, isConnected, onConnect }: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchComments()
  }, [marketId])

  async function fetchComments() {
    try {
      const res = await fetch(`/api/comments?market_id=${marketId}`)
      if (res.ok) {
        const d = await res.json()
        setComments(d.comments || [])
      }
    } finally {
      setLoading(false)
    }
  }

  async function submitComment() {
    if (!text.trim() || !walletAddress) return
    setPosting(true)
    setPostError(null)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market_id: marketId, wallet_address: walletAddress, text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to post')
      setComments((prev) => [...prev, data.comment])
      setText('')
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (err) {
      setPostError((err as Error).message)
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="genseer-card p-6">
      <h2 className="font-bold mb-5" style={{ color: 'var(--text-main)' }}>
        💬 Discussion
        {comments.length > 0 && (
          <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-faint)' }}>
            {comments.length} comment{comments.length !== 1 ? 's' : ''}
          </span>
        )}
      </h2>

      {/* Comment list */}
      {loading ? (
        <p className="text-sm text-center py-6" style={{ color: 'var(--text-faint)' }}>Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: 'var(--text-faint)' }}>
          No comments yet. Be the first to weigh in.
        </p>
      ) : (
        <div className="space-y-4 mb-6 max-h-80 overflow-y-auto pr-1">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: 'rgba(108,92,231,0.2)', color: 'var(--primary-glow)' }}
              >
                {(c.username || c.wallet_address).slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
                    {c.username || shortWallet(c.wallet_address)}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
                    {timeAgo(c.created_at)}
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-muted)', wordBreak: 'break-word' }}>
                  {c.text}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      {isConnected && walletAddress ? (
        <div>
          {postError && (
            <p className="text-xs mb-2" style={{ color: 'var(--danger-red)' }}>{postError}</p>
          )}
          <div className="flex gap-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment() }
              }}
              placeholder="Add your take… (Enter to post)"
              rows={2}
              maxLength={500}
              className="genseer-input flex-1 text-sm resize-none"
              style={{ minHeight: 60 }}
            />
            <button
              onClick={submitComment}
              disabled={posting || !text.trim()}
              className="genseer-button px-4 self-end text-sm"
              style={{ opacity: posting || !text.trim() ? 0.5 : 1 }}
            >
              {posting ? '…' : 'Post'}
            </button>
          </div>
          <p className="text-xs mt-1 text-right" style={{ color: 'var(--text-faint)' }}>
            {text.length}/500
          </p>
        </div>
      ) : (
        <button
          onClick={onConnect}
          className="w-full py-3 rounded-xl text-sm font-medium transition-all"
          style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)' }}
        >
          Connect wallet to comment
        </button>
      )}
    </div>
  )
}
