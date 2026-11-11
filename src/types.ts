export type ElementName =
  | 'Pyro'
  | 'Hydro'
  | 'Anemo'
  | 'Electro'
  | 'Dendro'
  | 'Cryo'
  | 'Geo'

export interface RosterCharacter {
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
  startDate: string
  endDate: string
}

export type Decision = 'PULL' | 'SKIP' | 'LOVE'

export interface Verdict {
  decision: Decision
  reasons: string[]
}

export type Screen = 'uid' | 'roster' | 'verdict'
