export function formatAddress(address: string, chars = 6): string {
  if (!address) return ''
  return `${address.slice(0, chars)}...${address.slice(-4)}`
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTimeRemaining(dateString: string): string {
  const target = new Date(dateString).getTime()
  const now = Date.now()
  const diff = target - now
  if (diff <= 0) return 'Ended'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function formatCategoryLabel(category: string): string {
  const map: Record<string, string> = {
    crypto_launch: 'Crypto Launch',
    creator_influence: 'Creator Influence',
    community_sentiment: 'Community Sentiment',
  }
  return map[category] || category
}

export function formatStatusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: 'Draft',
    open: 'Open',
    closed: 'Closed',
    evidence_phase: 'Evidence Phase',
    settlement_pending: 'Settlement Pending',
    settled: 'Settled',
    invalid: 'Invalid',
    refunded: 'Refunded',
    cancelled: 'Cancelled',
    disputed: 'Disputed',
  }
  return map[status] || status
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}
