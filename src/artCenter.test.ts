import { describe, expect, it } from 'vitest'
import { subjectShift } from './artCenter'

// Build RGBA pixel data: fully opaque (255) where the mask says 1,
// transparent elsewhere. `mask` is a list of [x, y] solid cells.
function pixels(
  width: number,
  height: number,
  solid: (x: number, y: number) => boolean,
): number[] {
  const data: number[] = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      data.push(255, 255, 255, solid(x, y) ? 255 : 0)
    }
  }
  return data
}

// A single tall opaque slab occupying a horizontal band of columns.
function slab(width: number, height: number, from: number, to: number): number[] {
  return pixels(width, height, (x) => x >= from && x < to)
}

describe('subjectShift', () => {
  const W = 200
  const H = 100

  it('returns 0 when the subject is centered', () => {
    // Slab spanning 40%..60%: centroid at 50% of the frame.
    const shift = subjectShift(slab(W, H, W * 0.4, W * 0.6), W, H)
    expect(shift).toBe(0)
  })

  it('returns 0 for a fully symmetric composition', () => {
    // Two equal slabs mirrored around the center.
    const data = pixels(W, H, (x) => (x >= 20 && x < 60) || (x >= W - 60 && x < W - 20))
    expect(subjectShift(data, W, H)).toBe(0)
  })

  it('shifts right when the subject sits left of center', () => {
    // Slab spanning 30%..42%: centroid ~36%, lean +14% → clamped to +4%.
    const shift = subjectShift(slab(W, H, W * 0.3, W * 0.42), W, H)
    expect(shift).toBeCloseTo(0.04, 5)
  })

  it('shifts left when the subject sits right of center', () => {
    // Slab spanning 62%..74%: centroid ~68%, lean -18% → clamped to -4%.
    const shift = subjectShift(slab(W, H, W * 0.62, W * 0.74), W, H)
    expect(shift).toBeCloseTo(-0.04, 5)
  })

  it('stays silent for leans inside the dead zone', () => {
    // Slab spanning 47%..52.5%: centroid ~49.75%, lean 0.25% < 2.5%.
    const shift = subjectShift(slab(W, H, W * 0.47, W * 0.525), W, H)
    expect(shift).toBe(0)
  })

  it('prefers the tallest structure over a shorter wide one', () => {
    // A short wide slab left of center plus a tall narrow slab right of
    // center: the character-like tall structure should dominate, so the
    // correction points left (subject sits right).
    const data = pixels(W, H, (x, y) =>
      (x >= W * 0.1 && x < W * 0.5 && y < H * 0.4) || // wide, top 40%
      (x >= W * 0.6 && x < W * 0.68), // narrow, full height
    )
    const shift = subjectShift(data, W, H)
    expect(shift).toBeLessThan(0)
  })

  it('returns 0 for an empty frame', () => {
    expect(subjectShift(new Array(W * H * 4).fill(0), W, H)).toBe(0)
  })

  it('reads semi-transparent overlays as background, not subject', () => {
    // Solid subject just right of center, plus a translucent veil over the
    // left half: alpha 64 everywhere on the left must not drag the
    // centroid or flip the correction.
    const data = slab(W, H, W * 0.52, W * 0.55)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W * 0.5; x++) {
        const i = (y * W + x) * 4 + 3
        data[i] = 64
      }
    }
    const shift = subjectShift(data, W, H)
    expect(shift).toBeLessThan(0)
    expect(shift).toBeGreaterThan(-0.04)
  })
})
