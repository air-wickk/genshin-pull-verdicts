import type { Banner, Verdict } from './types'

// Stage 4 replaces this banner with src/banners.json; stage 5 replaces the
// verdict with the real rules engine. Kept here only so the UI renders
// before those stages land.
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
