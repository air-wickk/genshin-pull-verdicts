// The Enka.Network payload mapping, shared between the browser
// (src/api.ts) and the share-page edge functions (api/share/[uid].ts,
// api/share-og/[uid].ts): one place for the fight-prop IDs and the
// constellation trap.
import characterData from './data/characters.json'
import type { ElementName, RosterCharacter } from './types'

export interface CharacterData {
  name: string
  element: string
  icon?: string
  weaponType?: string
  /** 4 or 5, from Enka's quality flag; drives the constellation-weighted
   *  cover math (Prydwen rates 4-stars at C6, 5-stars at C0). */
  rarity?: 4 | 5
}

// Bundled from Enka.Network's data store via scripts/build-enka-data.mjs.
export const CHARACTERS = characterData as Record<string, CharacterData>

export interface EnkaAvatar {
  avatarId: number
  propMap?: Record<string, { val?: number }>
  /** Unlocked constellation talents, e.g. [241, 242] = Cyno at C2. */
  talentIdList?: number[]
}

// Enka's raw showcase → the roster shape the verdict engine speaks.
export function enkaToRoster(avatars: EnkaAvatar[]): RosterCharacter[] {
  return avatars.map((avatar) => {
    const data = CHARACTERS[String(avatar.avatarId)]
    return {
      id: String(avatar.avatarId),
      name: data?.name ?? String(avatar.avatarId),
      element: (data?.element ?? 'None') as ElementName,
      // propMap 4001 = level (Enka's fight-prop ID). Values arrive as
      // strings; the verdict engine compares them numerically.
      level: Number(avatar.propMap?.['4001']?.val ?? 1) || 1,
      // Constellations come from talentIdList, one entry per unlocked
      // constellation (empty list = C0). propMap 1002 is NOT constellation,
      // despite looking like it: it is the ascension phase, which tracks
      // level (A5 at Lv. 80) and once masqueraded as constellations here.
      constellation: Array.isArray(avatar.talentIdList)
        ? avatar.talentIdList.length
        : 0,
      rarity: data?.rarity,
    }
  })
}
