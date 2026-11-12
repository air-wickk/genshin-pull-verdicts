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

  it('Rule 2: a consensus-weak banner downgrades the gap-PULL to LOVE', () => {
    // The gap is real, but paying limited currency for a community-
    // ranked-weak unit is not advice, so the verdict softens.
    const roster = [character({ name: 'Furina', element: 'Hydro', level: 90 })]
    const result = verdict(roster, { ...banner, tier: 'T4' })
    expect(result.decision).toBe('LOVE')
    expect(result.reasons.join(' ')).toContain('Prydwen tier T4')
  })

  it('Rule 2: a top-tier banner reinforces the gap-PULL with a reason', () => {
    const roster = [character({ name: 'Furina', element: 'Hydro', level: 90 })]
    const result = verdict(roster, { ...banner, tier: 'T0' })
    expect(result.decision).toBe('PULL')
    expect(result.reasons[result.reasons.length - 1]).toContain('Prydwen tier T0')
  })

  it('Rule 2: a mid-tier banner changes nothing', () => {
    const roster = [character({ name: 'Furina', element: 'Hydro', level: 90 })]
    const result = verdict(roster, { ...banner, tier: 'T2' })
    expect(result.decision).toBe('PULL')
    expect(result.reasons.join(' ')).not.toContain('Prydwen')
  })

  it('Rule 2: tier never overrides an account-based SKIP', () => {
    // Consensus says weak, but the account logic is certain: SKIP wins.
    const roster = [character({ name: 'Hu Tao', element: 'Pyro', level: 90 })]
    expect(verdict(roster, { ...banner, tier: 'T4' }).decision).toBe('SKIP')
  })

  it('Rule 2: consensus from the tiers snapshot downgrades a gap-PULL', () => {
    // Dehya carries no hand-set tier: the engine must read her T3 from
    // the generated snapshot (src/data/tiers.json).
    const dehya: Banner = { ...banner, character: 'Dehya' }
    const roster = [character({ name: 'Furina', element: 'Hydro', level: 90 })]
    const result = verdict(roster, dehya)
    expect(result.decision).toBe('LOVE')
    expect(result.reasons.join(' ')).toContain('Prydwen tier T3')
  })

  it('Rule 2: consensus from the snapshot reinforces a gap-PULL', () => {
    const mavuika: Banner = { ...banner, character: 'Mavuika' }
    const roster = [character({ name: 'Furina', element: 'Hydro', level: 90 })]
    const result = verdict(roster, mavuika)
    expect(result.decision).toBe('PULL')
    expect(result.reasons[result.reasons.length - 1]).toContain('Prydwen tier T0')
  })

  it('Rule 1: an Apex banner over a far-weaker built cover softens SKIP to LOVE', () => {
    // The user case: a built Raiden Shogun (T2) covering while an Apex
    // (T0) banner character shares her job. The upgrade is real, but it
    // is a luxury, so the verdict becomes "only if you love them".
    const mitya: Banner = {
      character: 'Mitya',
      element: 'Electro',
      weaponType: 'Catalyst',
      roleTags: ['on-field DPS'],
      pairings: ['Yae Miko', 'Wriothesley', 'Cyno', 'Qiqi'],
      startDate: '2026-11-04',
      endDate: '2026-11-24',
    }
    const roster = [character({ name: 'Raiden Shogun', element: 'Electro', level: 80 })]
    const result = verdict(roster, mitya)
    expect(result.decision).toBe('LOVE')
    expect(result.reasons.join(' ')).toContain('Prydwen T0')
    expect(result.reasons.join(' ')).toContain('sits at T2')
  })

  it('Rule 1: a close-tier built cover keeps the SKIP', () => {
    // Arlecchino (T1) covering against an Apex banner is one rank step
    // short of the soften threshold: a sidegrade is still a sidegrade.
    const mavuika: Banner = { ...banner, character: 'Mavuika' }
    const roster = [character({ name: 'Arlecchino', element: 'Pyro', level: 90 })]
    expect(verdict(roster, mavuika).decision).toBe('SKIP')
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

  it('Rule 4: a straw cover does not block a recommended pull (the Noelle case)', () => {
    // The user case: Zibai (T0 Geo on-field DPS) against an account whose
    // only Geo cover is Noelle, unbuilt and C0 while Prydwen's T2 rating
    // assumes C6. The paper cover is a straw one, so the verdict is the
    // gap PULL, with the math said out loud.
    const zibai: Banner = {
      character: 'Zibai',
      element: 'Geo',
      weaponType: 'Sword',
      roleTags: ['on-field DPS'],
      pairings: ['Linnea', 'Columbina', 'Illuga', 'Chiori'],
      tier: 'T0',
      startDate: '2026-11-24',
      endDate: '2026-12-15',
    }
    const roster = [
      character({
        name: 'Noelle',
        element: 'Geo',
        level: 66,
        constellation: 0,
        rarity: 4,
      }),
    ]
    const result = verdict(roster, zibai)
    expect(result.decision).toBe('PULL')
    expect(result.reasons.join(' ')).toContain('rates them T2 at C6')
    expect(result.reasons.join(' ')).toContain('play at best like T5')
    expect(result.reasons.join(' ')).toContain('Prydwen T0')
  })

  it('Rule 1: a C0 4-star cover plays below its rating, softening an Apex SKIP', () => {
    const roster = [
      character({
        name: 'Yanfei',
        element: 'Pyro',
        level: 90,
        constellation: 0,
        rarity: 4,
      }),
    ]
    const result = verdict(roster, { ...banner, tier: 'T0' })
    expect(result.decision).toBe('LOVE')
    expect(result.reasons.join(' ')).toContain('rates them T3 at C6')
    expect(result.reasons.join(' ')).toContain('sits at T5')
  })

  it('Rule 1: a C6 4-star cover counts at its full rating, no discount note', () => {
    const roster = [
      character({
        name: 'Yanfei',
        element: 'Pyro',
        level: 90,
        constellation: 6,
        rarity: 4,
      }),
    ]
    const result = verdict(roster, { ...banner, tier: 'T0' })
    expect(result.decision).toBe('LOVE')
    expect(result.reasons.join(' ')).toContain('sits at T3')
    expect(result.reasons.join(' ')).not.toContain('fully constellated')
  })

  it('Rule 4: an unbuilt top-tier cover says build instead of buy', () => {
    // Mavuika (T0) owned but unbuilt against a T0 banner: the ranks are
    // level, so the verdict stays LOVE, and the reason is "build them".
    const roster = [character({ name: 'Mavuika', element: 'Pyro', level: 65 })]
    const result = verdict(roster, { ...banner, tier: 'T0' })
    expect(result.decision).toBe('LOVE')
    expect(result.reasons.join(' ')).toContain('building them likely beats buying')
  })

  it('Rule 4: a 5-star straw cover is named without a constellation note', () => {
    const roster = [character({ name: 'Diluc', element: 'Pyro', level: 50 })]
    const result = verdict(roster, { ...banner, tier: 'T0' })
    expect(result.decision).toBe('PULL')
    expect(result.reasons.join(' ')).toContain('They rate T3 on Prydwen')
  })
})
