import type { Banner, RosterCharacter, Verdict } from './types'
import { getRoles } from './roles'

// A "strong" character is one that has been meaningfully invested in.
// Tuned together with ROLES — this is the whole product, keep it readable.
export const STRONG_LEVEL = 70
export const PARTNER_LEVEL = 60

export function verdict(roster: RosterCharacter[], banner: Banner): Verdict {
  const strong = roster.filter((character) => character.level >= STRONG_LEVEL)

  // Rule 1: a strong character already covers the banner's element AND
  // main role? SKIP, and name that character.
  for (const character of strong) {
    const roles = getRoles(character.name)
    if (!roles) continue // unknown role: not confident enough to SKIP
    const covers = roles.some((role) => banner.roleTags.includes(role))
    if (character.element === banner.element && covers) {
      return {
        decision: 'SKIP',
        reasons: [
          `${character.name} already covers ${banner.element} ${banner.roleTags[0]} on your account (Lv. ${character.level}, C${character.constellation}).`,
        ],
      }
    }
  }

  // Rule 2: nobody covers the element and role at all? PULL, and name the gap.
  const covering = roster.filter(
    (character) =>
      character.element === banner.element &&
      getRoles(character.name)?.some((role) => banner.roleTags.includes(role)),
  )
  if (covering.length === 0) {
    return {
      decision: 'PULL',
      reasons: [
        `Nobody on your roster covers ${banner.element} ${banner.roleTags[0]} — ${banner.character} fills that gap.`,
      ],
    }
  }

  // Rule 3: the banner character enables a strong team with someone you
  // already own? PULL, and name the pairing.
  const partners = roster.filter(
    (character) =>
      banner.pairings.includes(character.name) && character.level >= PARTNER_LEVEL,
  )
  if (partners.length > 0) {
    return {
      decision: 'PULL',
      reasons: [
        `${banner.character} enables a strong team with ${partners[0].name}, who you already own (Lv. ${partners[0].level}).`,
      ],
    }
  }

  // Rule 4: otherwise the account is already covered — only pull for love.
  return {
    decision: 'LOVE',
    reasons: [
      `Your account is already covered for ${banner.element} ${banner.roleTags[0]} (${covering[0].name}, Lv. ${covering[0].level}).`,
    ],
  }
}
