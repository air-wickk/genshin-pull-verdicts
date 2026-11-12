export type ElementName =
  | 'Pyro'
  | 'Hydro'
  | 'Anemo'
  | 'Electro'
  | 'Dendro'
  | 'Cryo'
  | 'Geo'
  | 'None'

export interface RosterCharacter {
  id: string
  name: string
  element: ElementName
  level: number
  constellation: number
  /** 4 or 5 (Enka's quality flag). The engine uses it to weight a
   *  cover's consensus tier against its constellations: Prydwen rates
   *  4-stars at C6 and 5-stars at C0. Absent = 5-star basis, so the
   *  engine never discounts on a guess. */
  rarity?: 4 | 5
}

export interface Banner {
  character: string
  element: ElementName
  weaponType: string
  /** The poetic in-game banner title, e.g. "Myriad Patterns Unfold". */
  bannerName?: string
  roleTags: string[]
  /** Characters the banner character enables a strong team with. */
  pairings: string[]
  /** Optional hand override for the consensus rank (T0..T5, Prydwen).
   *  When absent, the generated snapshot src/data/tiers.json decides. */
  tier?: string
  /** Horizontal correction for the verdict-screen splash art, as a
   *  fraction of the displayed art width, positive = right. Splash art is
   *  auto-corrected by pixel analysis (src/artCenter.ts); this hand value
   *  is only needed for the rare art that defeats the analysis, such as
   *  one where translucent effects overlay the character or a companion
   *  creature shares the frame's opaque mass. */
  artShift?: number
  startDate: string
  endDate: string
}

export type Decision = 'PULL' | 'SKIP' | 'LOVE'

export interface Verdict {
  decision: Decision
  reasons: string[]
}

export type Screen = 'uid' | 'roster' | 'verdict'
