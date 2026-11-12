import characterData from './data/characters.json'

export interface CharacterData {
  name: string
  element: string
  icon?: string
  weaponType?: string
}

// Bundled from Enka.Network's data store via scripts/build-enka-data.mjs.
export const CHARACTERS = characterData as Record<string, CharacterData>

export type RosterErrorKind = 'private' | 'rate-limited' | 'network'

export class RosterError extends Error {
  kind: RosterErrorKind

  constructor(kind: RosterErrorKind) {
    super(kind)
    this.kind = kind
  }
}

interface EnkaAvatar {
  avatarId: number
  propMap?: Record<string, { val?: number }>
  /** Unlocked constellation talents, e.g. [241, 242] = Cyno at C2. */
  talentIdList?: number[]
}

// Enka serves character art for UI icon keys at /ui/<icon>.png.
export function iconUrl(character: { id: string }): string {
  const data = CHARACTERS[character.id]
  return data?.icon ? `https://enka.network/ui/${data.icon}.png` : ''
}

export async function getRoster(uid: string): Promise<
  Array<{ id: string; level: number; constellation: number }>
> {
  let response: Response
  try {
    response = await fetch(`/api/uid/${uid}`)
  } catch {
    throw new RosterError('network')
  }

  // Enka's own status codes, passed through the proxy:
  // 404 = showcase private or empty, 429 = rate limited.
  if (response.status === 404) throw new RosterError('private')
  if (response.status === 429) throw new RosterError('rate-limited')
  if (!response.ok) throw new RosterError('network')

  let payload: { avatarInfoList?: EnkaAvatar[] }
  try {
    payload = (await response.json()) as { avatarInfoList?: EnkaAvatar[] }
  } catch {
    throw new RosterError('network')
  }

  const avatars = payload.avatarInfoList
  if (!Array.isArray(avatars) || avatars.length === 0) {
    throw new RosterError('private')
  }

  return avatars.map((avatar) => ({
    id: String(avatar.avatarId),
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
  }))
}
