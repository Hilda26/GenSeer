'use client'

import { useState, useEffect } from 'react'
import ReputationPanel from '@/components/ReputationPanel'
import LoadingState from '@/components/LoadingState'
import { formatAddress, formatDateTime } from '@/lib/utils/formatting'
import { useWallet } from '@/contexts/WalletContext'
import type { User } from '@/types'

export default function ProfilePage() {
  const { address: walletAddress, isConnected, connect } = useWallet()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (walletAddress) fetchProfile()
    else setLoading(false)
  }, [walletAddress])

  async function fetchProfile() {
    try {
      setLoading(true)
      const res = await fetch(`/api/users/profile?wallet=${walletAddress}`)
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        setUsername(data.user?.username || '')
      }
    } finally {
      setLoading(false)
    }
  }

  async function saveUsername() {
    if (!username.trim() || !walletAddress) return
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: walletAddress, username: username.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setUser(data.user)
      setIsEditing(false)
    } catch (err) {
      setSaveError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="max-w-3xl mx-auto px-6 py-10"><LoadingState /></div>

  if (!isConnected || !walletAddress) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-black mb-8" style={{ color: 'var(--text-main)' }}>Profile</h1>
        <div className="genseer-card p-12 text-center">
          <div className="text-4xl mb-4">🔌</div>
          <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>Connect Your Wallet</h3>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            Connect your wallet to view your profile and activity.
          </p>
          <button onClick={connect} className="genseer-button px-8 py-3">Connect Wallet</button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-black mb-8" style={{ color: 'var(--text-main)' }}>Profile</h1>

      {/* Wallet */}
      <div className="genseer-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold" style={{ color: 'var(--text-main)' }}>Wallet</h2>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--signal-green)' }} />
            <span className="text-sm" style={{ color: 'var(--signal-green)' }}>Connected</span>
          </div>
        </div>
        <div className="font-mono text-sm px-4 py-3 rounded-xl"
             style={{ background: 'var(--surface-soft)', color: 'var(--text-muted)' }}>
          {walletAddress}
        </div>
      </div>

      {/* Identity */}
      <div className="genseer-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold" style={{ color: 'var(--text-main)' }}>Identity</h2>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-sm px-4 py-2 rounded-full"
            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
        </div>
        {isEditing ? (
          <div className="space-y-2">
            <div className="flex gap-3">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveUsername()}
                placeholder="Choose a username"
                className="genseer-input flex-1 text-sm"
                maxLength={32}
                disabled={saving}
              />
              <button
                onClick={saveUsername}
                disabled={saving || !username.trim()}
                className="genseer-button px-5 py-2 text-sm"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
            {saveError && (
              <p className="text-xs" style={{ color: 'var(--danger-red)' }}>{saveError}</p>
            )}
          </div>
        ) : (
          <div>
            <div className="text-lg font-bold mb-1" style={{ color: 'var(--text-main)' }}>
              {user?.username || formatAddress(walletAddress)}
            </div>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Member since {user ? formatDateTime(user.created_at) : 'N/A'}
            </div>
          </div>
        )}
      </div>

      {/* Reputation Summary */}
      {user && <ReputationPanel user={user} />}
    </div>
  )
}
