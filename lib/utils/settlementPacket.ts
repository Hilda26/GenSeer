export interface EvidenceItem {
  id: string
  source_url: string
  source_type: string
  title: string | null
  description: string
  supports_outcome_index: number | null
  status: string
  quality_score: number
  created_at: string
  submitted_by_wallet?: string
}

export interface ChallengeItem {
  id: string
  evidence_id: string
  reason: string
  details: string
  status: string
  created_at: string
  challenger_wallet?: string
}

export interface OutcomeSummary {
  index: number
  label: string
  total_staked: number
  implied_probability_pct: number
}

export interface SettlementPacket {
  market_id: string
  question: string
  category: string
  outcomes: OutcomeSummary[]
  settlement_criteria: string
  approved_sources: string[]
  evidence: EvidenceItem[]
  challenges: ChallengeItem[]
  pool_summary: {
    total_pool: number
    outcome_pools: number[]
    funded_outcomes: number
    platform_fee_bps: number
  }
  validity_notes: string[]
  prepared_at: string
}

export function buildSettlementPacket({
  market,
  outcomes,
  evidence,
  challenges,
  poolSummary,
}: {
  market: {
    id: string
    genlayer_market_id: string | null
    title: string
    category: string
    settlement_criteria: string
    approved_sources: string[]
    minimum_total_pool: number
    minimum_opposing_ratio: number
  }
  outcomes: Array<{ outcome_index: number; label: string; total_staked: number }>
  evidence: EvidenceItem[]
  challenges: ChallengeItem[]
  poolSummary: {
    total_pool: number
    outcome_pools: number[]
    funded_outcomes: number
    platform_fee_bps: number
  }
}): SettlementPacket {
  const validityNotes: string[] = []

  if (poolSummary.total_pool < market.minimum_total_pool) {
    validityNotes.push(`Total pool (${poolSummary.total_pool}) below minimum (${market.minimum_total_pool})`)
  }

  if (poolSummary.funded_outcomes < 2) {
    validityNotes.push('Fewer than 2 outcomes have stake — market may be invalid')
  }

  const sortedPools = [...poolSummary.outcome_pools].sort((a, b) => b - a)
  if (sortedPools.length >= 2 && poolSummary.total_pool > 0) {
    const secondRatio = sortedPools[1] / poolSummary.total_pool
    if (secondRatio < market.minimum_opposing_ratio) {
      validityNotes.push(`Opposing liquidity ratio (${(secondRatio * 100).toFixed(1)}%) below minimum (${(market.minimum_opposing_ratio * 100).toFixed(1)}%)`)
    }
  }

  const challengedIds = new Set(challenges.map((c) => c.evidence_id))
  const unchallengedEvidence = evidence.filter((e) => !challengedIds.has(e.id))
  if (unchallengedEvidence.length === 0 && evidence.length > 0) {
    validityNotes.push('All submitted evidence has been challenged')
  }

  const outcomeSummaries: OutcomeSummary[] = outcomes.map((o) => ({
    index: o.outcome_index,
    label: o.label,
    total_staked: o.total_staked,
    implied_probability_pct:
      poolSummary.total_pool > 0
        ? Math.round((o.total_staked / poolSummary.total_pool) * 100)
        : 0,
  }))

  return {
    market_id: market.genlayer_market_id || market.id,
    question: market.title,
    category: market.category,
    outcomes: outcomeSummaries,
    settlement_criteria: market.settlement_criteria,
    approved_sources: market.approved_sources,
    evidence,
    challenges,
    pool_summary: poolSummary,
    validity_notes: validityNotes,
    prepared_at: new Date().toISOString(),
  }
}
