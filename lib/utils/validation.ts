export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validateMarketForm(data: {
  title: string
  description: string
  category: string
  outcomes: string[]
  closeAt: string
  evidenceEndsAt: string
  settlementAt: string
  settlementCriteria: string
  minimumTotalPool: number
}): ValidationResult {
  const errors: string[] = []

  if (!data.title?.trim()) errors.push('Title is required')
  if (data.title?.length > 200) errors.push('Title must be under 200 characters')
  if (!data.description?.trim()) errors.push('Description is required')
  if (!data.category) errors.push('Category is required')

  const validCategories = ['crypto_launch', 'creator_influence', 'community_sentiment']
  if (!validCategories.includes(data.category)) errors.push('Invalid category')

  const filteredOutcomes = data.outcomes?.filter((o) => o.trim())
  if (!filteredOutcomes || filteredOutcomes.length < 2) errors.push('At least 2 outcomes are required')
  if (filteredOutcomes?.some((o) => o.length > 100)) errors.push('Each outcome must be under 100 characters')

  const now = Date.now()
  const closeAt = new Date(data.closeAt).getTime()
  const evidenceEndsAt = new Date(data.evidenceEndsAt).getTime()
  const settlementAt = new Date(data.settlementAt).getTime()

  if (isNaN(closeAt) || closeAt <= now) errors.push('Close date must be in the future')
  if (isNaN(evidenceEndsAt) || evidenceEndsAt <= closeAt) errors.push('Evidence deadline must be after close date')
  if (isNaN(settlementAt) || settlementAt <= evidenceEndsAt) errors.push('Settlement date must be after evidence deadline')

  if (!data.settlementCriteria?.trim()) errors.push('Settlement criteria is required')
  if (data.settlementCriteria?.length < 20) errors.push('Settlement criteria must be at least 20 characters')

  if (!data.minimumTotalPool || data.minimumTotalPool < 10) errors.push('Minimum pool must be at least 10 units')

  return { valid: errors.length === 0, errors }
}

export function validateStakeInput(data: {
  amount: number
  outcomeIndex: number
  totalOutcomes: number
}): ValidationResult {
  const errors: string[] = []
  if (!data.amount || data.amount <= 0) errors.push('Stake amount must be greater than 0')
  if (data.amount > 1000000) errors.push('Stake amount exceeds maximum')
  if (data.outcomeIndex < 0 || data.outcomeIndex >= data.totalOutcomes) errors.push('Invalid outcome selection')
  return { valid: errors.length === 0, errors }
}

export function validateEvidenceSubmission(data: {
  sourceUrl: string
  sourceType: string
  description: string
  supportsOutcomeIndex: number | null
  totalOutcomes: number
}): ValidationResult {
  const errors: string[] = []
  if (!data.sourceUrl?.trim()) errors.push('Source URL is required')
  try {
    new URL(data.sourceUrl)
  } catch {
    errors.push('Source URL must be a valid URL')
  }
  if (!data.sourceType) errors.push('Source type is required')
  if (!data.description?.trim()) errors.push('Description is required')
  if (data.description?.length < 20) errors.push('Description must be at least 20 characters')
  if (data.supportsOutcomeIndex !== null) {
    if (data.supportsOutcomeIndex < 0 || data.supportsOutcomeIndex >= data.totalOutcomes) {
      errors.push('Invalid supported outcome')
    }
  }
  return { valid: errors.length === 0, errors }
}

export function validateEvidenceChallenge(data: {
  reason: string
  details: string
}): ValidationResult {
  const errors: string[] = []
  if (!data.reason) errors.push('Challenge reason is required')
  if (!data.details?.trim()) errors.push('Challenge details are required')
  if (data.details?.length < 10) errors.push('Challenge details must be at least 10 characters')
  return { valid: errors.length === 0, errors }
}

export function validateLiquidityPreview(data: {
  outcomePools: number[]
  minimumTotalPool: number
  minimumOpposingRatioBps: number
}): { valid: boolean; issues: string[] } {
  const issues: string[] = []
  const totalPool = data.outcomePools.reduce((a, b) => a + b, 0)
  if (totalPool < data.minimumTotalPool) {
    issues.push(`Total pool (${totalPool}) below minimum (${data.minimumTotalPool})`)
  }
  const funded = data.outcomePools.filter((p) => p > 0).length
  if (funded < 2) {
    issues.push('At least 2 outcomes must have stake')
  }
  const sorted = [...data.outcomePools].sort((a, b) => b - a)
  if (sorted.length >= 2 && totalPool > 0) {
    const secondRatio = Math.floor((sorted[1] * 10000) / totalPool)
    if (secondRatio < data.minimumOpposingRatioBps) {
      issues.push(`Opposing liquidity ratio too low (${(secondRatio / 100).toFixed(1)}% < ${(data.minimumOpposingRatioBps / 100).toFixed(1)}%)`)
    }
  }
  return { valid: issues.length === 0, issues }
}
