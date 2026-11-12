import type { Banner, Decision, RosterCharacter, Verdict } from './types'
import { getRoles } from './roles'
import {
  TIER_ORDER,
  TOP_TIERS,
  WEAK_TIERS,
  bannerTier,
  getTier,
  tierRank,
} from './tiers'

// A "strong" character is one that has been meaningfully invested in.
// Tuned together with ROLES: this is the whole product, keep it readable.
export const STRONG_LEVEL = 70
export const PARTNER_LEVEL = 60

// A character "covers" the banner when they share its element AND at least
// one of its jobs. Role knowledge comes from ROLES; unknown roles are
// treated as no coverage, never as a guess.
function covers(
  character: RosterCharacter,
  banner: Banner,
): boolean {
  const roles = getRoles(character.name)
  if (!roles) return false
  return (
    character.element === banner.element &&
    roles.some((role) => banner.roleTags.includes(role))
  )
}

function investment(character: RosterCharacter): string {
  return `Lv. ${character.level}, C${character.constellation}`
}

// How good a cover actually is, in rank steps: see ratedRank. This one
// renders the discount as a sentence for the reasons text, and returns
// null when there is nothing to say (a 5-star, a fully built 4-star, or
// an unknown tier).
function ratingNote(character: RosterCharacter): string | null {
  if (character.rarity !== 4 || character.constellation >= 6) return null
  const tier = getTier(character.name)
  const rank = ratedRank(character)
  if (!tier || rank === undefined) return null
  return `Prydwen rates them ${tier} at C6 (4-stars are rated fully constellated); at C${character.constellation} they play at best like ${rankName(rank)}.`
}

// The character's Prydwen tier as a rank index, discounted for missing
// constellations against the rating basis (4-stars are rated at C6,
// 5-stars at C0), floored at T5. Unknown tier returns undefined:
// consensus never guesses.
function ratedRank(character: RosterCharacter): number | undefined {
  const tier = getTier(character.name)
  if (!tier) return undefined
  const basis = character.rarity === 4 ? 6 : 0
  const missing = Math.max(basis - character.constellation, 0)
  return Math.min(tierRank(tier) + missing, tierRank('T5'))
}

function rankName(rank: number): string {
  return TIER_ORDER[Math.min(Math.max(rank, 0), TIER_ORDER.length - 1)]
}

export function verdict(roster: RosterCharacter[], banner: Banner): Verdict {
  const strong = roster.filter((character) => character.level >= STRONG_LEVEL)
  const covering = roster.filter((character) => covers(character, banner))

  // Rule 1: a strong character already covers the banner's element AND
  // main job? SKIP, and explain why a second copy adds nothing. One
  // consensus check first: if the banner unit is Apex while the built
  // cover is far below it (three rank steps, e.g. a T2 cover under a T0
  // banner), the honest verdict softens to "only if you love them".
  // The cover's rank is weighted by constellation first: Prydwen rates
  // 4-stars at C6, so a C0 4-star cover plays a tier below its rating.
  // The upgrade is real on paper, but replacing a built carry is a
  // luxury, never a need. Closer ranks keep the sidegrade SKIP, and an
  // unknown tier keeps it too: consensus never guesses.
  const strongCover = strong.find((character) => covers(character, banner))
  if (strongCover) {
    const consensus = bannerTier(banner)
    const coverRank = ratedRank(strongCover)
    if (
      consensus &&
      coverRank !== undefined &&
      TOP_TIERS.includes(consensus) &&
      coverRank - tierRank(consensus) >= 3
    ) {
      const reasons = [
        `${strongCover.name} already covers ${banner.element} ${banner.roleTags[0]} on your account (${investment(strongCover)}).`,
      ]
      const note = ratingNote(strongCover)
      if (note) reasons.push(note)
      reasons.push(
        `${banner.character} is consensus top-tier (Prydwen ${consensus}) while ${strongCover.name} sits at ${rankName(coverRank)} on your account, so the upgrade is real on paper. But replacing a built carry is a luxury, not a need: pull only if you love them.`,
      )
      return { decision: 'LOVE', reasons }
    }
    const dupe =
      strongCover.constellation >= 3
        ? `They are heavily invested (C${strongCover.constellation}), so another copy of the same job adds almost nothing.`
        : 'A second character with the same element and job is a sidegrade, not an upgrade.'
    return {
      decision: 'SKIP',
      reasons: [
        `${strongCover.name} already covers ${banner.element} ${banner.roleTags[0]} on your account (${investment(strongCover)}).`,
        dupe,
      ],
    }
  }

  // Rule 2: nobody covers the element and job at all? PULL, and name the
  // gap precisely: same element with the wrong job still counts as a gap.
  if (covering.length === 0) {
    const elementMates = roster.filter(
      (character) => character.element === banner.element,
    )
    const partial =
      elementMates.length === 0
        ? `You own zero ${banner.element} characters.`
        : `You own ${elementMates.length} ${banner.element} ${elementMates.length === 1 ? 'character' : 'characters'}, but none with the ${banner.roleTags[0]} job.`
    const reasons = [
      `Nobody on your roster covers ${banner.element} ${banner.roleTags[0]} yet. ${banner.character} fills that gap.`,
      partial,
    ]
    const young = strong.length <= 2
    if (young) {
      reasons.push(
        `Your roster is still young (${strong.length} invested ${strong.length === 1 ? 'character' : 'characters'}), and a limited 5-star carries an early account further than a mature one.`,
      )
    }

    // Consensus modifier, the one place an outside opinion enters the
    // engine: a gap says PULL, but paying limited currency for a unit
    // the community rates weak is not advice, it's a trap. Downgrade to
    // "only if you love them" and say both facts. A top-ranked unit
    // filling a real gap is the opposite: say so, and reinforce.
    const consensus = bannerTier(banner)
    let decision: Decision = 'PULL'
    if (consensus && WEAK_TIERS.includes(consensus)) {
      reasons.push(
        `Fair warning: consensus ranks ${banner.character} low (Prydwen tier ${consensus}), so filling the gap means paying for a weak unit. Only if you love them.`,
      )
      decision = 'LOVE'
    } else if (consensus && TOP_TIERS.includes(consensus)) {
      reasons.push(
        `Consensus also ranks ${banner.character} at the top (Prydwen tier ${consensus}), so this is a strong unit filling a real gap.`,
      )
    }
    return { decision, reasons }
  }

  // Rule 3: the banner character enables a strong team with someone you
  // already own? PULL, and explain why the pairing pays both ways.
  const partners = roster.filter(
    (character) =>
      banner.pairings.includes(character.name) && character.level >= PARTNER_LEVEL,
  )
  if (partners.length > 0) {
    const partner = partners[0]
    return {
      decision: 'PULL',
      reasons: [
        `${banner.character} enables a strong team with ${partner.name}, who you already own (${investment(partner)}).`,
        'Their kits are built around each other, so both characters get better together than either is alone.',
      ],
    }
  }

  // Rule 4: the account is covered on paper, but the closest cover never
  // got built. An unbuilt cover is a weak vote, so it holds the verdict
  // at "only if you love them" only when building it would actually
  // answer the job. A cover that ranks well below the Apex banner once
  // its constellations are weighted (Prydwen rates 4-stars at C6) is a
  // straw cover: the honest verdict is the gap PULL, with the math said
  // out loud.
  const best = [...covering].sort((a, b) => b.level - a.level)[0]
  const consensus = bannerTier(banner)
  const bestRank = ratedRank(best)
  if (
    consensus &&
    bestRank !== undefined &&
    TOP_TIERS.includes(consensus) &&
    bestRank - tierRank(consensus) >= 3
  ) {
    const reasons = [
      `Your closest cover is ${best.name} (${investment(best)}), still under the Lv. ${STRONG_LEVEL} mark where a character starts paying off.`,
    ]
    const note = ratingNote(best)
    if (note) {
      reasons.push(note)
    } else {
      reasons.push(
        `They rate ${rankName(bestRank)} on Prydwen, well under ${banner.character} (Prydwen ${consensus}), so an unbuilt ${best.name} is not a real answer to the job.`,
      )
    }
    reasons.push(
      `${banner.character} is consensus top-tier (Prydwen ${consensus}) and the gap is real, so this pull is a recommendation, not a luxury.`,
    )
    return { decision: 'PULL', reasons }
  }

  // The cover is either close in rank to the banner or consensus for it
  // is unknown: "build what you own" stays the honest call, and when the
  // unbuilt cover is itself top-tier, say that plainly.
  const reasons = [
    `Your closest cover is ${best.name} (${investment(best)}), still under the Lv. ${STRONG_LEVEL} mark where a character starts paying off.`,
  ]
  if (bestRank !== undefined && TOP_TIERS.includes(rankName(bestRank))) {
    reasons.push(
      `You already own a consensus top-tier answer to this job (Prydwen ${getTier(best.name)}); building them likely beats buying a new one.`,
    )
  } else {
    reasons.push(
      `Leaving them unbuilt so far says the playstyle never clicked for you, and a new ${banner.element} ${banner.roleTags[0]} rarely fixes that. Pull if you love them, not for the meta.`,
    )
  }
  return { decision: 'LOVE', reasons }
}
