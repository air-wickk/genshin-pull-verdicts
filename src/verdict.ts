import type { Banner, Decision, RosterCharacter, Verdict } from './types'
import { getRoles } from './roles'
import { TOP_TIERS, WEAK_TIERS, bannerTier, getTier, tierRank } from './tiers'

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

export function verdict(roster: RosterCharacter[], banner: Banner): Verdict {
  const strong = roster.filter((character) => character.level >= STRONG_LEVEL)
  const covering = roster.filter((character) => covers(character, banner))

  // Rule 1: a strong character already covers the banner's element AND
  // main job? SKIP, and explain why a second copy adds nothing. One
  // consensus check first: if the banner unit is Apex while the built
  // cover is far below it (three rank steps, e.g. a T2 cover under a T0
  // banner), the honest verdict softens to "only if you love them".
  // The upgrade is real on paper, but replacing a built carry is a
  // luxury, never a need. Closer ranks keep the sidegrade SKIP, and an
  // unknown tier keeps it too: consensus never guesses.
  const strongCover = strong.find((character) => covers(character, banner))
  if (strongCover) {
    const consensus = bannerTier(banner)
    const coverTier = getTier(strongCover.name)
    if (
      consensus &&
      coverTier &&
      TOP_TIERS.includes(consensus) &&
      tierRank(coverTier) - tierRank(consensus) >= 3
    ) {
      return {
        decision: 'LOVE',
        reasons: [
          `${strongCover.name} already covers ${banner.element} ${banner.roleTags[0]} on your account (${investment(strongCover)}).`,
          `${banner.character} is consensus top-tier (Prydwen ${consensus}) while ${strongCover.name} sits at ${coverTier}, so the upgrade is real on paper. But replacing a built carry is a luxury, not a need: pull only if you love them.`,
        ],
      }
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

  // Rule 4: the account is covered on paper but the cover never got
  // built. An under-leveled character is a weak vote, so the honest
  // verdict is "only if you love them", said without judgment.
  const best = [...covering].sort((a, b) => b.level - a.level)[0]
  return {
    decision: 'LOVE',
    reasons: [
      `Your closest cover is ${best.name} (${investment(best)}), still under the Lv. ${STRONG_LEVEL} mark where a character starts paying off.`,
      `Leaving them unbuilt so far says the playstyle never clicked for you, and a new ${banner.element} ${banner.roleTags[0]} rarely fixes that. Pull if you love them, not for the meta.`,
    ],
  }
}
