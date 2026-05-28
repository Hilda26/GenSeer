export interface User {
  id: string
  wallet_address: string
  username: string | null
  avatar_url: string | null
  reputation_score: number
  prediction_accuracy: number
  evidence_score: number
  challenge_score: number
  creator_score: number
  created_at: string
}

export interface Market {
  id: string
  genlayer_market_id: string | null
  creator_id: string | null
  title: string
  description: string
  category: string
  status: string
  close_at: string
  evidence_ends_at: string
  settlement_at: string
  settlement_criteria: string
  approved_sources: string[]
  minimum_total_pool: number
  minimum_opposing_ratio: number
  platform_fee_bps: number
  created_at: string
  updated_at: string
  creator?: User
  outcomes?: Outcome[]
}

export interface Outcome {
  id: string
  market_id: string
  outcome_index: number
  label: string
  description: string | null
  total_staked: number
}

export interface Stake {
  id: string
  market_id: string
  outcome_index: number
  user_id: string
  wallet_address: string
  amount: number
  genlayer_tx_hash: string | null
  created_at: string
  user?: User
}

export interface EvidenceItem {
  id: string
  market_id: string
  submitted_by: string | null
  source_url: string
  source_type: string
  title: string | null
  description: string
  supports_outcome_index: number | null
  status: string
  quality_score: number
  created_at: string
  submitter?: User
  challenges?: EvidenceChallenge[]
}

export interface EvidenceChallenge {
  id: string
  evidence_id: string
  market_id: string
  challenger_id: string | null
  reason: string
  details: string
  status: string
  created_at: string
  resolved_at: string | null
  challenger?: User
}

export interface Settlement {
  id: string
  market_id: string
  genlayer_settlement_id: string | null
  winning_outcome_index: number | null
  winning_outcome_label: string | null
  verdict: string
  confidence: number
  evidence_strength: string | null
  sentiment_analysis: string | null
  metrics_analysis: string | null
  sceptic_analysis: string | null
  context_analysis: string | null
  reasoning: string
  evidence_summary: string
  counterarguments: string | null
  refund_recommended: boolean
  genlayer_tx_hash: string | null
  created_at: string
}

export interface Claim {
  id: string
  market_id: string
  user_id: string
  wallet_address: string
  claim_type: 'payout' | 'refund'
  amount: number
  genlayer_tx_hash: string | null
  status: string
  created_at: string
}

export interface MarketActivity {
  id: string
  market_id: string
  user_id: string | null
  activity_type: string
  description: string
  metadata: Record<string, unknown>
  created_at: string
  user?: User
}

export interface SettlementPacket {
  market_id: string
  question: string
  category: string
  outcomes: Array<{
    index: number
    label: string
    total_staked: number
    implied_probability_pct: number
  }>
  settlement_criteria: string
  approved_sources: string[]
  evidence: EvidenceItem[]
  challenges: EvidenceChallenge[]
  pool_summary: {
    total_pool: number
    outcome_pools: number[]
    funded_outcomes: number
    platform_fee_bps: number
  }
  validity_notes: string[]
  prepared_at: string
}
