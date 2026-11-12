// Subject-lean analysis for splash art. The verdict screen centers the art
// box exactly (CSS), but the character does not stand at the same spot
// inside every official splash frame, so the occasional art needs a small
// horizontal correction to read centered. This module computes that
// correction from the art's own pixels so future banners self-center with
// no manual input; Banner.artShift remains a hand override for the rare
// art that defeats the analysis (translucent effects overlaid on the body,
// or a companion creature sharing the frame's opaque mass).
//
// The metric: per column of the alpha channel, mass (count of opaque
// pixels) weighted by the tallest contiguous opaque run raised to the 4th
// power. The 4th power strongly favors the character body, which is the
// tallest opaque structure in the frame, and downweights wide background
// splashes and props, which are shorter. The correction is the distance
// from the frame center to that weighted centroid.

// Below roughly 2.5% of frame width, pixel measurement and human
// perception disagree (measured across the current banner arts: the two
// characters our eyes call perfectly centered carry the largest measured
// leans). Corrections in that band are noise, so the analysis stays
// silent; a real lean is always well above it.
const DEAD_ZONE = 0.025

// A clear lean never needs more than this to read centered, and clamping
// keeps a pathological analysis from flinging the art sideways.
const MAX_SHIFT = 0.04

/** Horizontal subject correction as a fraction of the art width,
 *  positive = shift the art right. `data` is RGBA pixel data (as from
 *  CanvasRenderingContext2D.getImageData) sampled small, e.g. 160px wide;
 *  proportions are all this function needs. */
export function subjectShift(
  data: ArrayLike<number>,
  width: number,
  height: number,
): number {
  let mass = 0
  let moment = 0
  for (let x = 0; x < width; x++) {
    // Tallest contiguous run of opaque pixels in this column.
    let best = 0
    let current = 0
    let columnMass = 0
    for (let y = 0; y < height; y++) {
      if (data[(y * width + x) * 4 + 3] > 200) {
        current++
        columnMass++
        if (current > best) best = current
      } else {
        current = 0
      }
    }
    if (columnMass === 0) continue
    const weight = columnMass * (best / height) ** 4
    mass += weight
    moment += x * weight
  }
  if (mass === 0) return 0
  const centroid = moment / mass / width // 0..1, subject's horizontal center
  const lean = 0.5 - centroid // positive = subject sits left of center
  if (Math.abs(lean) < DEAD_ZONE) return 0
  return Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, lean))
}
