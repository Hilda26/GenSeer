/**
 * GenLayer market contract wrappers — genlayer-js v1.1.7
 *
 * All write operations go through the server-side operator account.
 * All read operations are unauthenticated (no signer needed).
 */

import {
  genLayerReadContract,
  genLayerWriteContract,
  type GenLayerCallResult,
} from './client'

// ─── Input types ──────────────────────────────────────────────────────────────

export interface CreateMarketInput {
  marketId: string
  creatorAddress: string
  title: string
  category: string
  outcomes: string[]
  closeAt: number
  evidenceEndsAt: number
  settlementAt: number
  settlementCriteria: string
  approvedSources: string[]
  minimumTotalPool: number
  minimumOpposingRatioBps: number
  platformFeeBps: number
}

export interface StakeInput {
  marketId: string
  outcomeIndex: number
  amount: number
  senderAddress: string
}

export interface SettleMarketInput {
  marketId: string
  evidenceJson: string
  challengesJson: string
  poolSummaryJson: string
  senderAddress: string
}

// ─── Write helpers ────────────────────────────────────────────────────────────

export async function createMarketOnGenLayer(
  input: CreateMarketInput
): Promise<GenLayerCallResult> {
  // Contract expects outcomes and approvedSources as JSON strings (it calls json.loads internally)
  return genLayerWriteContract(input.creatorAddress, 'create_market', [
    input.marketId,
    input.creatorAddress,
    input.title,
    input.category,
    JSON.stringify(input.outcomes),
    input.closeAt,
    input.evidenceEndsAt,
    input.settlementAt,
    input.settlementCriteria,
    JSON.stringify(input.approvedSources),
    input.minimumTotalPool,
    input.minimumOpposingRatioBps,
    input.platformFeeBps,
  ])
}

export async function recordStakeOnGenLayer(
  input: StakeInput
): Promise<GenLayerCallResult> {
  return genLayerWriteContract(input.senderAddress, 'stake', [
    input.marketId,
    input.outcomeIndex,
    input.amount,
  ])
}

export async function closeMarketOnGenLayer(
  marketId: string,
  senderAddress: string
): Promise<GenLayerCallResult> {
  return genLayerWriteContract(senderAddress, 'close_market', [marketId])
}

export async function openEvidencePhaseOnGenLayer(
  marketId: string,
  senderAddress: string
): Promise<GenLayerCallResult> {
  return genLayerWriteContract(senderAddress, 'open_evidence_phase', [marketId])
}

export async function settleMarketOnGenLayer(
  input: SettleMarketInput
): Promise<GenLayerCallResult> {
  return genLayerWriteContract(input.senderAddress, 'settle_market', [
    input.marketId,
    input.evidenceJson,
    input.challengesJson,
    input.poolSummaryJson,
  ])
}

export async function claimPayoutOnGenLayer(
  marketId: string,
  senderAddress: string
): Promise<GenLayerCallResult> {
  return genLayerWriteContract(senderAddress, 'claim_payout', [marketId])
}

export async function claimRefundOnGenLayer(
  marketId: string,
  senderAddress: string
): Promise<GenLayerCallResult> {
  return genLayerWriteContract(senderAddress, 'claim_refund', [marketId])
}

export async function cancelMarketOnGenLayer(
  marketId: string,
  senderAddress: string
): Promise<GenLayerCallResult> {
  return genLayerWriteContract(senderAddress, 'cancel_market', [marketId])
}

// ─── Read helpers ─────────────────────────────────────────────────────────────

export async function getMarketFromGenLayer(marketId: string): Promise<unknown> {
  return genLayerReadContract('get_market', [marketId])
}

export async function getMarketStakesFromGenLayer(marketId: string): Promise<unknown> {
  return genLayerReadContract('get_market_stakes', [marketId])
}

export async function getUserMarketStakeFromGenLayer(
  marketId: string,
  userAddress: string
): Promise<unknown> {
  return genLayerReadContract('get_user_market_stake', [marketId, userAddress])
}

export async function getMarketSettlementFromGenLayer(marketId: string): Promise<unknown> {
  return genLayerReadContract('get_market_settlement', [marketId])
}

export async function getClaimStatusFromGenLayer(
  marketId: string,
  userAddress: string
): Promise<unknown> {
  return genLayerReadContract('get_claim_status', [marketId, userAddress])
}

export async function calculatePayoutFromGenLayer(
  marketId: string,
  userAddress: string
): Promise<unknown> {
  return genLayerReadContract('calculate_payout', [marketId, userAddress])
}

export async function calculateRefundFromGenLayer(
  marketId: string,
  userAddress: string
): Promise<unknown> {
  return genLayerReadContract('calculate_refund', [marketId, userAddress])
}
