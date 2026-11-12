// Vercel Edge Function: draws one UID's verdict as a 1200x630 PNG for the
// link preview card. Served at /share/{uid}/og.png (see vercel.json) and
// referenced by the og:image tag in api/share/[uid].ts. Same engine, same
// verdict as the app: it fetches the public showcase, runs the rules, and
// renders the card with @vercel/og (deploy-time only; the app itself
// never imports it).

import type { ReactElement } from 'react'
import { ImageResponse } from '@vercel/og'
import { verdict as computeVerdict } from '../../src/verdict'
import { enkaToRoster, type EnkaAvatar } from '../../src/enka'
import { DECISION_LABEL } from '../../src/labels'
import bannerData from '../../src/banners.json'
import type { Banner } from '../../src/types'

export const config = { runtime: 'edge' }

const banner = bannerData as Banner
const UPSTREAM = 'https://enka.network/api/uid'
const USER_AGENT = 'pull-verdicts/0.1'

// Mirrors the in-app share card's palette (src/index.css).
const BG = '#0d1220'
const GOLD = '#f5c86b'
const QUIET = '#8f99ab'
const STATE: Record<string, string> = {
  PULL: '#3ddc97',
  SKIP: 'rgba(237, 49, 62, 0.95)',
  LOVE: '#f0a840',
}

function sideIconUrl(name: string): string {
  return `https://enka.network/ui/UI_AvatarIcon_${name.replace(/\s+/g, '')}.png`
}

// satori's <img> can take a remote URL, but only if the fetch succeeds;
// fetching it ourselves first lets a failed icon degrade to no icon
// instead of failing the whole render.
async function loadIconDataUrl(): Promise<string | null> {
  try {
    const response = await fetch(sideIconUrl(banner.character), {
      headers: { 'User-Agent': USER_AGENT },
    })
    if (!response.ok) return null
    const bytes = new Uint8Array(await response.arrayBuffer())
    let binary = ''
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
    }
    return `data:image/png;base64,${btoa(binary)}`
  } catch {
    return null
  }
}

// The card body, matched to the in-app ShareCard: kicker, icon, verdict
// word, character line, first reason, site pointer. satori is a CSS
// subset: inline styles only, flexbox only, so this is written as objects.
function cardLayout(label: string, reason: string, icon: string | null, host: string) {
  const state = STATE[label] ?? GOLD
  const wordSize = label === 'Only if you love them' ? 84 : 140
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 22,
        padding: '48px 64px',
        backgroundColor: BG,
        backgroundImage:
          'radial-gradient(900px 600px at 50% -10%, rgba(90, 140, 210, 0.16), transparent 60%)',
      }}
    >
      <div
        style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: 9,
          textTransform: 'uppercase',
          color: GOLD,
        }}
      >
        Pull Verdicts
      </div>
      {icon ? (
        <img
          src={icon}
          width={110}
          height={110}
          style={{ borderRadius: 26, border: '3px solid rgba(245, 200, 107, 0.4)' }}
        />
      ) : null}
      <div
        style={{
          margin: 0,
          fontSize: wordSize,
          fontWeight: 700,
          lineHeight: 1.05,
          color: state,
        }}
      >
        {label}
      </div>
      <div style={{ margin: 0, fontSize: 30, fontWeight: 600, color: GOLD }}>
        {banner.character} &middot; {banner.element}
      </div>
      <div
        style={{
          margin: 0,
          maxWidth: 920,
          fontSize: 25,
          lineHeight: 1.45,
          textAlign: 'center',
          color: 'rgba(232, 230, 227, 0.85)',
        }}
      >
        {reason}
      </div>
      <div style={{ margin: 0, fontSize: 20, color: QUIET }}>
        check your own at {host}
      </div>
    </div>
  )
}

// When the showcase cannot be read, the link must still resolve: draw a
// plain branded card so the tweet never embeds a broken image.
function fallbackCard() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 22,
        padding: '48px 64px',
        backgroundColor: BG,
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: 9, color: GOLD }}>
        PULL VERDICTS
      </div>
      <div style={{ fontSize: 44, fontWeight: 700, color: GOLD }}>
        {banner.character}
      </div>
      <div
        style={{
          maxWidth: 900,
          fontSize: 26,
          textAlign: 'center',
          color: 'rgba(232, 230, 227, 0.85)',
        }}
      >
        Should you pull on this banner? Check your UID to get a verdict for
        your account, with the reasons why.
      </div>
    </div>
  )
}

function imageResponse(node: ReactElement, cache: string): Response {
  return new ImageResponse(node, {
    width: 1200,
    height: 630,
    headers: { 'Cache-Control': cache },
  })
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const uid = url.pathname.split('/').pop() ?? ''
  if (!/^\d{9}$/.test(uid)) {
    return new Response('UID must be 9 digits', { status: 400 })
  }

  const cache = 'public, s-maxage=3600, stale-while-revalidate=86400'

  let upstream: Response
  try {
    upstream = await fetch(`${UPSTREAM}/${uid}`, {
      headers: { 'User-Agent': USER_AGENT },
    })
  } catch {
    return imageResponse(fallbackCard(), cache)
  }
  if (!upstream.ok) {
    return imageResponse(fallbackCard(), cache)
  }

  let payload: { avatarInfoList?: EnkaAvatar[] }
  try {
    payload = (await upstream.json()) as { avatarInfoList?: EnkaAvatar[] }
  } catch {
    return imageResponse(fallbackCard(), cache)
  }
  const avatars = payload.avatarInfoList
  if (!Array.isArray(avatars) || avatars.length === 0) {
    return imageResponse(fallbackCard(), cache)
  }

  const verdict = computeVerdict(enkaToRoster(avatars), banner)
  const label = DECISION_LABEL[verdict.decision]
  const icon = await loadIconDataUrl()

  return imageResponse(cardLayout(label, verdict.reasons[0], icon, url.host), cache)
}
