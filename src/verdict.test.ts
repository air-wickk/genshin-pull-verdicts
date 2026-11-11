import { describe, expect, it } from 'vitest'
import type { Banner, RosterCharacter } from './types'
import { verdict } from './verdict'

const banner: Banner = {
  character: 'Arlecchino',
  element: 'Pyro',
  weaponType: 'Polearm',
  roleTags: ['on-field DPS'],
  pairings: ['Yelan', 'Xingqiu', 'Kazuha', 'Zhongli', 'Bennett'],
  startDate: '2026-10-28',
  endDate: '2026-11-18',
}

const character = (overrides: Partial<RosterCharacter>): RosterCharacter => ({
  id: 'test',
  name: 'Test',
  element: 'Pyro',
  level: 90,
  constellation: 0,
  ...overrides,
})

describe('verdict', () => {
  it('Rule 1: SKIP and name the strong same-element, same-role carry', () => {
    const roster = [character({ name: 'Hu Tao', element: 'Pyro', level: 90 })]
    const result = verdict(roster, banner)
    expect(result.decision).toBe('SKIP')
    expect(result.reasons[0]).toContain('Hu Tao')
  })

  it('Rule 1: an invested cover is called out as such', () => {
    const roster = [
      character({ name: 'Hu Tao', element: 'Pyro', level: 90, constellation: 6 }),
    ]
    const result = verdict(roster, banner)
    expect(result.decision).toBe('SKIP')
    expect(result.reasons[1]).toContain('heavily invested')
  })

  it('Rule 1: a bare cover is called a sidegrade', () => {
    const roster = [
      character({ name: 'Hu Tao', element: 'Pyro', level: 80, constellation: 0 }),
    ]
    const result = verdict(roster, banner)
    expect(result.decision).toBe('SKIP')
    expect(result.reasons[1]).toContain('sidegrade')
  })

  it("Rule 1: not confident enough to SKIP when the carry's role is unknown", () => {
    // A strong same-element character with no roles entry must not trigger SKIP.
    const roster = [character({ name: 'Completely Unknown', element: 'Pyro', level: 90 })]
    expect(verdict(roster, banner).decision).not.toBe('SKIP')
  })

  it('Rule 1: does not SKIP on a weak same-element character', () => {
    const roster = [character({ name: 'Hu Tao', element: 'Pyro', level: 40 })]
    expect(verdict(roster, banner).decision).not.toBe('SKIP')
  })

  it('Rule 2: PULL and name the gap when nobody covers element + role', () => {
    const roster = [
      character({ name: 'Furina', element: 'Hydro', level: 90 }),
      character({ name: 'Nahida', element: 'Dendro', level: 90 }),
    ]
    const result = verdict(roster, banner)
    expect(result.decision).toBe('PULL')
    expect(result.reasons[0]).toContain('gap')
  })

  it('Rule 2: a young account gets the early-roster reason too', () => {
    const roster = [character({ name: 'Unknown', element: 'Hydro', level: 90 })]
    const result = verdict(roster, banner)
    expect(result.decision).toBe('PULL')
    expect(result.reasons.some((reason) => reason.includes('still young'))).toBe(true)
  })

  it('Rule 2: same element but the wrong job is still a named gap', () => {
    // Xiangling is Pyro but off-field: partial coverage, not a cover.
    const roster = [character({ name: 'Xiangling', element: 'Pyro', level: 90 })]
    const result = verdict(roster, banner)
    expect(result.decision).toBe('PULL')
    expect(result.reasons[1]).toContain('1 Pyro character, but none with the on-field DPS job')
  })

  it('Rule 2: zero same-element characters is stated plainly', () => {
    const roster = [character({ name: 'Furina', element: 'Hydro', level: 90 })]
    const result = verdict(roster, banner)
    expect(result.reasons[1]).toContain('zero Pyro characters')
  })

  it('Rule 3: PULL and name the pairing when a banner partner is owned', () => {
    // Diluc covers Pyro on-field but is below the "strong" threshold, so
    // Rule 1 and Rule 2 pass through; owned Yelan tips it to PULL.
    const roster = [
      character({ name: 'Diluc', element: 'Pyro', level: 60 }),
      character({ name: 'Yelan', element: 'Hydro', level: 80 }),
    ]
    const result = verdict(roster, banner)
    expect(result.decision).toBe('PULL')
    expect(result.reasons[0]).toContain('Yelan')
    expect(result.reasons).toHaveLength(2)
  })

  it('Rule 4: LOVE when the only cover is under-built and no pairing applies', () => {
    const roster = [
      character({ name: 'Yanfei', element: 'Pyro', level: 50 }),
      character({ name: 'Furina', element: 'Hydro', level: 90 }),
    ]
    const result = verdict(roster, banner)
    expect(result.decision).toBe('LOVE')
    expect(result.reasons[0]).toContain('closest cover')
    expect(result.reasons[0]).toContain('Yanfei')
    expect(result.reasons).toHaveLength(2)
  })

  it('Rule 4: the strongest under-built cover is the one named', () => {
    const roster = [
      character({ name: 'Yanfei', element: 'Pyro', level: 40 }),
      character({ name: 'Diluc', element: 'Pyro', level: 65 }),
    ]
    const result = verdict(roster, banner)
    expect(result.decision).toBe('LOVE')
    expect(result.reasons[0]).toContain('Diluc')
  })
})
