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
  /** Exact phase window, ISO with offset (the source publishes Asia server
   *  time, +08:00). When present these decide what is live; the plain dates
   *  above are for display only. Absent on older hand-written data, where
   *  startDate/endDate are treated as whole local days. */
  startsAt?: string
  endsAt?: string
}

export type Decision = 'PULL' | 'SKIP' | 'LOVE'

export interface Verdict {
  decision: Decision
  reasons: string[]
}

/** An announced character without a banner date yet. Curated by hand in
 *  src/upcoming.json, because no structured feed carries undated teases:
 *  the official notices only publish a phase once its dates are set, and
 *  the Enka data store does not list unreleased characters. Each entry is
 *  pruned by scripts/sync-banners.mjs as soon as the character gets a
 *  dated banner. */
export interface UpcomingBanner {
  character: string
  element?: ElementName
  weaponType?: string
  /** Game version the character is announced for, e.g. "7.3". */
  version?: string
  /** Free-form qualifier, e.g. "second half" when known. */
  note?: string
}

export type Screen = 'uid' | 'roster' | 'verdict'
