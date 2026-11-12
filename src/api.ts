import { CHARACTERS, enkaToRoster, type EnkaAvatar } from './enka'
import type { RosterCharacter } from './types'

export { CHARACTERS } from './enka'
export type { CharacterData } from './enka'

export type RosterErrorKind = 'private' | 'rate-limited' | 'network'

export class RosterError extends Error {
  kind: RosterErrorKind

  constructor(kind: RosterErrorKind) {
    super(kind)
    this.kind = kind
  }
}

// Enka serves character art for UI icon keys at /ui/<icon>.png.
export function iconUrl(character: { id: string }): string {
  const data = CHARACTERS[character.id]
  return data?.icon ? `https://enka.network/ui/${data.icon}.png` : ''
}

export async function getRoster(uid: string): Promise<RosterCharacter[]> {
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

  return enkaToRoster(avatars)
}
