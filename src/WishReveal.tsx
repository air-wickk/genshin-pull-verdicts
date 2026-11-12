import { useEffect, useRef } from 'react'

// One-shot wish reveal, the site's signature moment, in three acts like
// a real wish: the streak, the held breath, the burst.
//
//   0.0-0.35s  the screen dims under a veil
//   0.1-1.4s   a comet curves in from off-screen and decelerates
//   1.4-1.7s   it hangs above the verdict, pulsing, shedding sparks
//   1.7s       the burst: flash, rays, double ring, particle storm
//   1.8s       the verdict word lands (CSS in index.css is timed to this)
//   2.7-3.3s   the veil of particles fades and the overlay cleans up
//
// The burst color telegraphs the decision like wish colors do: gold for
// PULL/LOVE, cold blue for SKIP. Particles always mix in the banner
// character's element color. PULL/LOVE get the full 5-star celebration
// (130 particles, rays, echo ring); SKIP is a small, cold, honest pop.
const VEIL_IN_MS = 350
const DROP_START_MS = 100
const DROP_END_MS = 1400
const HANG_END_MS = 1700
const BURST_MS = HANG_END_MS
const RING1_MS = 500
const RING2_MS = 900
const RAYS_MS = 450
const FADE_AT_MS = 2700
const END_MS = 3300

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  born: number
  ttl: number
  size: number
  color: string
}

function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

export function WishReveal({
  color,
  flash,
  celebrate,
}: {
  color: string
  flash: string
  celebrate: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const W = window.innerWidth
    const H = window.innerHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)

    const gold = '#f5c86b'
    const burstX = W / 2
    const burstY = H * 0.42
    const t0 = performance.now()
    const particles: Particle[] = []
    let spawned = false
    let prev = t0
    let raf = 0

    // The comet flies a quadratic bezier from off-screen top-left to the
    // hang point, decelerating as it arrives so the drop reads as fate
    // slowing down, not a bullet.
    const p0 = { x: -70, y: H * 0.02 }
    const pc = { x: W * 0.3, y: H * 0.28 }
    const p1 = { x: burstX, y: burstY }
    const bezier = (t: number) => {
      const u = 1 - t
      return {
        x: u * u * p0.x + 2 * u * t * pc.x + t * t * p1.x,
        y: u * u * p0.y + 2 * u * t * pc.y + t * t * p1.y,
      }
    }

    const spawn = (count: number, speedMin: number, speedMax: number) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = speedMin + Math.random() * (speedMax - speedMin)
        particles.push({
          x: burstX,
          y: burstY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 40,
          born: performance.now(),
          ttl: 600 + Math.random() * 900,
          size: 1 + Math.random() * 2.4,
          color: Math.random() < 0.55 ? flash : color,
        })
      }
    }

    const veilAlpha = (t: number) => {
      if (t < 60) return 0
      if (t < VEIL_IN_MS) return 0.5 * (t / VEIL_IN_MS)
      if (t < BURST_MS + 300) return 0.5
      const out = (t - BURST_MS - 300) / (FADE_AT_MS - BURST_MS - 300)
      return 0.5 * Math.max(0, 1 - out)
    }

    const frame = (now: number) => {
      const t = now - t0
      const dt = Math.min((now - prev) / 1000, 0.05)
      prev = now
      ctx.clearRect(0, 0, W, H)

      // Act 0: the veil. The wish screen goes quiet and dark.
      const veil = veilAlpha(t)
      if (veil > 0) {
        ctx.fillStyle = `rgba(13, 18, 32, ${veil})`
        ctx.fillRect(0, 0, W, H)
      }

      // Act 1: the streak, decelerating into the hang.
      if (t < DROP_END_MS) {
        const p = easeOut(Math.max(0, (t - DROP_START_MS) / (DROP_END_MS - DROP_START_MS)))
        const pos = bezier(p)
        const back = bezier(Math.max(0, p - 0.16))
        const grad = ctx.createLinearGradient(back.x, back.y, pos.x, pos.y)
        grad.addColorStop(0, withAlpha(flash, 0))
        grad.addColorStop(1, withAlpha(flash, 0.9))
        ctx.strokeStyle = grad
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(back.x, back.y)
        ctx.lineTo(pos.x, pos.y)
        ctx.stroke()
        const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 18)
        glow.addColorStop(0, withAlpha(flash, 0.9))
        glow.addColorStop(1, withAlpha(flash, 0))
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, 18, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, 2.4, 0, Math.PI * 2)
        ctx.fill()
      }

      // Act 2: the held breath. The star hangs, pulse grows, sparks shed.
      if (t >= DROP_END_MS && t < HANG_END_MS) {
        const h = (t - DROP_END_MS) / (HANG_END_MS - DROP_END_MS)
        const pulse = 1 + 0.35 * Math.sin(t * 0.025)
        const glowR = 10 + 22 * h * pulse
        const glow = ctx.createRadialGradient(burstX, burstY, 0, burstX, burstY, glowR)
        glow.addColorStop(0, withAlpha(flash, 0.55 + 0.4 * h))
        glow.addColorStop(1, withAlpha(flash, 0))
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(burstX, burstY, glowR, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(burstX, burstY, 2.2 + 1.6 * h, 0, Math.PI * 2)
        ctx.fill()
        // Shed a few sparks while it trembles.
        if (Math.random() < 0.5) {
          particles.push({
            x: burstX + (Math.random() - 0.5) * 6,
            y: burstY,
            vx: (Math.random() - 0.5) * 60,
            vy: 30 + Math.random() * 60,
            born: now,
            ttl: 420,
            size: 1,
            color: gold,
          })
        }
      }

      // Act 3: the burst. A PULL/LOVE detonates; a SKIP is a modest pop,
      // the same grammar, less fire.
      if (t >= BURST_MS && !spawned) {
        spawned = true
        spawn(celebrate ? 130 : 70, 40, celebrate ? 380 : 260)
      }

      const bt = t - BURST_MS

      // Light rays shooting outward (celebration-grade wishes only).
      if (celebrate && bt >= 0 && bt < RAYS_MS) {
        const rp = bt / RAYS_MS
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2 + 0.26
          const len = 24 + easeOut(rp) * 170
          ctx.strokeStyle = withAlpha(flash, (1 - rp) * 0.5)
          ctx.beginPath()
          ctx.moveTo(burstX + Math.cos(angle) * 18, burstY + Math.sin(angle) * 18)
          ctx.lineTo(burstX + Math.cos(angle) * len, burstY + Math.sin(angle) * len)
          ctx.stroke()
        }
      }

      // Double answer ring: a fast bright shock, then a wide slow echo.
      if (bt >= 0 && bt < RING1_MS) {
        const rp = bt / RING1_MS
        ctx.strokeStyle = withAlpha(flash, (1 - rp) * 0.8)
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.arc(burstX, burstY, 12 + easeOut(rp) * 200, 0, Math.PI * 2)
        ctx.stroke()
      }
      // Wide slow gold echo, only worth a celebration.
      if (celebrate && bt >= 0 && bt < RING2_MS) {
        const rp = bt / RING2_MS
        ctx.strokeStyle = withAlpha(gold, (1 - rp) * 0.35)
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(burstX, burstY, 12 + easeOut(rp) * 320, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Particles: radial storm, light gravity, drag, twinkle-out.
      if (spawned) {
        const drag = Math.exp(-1.1 * dt)
        for (const p of particles) {
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vy += 90 * dt
          p.vx *= drag
          p.vy *= drag
        }
        for (const p of particles) {
          const life = (now - p.born) / p.ttl
          if (life >= 1) continue
          const twinkle = 0.7 + 0.3 * Math.sin((now - p.born) * 0.02)
          ctx.globalAlpha = (1 - life) * twinkle
          ctx.fillStyle = p.color
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
      }

      if (t > FADE_AT_MS) {
        canvas.style.opacity = String(
          Math.max(0, 1 - (t - FADE_AT_MS) / (END_MS - FADE_AT_MS)),
        )
      }

      if (t < END_MS) {
        raf = requestAnimationFrame(frame)
      }
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [color, flash, celebrate])

  return <canvas ref={canvasRef} className="wish-canvas" aria-hidden="true" />
}
