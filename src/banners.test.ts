import { describe, expect, it } from 'vitest'
import type { Banner, UpcomingBanner } from './types'
import { activeBanner, bannerDateLabel, bannerEnded, upcomingBanners } from './banners'

const banner = (overrides: Partial<Banner>): Banner => ({
  character: 'Test',
  element: 'Pyro',
  weaponType: 'Sword',
  roleTags: ['on-field DPS'],
  pairings: [],
  startDate: '2026-11-04',
  endDate: '2026-11-24',
  ...overrides,
})

const at = (iso: string) => Date.parse(iso)

// A phase change at 18:00 Asia server time (10:00 UTC), the pattern the
// UIGF watcher publishes: phase 1 ends 17:59, phase 2 starts 18:00.
const phase1 = banner({
  character: 'Mitya',
  startsAt: '2026-11-04T06:00:00+08:00',
  endsAt: '2026-11-24T17:59:00+08:00',
  startDate: '2026-11-04',
  endDate: '2026-11-24',
})
const phase2 = banner({
  character: 'Zibai',
  startsAt: '2026-11-24T18:00:00+08:00',
  endsAt: '2026-12-15T14:59:00+08:00',
  startDate: '2026-11-24',
  endDate: '2026-12-15',
})

describe('banner windows', () => {
  it('uses exact timestamps, not whole days, when present', () => {
    // Changeover day, before the switch moment: phase 1 is still live.
    expect(activeBanner([phase1, phase2], at('2026-11-24T09:59:00Z')).character).toBe('Mitya')
    // One minute later the new phase is live.
    expect(activeBanner([phase1, phase2], at('2026-11-24T10:00:00Z')).character).toBe('Zibai')
  })

  it('prefers the most recently started live banner on overlap', () => {
    const overlapping = [
      banner({ character: 'Old', startDate: '2026-11-04', endDate: '2026-11-24' }),
      banner({ character: 'New', startDate: '2026-11-24', endDate: '2026-12-15' }),
    ]
    expect(activeBanner(overlapping, at('2026-11-24T12:00:00Z')).character).toBe('New')
  })

  it('falls back to the next phase when nothing is live', () => {
    const future = banner({
      character: 'Future',
      startsAt: '2026-12-16T11:00:00+08:00',
      endsAt: '2027-01-05T18:00:00+08:00',
      startDate: '2026-12-16',
      endDate: '2027-01-05',
    })
    expect(activeBanner([phase1, phase2, future], at('2026-12-15T23:00:00+08:00')).character).toBe(
      'Future',
    )
  })

  it('falls back to the most recently ended banner, never the oldest', () => {
    expect(activeBanner([phase1, phase2], at('2026-12-20T00:00:00Z')).character).toBe('Zibai')
  })

  it('labels the phase window by date', () => {
    expect(bannerDateLabel(phase1, at('2026-11-20T00:00:00Z'))).toBe('ends Nov 24')
    expect(bannerDateLabel(phase2, at('2026-11-20T00:00:00Z'))).toBe('starts Nov 24')
    expect(bannerDateLabel(phase1, at('2026-11-24T12:00:00Z'))).toBe('ended Nov 24')
  })

  it('treats the published end time as the end, not the whole end date', () => {
    expect(bannerEnded(phase1, at('2026-11-24T09:59:00Z'))).toBe(false)
    expect(bannerEnded(phase1, at('2026-11-24T10:00:00Z'))).toBe(true)
  })

  it('keeps whole-day behavior for data without timestamps', () => {
    const legacy = banner({ startDate: '2026-11-24', endDate: '2026-11-24' })
    // Constructed in local time, since whole-day data is interpreted locally.
    expect(activeBanner([legacy], new Date(2026, 10, 24, 12).getTime()).character).toBe('Test')
  })
})

const upcoming = (overrides: Partial<UpcomingBanner>): UpcomingBanner => ({
  character: 'Test',
  ...overrides,
})

describe('upcoming characters', () => {
  it('drops characters that already have a dated banner', () => {
    const dated = [banner({ character: 'Zibai' })]
    const list = [upcoming({ character: 'Zibai' }), upcoming({ character: 'Anastasya' })]
    expect(upcomingBanners(dated, list).map((entry) => entry.character)).toEqual(['Anastasya'])
  })

  it('orders by game version numerically, then by name', () => {
    const list = [
      upcoming({ character: 'Later', version: '7.10' }),
      upcoming({ character: 'Zeta', version: '7.3' }),
      upcoming({ character: 'Alpha', version: '7.3' }),
      upcoming({ character: 'Sooner', version: '6.9' }),
    ]
    expect(upcomingBanners([], list).map((entry) => entry.character)).toEqual([
      'Sooner',
      'Alpha',
      'Zeta',
      'Later',
    ])
  })

  it('puts entries with no announced version last', () => {
    const list = [
      upcoming({ character: 'Unknown' }),
      upcoming({ character: 'Known', version: '7.3' }),
    ]
    expect(upcomingBanners([], list).map((entry) => entry.character)).toEqual([
      'Known',
      'Unknown',
    ])
  })

  it('returns nothing when every entry is already dated', () => {
    const dated = [banner({ character: 'Danica' })]
    expect(upcomingBanners(dated, [upcoming({ character: 'Danica' })])).toEqual([])
  })
})
