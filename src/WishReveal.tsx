import { useEffect, useRef } from 'react'

// One-shot wish reveal, the site's signature moment: a comet streaks in
// from off-screen and bursts into element-colored particles above the
// verdict, an expanding ring answers it, then the overlay cleans itself
// up. The verdict word's CSS reveal is timed to land just after the
// burst (see index.css). Runs once per verdict screen mount.
const STREAK_MS = 650
const RING_MS = 600
const FADE_AT_MS = 1500
const END_MS = 2000

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

export function WishReveal({ color }: { color: string }) {
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
    const burstY = H * 0.4
    const t0 = performance.now()
    const particles: Particle[] = []
    let spawned = false
    let prev = t0
    let raf = 0

    // The comet flies a quadratic bezier from off-screen top-left to the
    // burst point, so its path curves like the wish-screen star.
    const p0 = { x: -70, y: H * 0.02 }
    const pc = { x: W * 0.28, y: H * 0.06 }
    const p1 = { x: burstX, y: burstY }
    const bezier = (t: number) => {
      const u = 1 - t
      return {
        x: u * u * p0.x + 2 * u * t * pc.x + t * t * p1.x,
        y: u * u * p0.y + 2 * u * t * pc.y + t * t * p1.y,
      }
    }
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

    const spawn = () => {
      for (let i = 0; i < 80; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 40 + Math.random() * 280
        particles.push({
          x: burstX,
          y: burstY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 40,
          born: performance.now(),
          ttl: 550 + Math.random() * 850,
          size: 1 + Math.random() * 2.2,
          color: Math.random() < 0.55 ? gold : color,
        })
      }
    }

    const frame = (now: number) => {
      const t = now - t0
      const dt = Math.min((now - prev) / 1000, 0.05)
      prev = now
      ctx.clearRect(0, 0, W, H)

      // Comet streak, until the burst.
      if (t < STREAK_MS) {
        const p = easeOut(t / STREAK_MS)
        const pos = bezier(p)
        const back = bezier(Math.max(0, p - 0.14))
        const grad = ctx.createLinearGradient(back.x, back.y, pos.x, pos.y)
        grad.addColorStop(0, 'rgba(245, 200, 107, 0)')
        grad.addColorStop(1, 'rgba(245, 200, 107, 0.9)')
        ctx.strokeStyle = grad
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(back.x, back.y)
        ctx.lineTo(pos.x, pos.y)
        ctx.stroke()
        const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 16)
        glow.addColorStop(0, 'rgba(255, 240, 210, 0.9)')
        glow.addColorStop(1, 'rgba(255, 240, 210, 0)')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, 16, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, 2.2, 0, Math.PI * 2)
        ctx.fill()
      }

      if (t >= STREAK_MS && !spawned) {
        spawned = true
        spawn()
      }

      // Expanding answer ring, right after the burst.
      const ringT = (t - STREAK_MS) / RING_MS
      if (ringT > 0 && ringT < 1) {
        ctx.strokeStyle = `rgba(245, 200, 107, ${(1 - ringT) * 0.5})`
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(burstX, burstY, 20 + ringT * 180, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Particles: radial burst, light gravity, drag, twinkle-out.
      if (spawned) {
        const drag = Math.exp(-1.1 * dt)
        for (const p of particles) {
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vy += 90 * dt
          p.vx *= drag
          p.vy *= drag
        }
        const age = now
        for (const p of particles) {
          const life = (age - p.born) / p.ttl
          if (life >= 1) continue
          const twinkle = 0.7 + 0.3 * Math.sin((age - p.born) * 0.02)
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
  }, [color])

  return <canvas ref={canvasRef} className="wish-canvas" aria-hidden="true" />
}
