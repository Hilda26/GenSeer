export const MARKET_CATEGORIES = [
  { value: 'crypto_launch', label: 'Crypto Launches' },
  { value: 'creator_influence', label: 'Creator Influence' },
  { value: 'community_sentiment', label: 'Community Sentiment' },
] as const

export type MarketCategory = typeof MARKET_CATEGORIES[number]['value']

export const MARKET_STATUSES = [
  'draft',
  'open',
  'closed',
  'evidence_phase',
  'settlement_pending',
  'settled',
  'invalid',
  'refunded',
  'cancelled',
  'disputed',
] as const

export type MarketStatus = typeof MARKET_STATUSES[number]

export const EVIDENCE_CHALLENGE_REASONS = [
  { value: 'fake', label: 'Fake / Fabricated' },
  { value: 'irrelevant', label: 'Irrelevant to Market' },
  { value: 'duplicate', label: 'Duplicate Evidence' },
  { value: 'out_of_window', label: 'Outside Evidence Window' },
  { value: 'manipulated', label: 'Manipulated / Edited' },
  { value: 'bot_activity', label: 'Bot Activity' },
  { value: 'biased_source', label: 'Biased / Unreliable Source' },
  { value: 'unsupported', label: 'Claim Not Supported by Source' },
] as const

export const EVIDENCE_SOURCE_TYPES = [
  { value: 'official_announcement', label: 'Official Announcement' },
  { value: 'analytics_dashboard', label: 'Analytics Dashboard' },
  { value: 'news_article', label: 'News Article' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'github', label: 'GitHub / Code Repository' },
  { value: 'community_post', label: 'Community Post' },
  { value: 'video', label: 'Video / Stream' },
  { value: 'other', label: 'Other' },
] as const

export const MINIMUM_TOTAL_POOL = 100
export const MINIMUM_OPPOSING_RATIO_BPS = 1000
export const PLATFORM_FEE_BPS = 500

export const MARKET_TEMPLATES = {
  crypto_launch: {
    title: 'Did Project X launch create meaningful adoption?',
    outcomes: ['Strong adoption', 'Moderate adoption', 'Weak adoption', 'Failed launch'],
    settlementCriteria: 'Judge adoption based on usage metrics, integrations, credible community traction, and evidence quality. Discount hype and unverified claims.',
  },
  creator_influence: {
    title: 'Did Creator X significantly influence Project Y growth?',
    outcomes: ['Strong influence', 'Some influence', 'No clear influence', 'Manipulated / unclear'],
    settlementCriteria: 'Assess measurable impact: follower growth, engagement data, corroborating coverage, and credibility of evidence. Discount promotional material.',
  },
  community_sentiment: {
    title: 'Did community sentiment improve after the announcement?',
    outcomes: ['Mostly positive', 'Mixed', 'Mostly negative', 'Too early to judge'],
    settlementCriteria: 'Analyse sentiment across credible community channels and forums. Require multiple independent sources. Discount coordinated campaigns.',
  },
} as const
