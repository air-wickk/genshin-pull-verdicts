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
  /** Consensus rank from Prydwen's tier list (T0..T4), hand-updated with
   *  the rest of the banner data. Optional: absent means no consensus
   *  modifier is applied. */
  tier?: string
  startDate: string
  endDate: string
}

export type Decision = 'PULL' | 'SKIP' | 'LOVE'

export interface Verdict {
  decision: Decision
  reasons: string[]
}

export type Screen = 'uid' | 'roster' | 'verdict'
