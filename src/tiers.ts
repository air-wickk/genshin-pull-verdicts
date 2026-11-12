import tierData from './data/tiers.json'

// Per-character consensus tiers, generated from Prydwen's Overall tier
// list by scripts/build-prydwen-tiers.mjs. Same philosophy as ROLES in
// roles.ts: characters without an entry have unknown tiers, and the
// engine declines to use consensus on their behalf rather than guess.
export const TIERS = tierData as Record<string, string>

// Prydwen's scale, strongest to weakest. "Apex Characters" (T0 and
// T0.5) and "Off-Meta Characters" (T3 to T5) are Prydwen's own glossary
// terms, so the grouping is theirs, not ours.
export const TIER_ORDER = ['T0', 'T0.5', 'T1', 'T1.5', 'T2', 'T3', 'T4', 'T5']
export const TOP_TIERS = ['T0', 'T0.5']
export const WEAK_TIERS = ['T3', 'T4', 'T5']

export function getTier(name: string): string | undefined {
  return TIERS[name]
}

export function tierRank(tier: string): number {
  return TIER_ORDER.indexOf(tier)
}

// The banner's consensus tier. The hand-set value in banners.json wins:
// it is checked at every banner update, even for a character too new to
// be in the latest snapshot. Otherwise the generated snapshot decides.
export function bannerTier(banner: {
  character: string
  tier?: string
}): string | undefined {
  return banner.tier ?? getTier(banner.character)
}
