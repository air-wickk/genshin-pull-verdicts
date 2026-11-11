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
  roleTags: string[]
  /** Characters the banner character enables a strong team with. */
  pairings: string[]
  startDate: string
  endDate: string
}

export type Decision = 'PULL' | 'SKIP' | 'LOVE'

export interface Verdict {
  decision: Decision
  reasons: string[]
}

export type Screen = 'uid' | 'roster' | 'verdict'
