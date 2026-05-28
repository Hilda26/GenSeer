'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import EvidenceCard from '@/components/EvidenceCard'
import EvidenceSubmissionForm from '@/components/EvidenceSubmissionForm'
import EvidenceChallengePanel from '@/components/EvidenceChallengePanel'
import LoadingState from '@/components/LoadingState'
import EmptyState from '@/components/EmptyState'
import { useWallet } from '@/contexts/WalletContext'
import type { EvidenceItem, Outcome, Market } from '@/types'

export default function EvidencePage() {
  const { id } = useParams()
  const { address: walletAddress, isConnected, connect } = useWallet()
  const [market, setMarket] = useState<Market | null>(null)
  const [outcomes, setOutcomes] = useState<Outcome[]>([])
  const [evidence, setEvidence] = useState<EvidenceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [challengeTarget, setChallengeTarget] = useState<EvidenceItem | null>(null)

  useEffect(() => { if (id) fetchData() }, [id])

  async function fetchData() {
    try {
      setLoading(true)
      const [mRes, eRes] = await Promise.all([
        fetch(`/api/markets/${id}`),
        fetch(`/api/evidence?market_id=${id}`),
      ])
      if (mRes.ok) {
        const md = await mRes.json()
        setMarket(md.market)
        setOutcomes(md.outcomes || [])
      }
      if (eRes.ok) {
        const ed = await eRes.json()
        setEvidence(ed.evidence || [])
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="max-w-4xl mx-auto px-6 py-10"><LoadingState /></div>

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        <Link href="/markets">Markets</Link>
        <span>/</span>
        <Link href={`/markets/${id}`}>{market?.title?.slice(0, 30)}...</Link>
        <span>/</span>
        <span style={{ color: 'var(--text-faint)' }}>Evidence</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-main)' }}>Evidence</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Submit evidence and challenge misleading submissions
          </p>
        </div>
        <button
          onClick={() => setShowSubmitForm(!showSubmitForm)}
          className="genseer-button px-5 py-2.5 text-sm"
        >
          {showSubmitForm ? 'Cancel' : '+ Submit Evidence'}
        </button>
      </div>

      {showSubmitForm && market && (
        <div className="genseer-card p-6 mb-6">
          {isConnected && walletAddress ? (
            <EvidenceSubmissionForm
              marketId={market.id}
              outcomes={outcomes}
              walletAddress={walletAddress}
              onSuccess={() => { setShowSubmitForm(false); fetchData() }}
            />
          ) : (
            <div className="text-center py-6">
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Connect your wallet to submit evidence.</p>
              <button onClick={connect} className="genseer-button px-6 py-2.5 text-sm">Connect Wallet</button>
            </div>
          )}
        </div>
      )}

      {challengeTarget && (
        <div className="genseer-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold" style={{ color: 'var(--text-main)' }}>
              Challenge Evidence
            </h3>
            <button onClick={() => setChallengeTarget(null)} style={{ color: 'var(--text-muted)' }}>✕</button>
          </div>
          {isConnected && walletAddress ? (
            <EvidenceChallengePanel
              evidenceItem={challengeTarget}
              marketId={id as string}
              walletAddress={walletAddress}
              onSuccess={() => { setChallengeTarget(null); fetchData() }}
            />
          ) : (
            <div className="text-center py-4">
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Connect your wallet to challenge evidence.</p>
              <button onClick={connect} className="genseer-button px-6 py-2.5 text-sm">Connect Wallet</button>
            </div>
          )}
        </div>
      )}

      {evidence.length === 0 ? (
        <EmptyState
          title="No evidence submitted yet"
          description="Be the first to submit evidence for this market"
          action={
            <button onClick={() => setShowSubmitForm(true)} className="genseer-button px-6 py-2.5 text-sm">
              Submit Evidence
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {evidence.map((item) => (
            <EvidenceCard
              key={item.id}
              evidence={item}
              outcomes={outcomes}
              onChallenge={() => setChallengeTarget(item)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
