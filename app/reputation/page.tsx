'use client'

import { useState, useEffect } from 'react'
import LoadingState from '@/components/LoadingState'
import ReputationPanel from '@/components/ReputationPanel'
import { useWallet } from '@/contexts/WalletContext'
import type { User } from '@/types'

export default function ReputationPage() {
  const { address: walletAddress, isConnected, connect } = useWallet()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (walletAddress) fetchUser()
    else setLoading(false)
  }, [walletAddress])

  async function fetchUser() {
    try {
      setLoading(true)
      const res = await fetch(`/api/users/profile?wallet=${walletAddress}`)
      if (res.ok) { const d = await res.json(); setUser(d.user) }
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="max-w-3xl mx-auto px-6 py-10"><LoadingState /></div>

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-black" style={{ color: 'var(--text-main)' }}>Reputation</h1>
        <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
          Your track record as a predictor, evidence provider, challenger, and market creator.
        </p>
      </div>

      {!isConnected ? (
        <div className="genseer-card p-12 text-center">
          <div className="text-4xl mb-4">🔌</div>
          <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>Connect Your Wallet</h3>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            Connect your wallet to view your reputation score and history.
          </p>
          <button onClick={connect} className="genseer-button px-8 py-3">Connect Wallet</button>
        </div>
      ) : user ? (
        <ReputationPanel user={user} detailed />
      ) : (
        <div className="genseer-card p-12 text-center">
          <div className="text-4xl mb-4">🏆</div>
          <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>
            No Reputation Data Yet
          </h3>
          <p style={{ color: 'var(--text-muted)' }}>
            Participate in markets to build your reputation score.
          </p>
        </div>
      )}
    </div>
  )
}
