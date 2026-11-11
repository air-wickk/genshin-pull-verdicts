import type { Banner, RosterCharacter, Verdict } from './types'

// Mock data for stage 1. Stage 3 replaces the roster with real Enka.Network
// data; stage 4 replaces this banner with src/banners.json.
export const MOCK_ROSTER: RosterCharacter[] = [
  { name: 'Hu Tao', element: 'Pyro', level: 90, constellation: 1 },
  { name: 'Yelan', element: 'Hydro', level: 90, constellation: 0 },
  { name: 'Kazuha', element: 'Anemo', level: 90, constellation: 2 },
  { name: 'Raiden Shogun', element: 'Electro', level: 80, constellation: 0 },
  { name: 'Nahida', element: 'Dendro', level: 90, constellation: 0 },
  { name: 'Furina', element: 'Hydro', level: 90, constellation: 1 },
  { name: 'Zhongli', element: 'Geo', level: 80, constellation: 0 },
  { name: 'Ayaka', element: 'Cryo', level: 90, constellation: 0 },
]

export const MOCK_BANNER: Banner = {
  character: 'Arlecchino',
  element: 'Pyro',
  weaponType: 'Polearm',
  roleTags: ['on-field DPS'],
  startDate: '2026-10-28',
  endDate: '2026-11-18',
}

export const MOCK_VERDICT: Verdict = {
  decision: 'LOVE',
  reasons: [
    'Hu Tao already covers on-field Pyro DPS at level 90.',
    'Your account is covered for this element and role.',
  ],
}
