/**
 * UI-preview payout utilities.
 * These are for display purposes ONLY.
 * The GenLayer contract is the source of truth for all official calculations.
 */

export function calculatePoolProbability(outcomePool: number, totalPool: number): number {
  if (totalPool === 0) return 0
  return (outcomePool / totalPool) * 100
}

export function calculatePlatformFee(totalPool: number, platformFeeBps: number): number {
  return Math.floor((totalPool * platformFeeBps) / 10000)
}

export function calculateDistributablePool(totalPool: number, platformFeeBps: number): number {
  return totalPool - calculatePlatformFee(totalPool, platformFeeBps)
}

export function calculateUserPayoutPreview(
  userStakeInWinningPool: number,
  winningPool: number,
  totalPool: number,
  platformFeeBps: number = 500
): number {
  if (winningPool === 0) return 0
  const distributable = calculateDistributablePool(totalPool, platformFeeBps)
  return Math.floor((userStakeInWinningPool / winningPool) * distributable)
}

export function formatUnits(amount: number): string {
  return amount.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

export function formatProbability(probability: number): string {
  return `${probability.toFixed(1)}%`
}
