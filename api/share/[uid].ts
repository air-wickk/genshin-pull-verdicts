// Vercel Edge Function: the public share page for one UID's verdict.
// A tweet drafts {origin}/share/{uid}; when it posts, X's crawler hits
// this page, reads the Open Graph tags, and renders the sharer's actual
// verdict as the large clickable preview card. The card image is drawn
// by api/share-og/[uid].ts, served at /share/{uid}/og.png.
// Humans land on a minimal page with the verdict and a call to action.

import { verdict as computeVerdict } from '../../src/verdict'
import { enkaToRoster, type EnkaAvatar } from '../../src/enka'
import { DECISION_CLASS, DECISION_LABEL } from '../../src/labels'
import { bannerBySlug, bannerSlug } from '../../src/banners'

export const config = { runtime: 'edge' }
const UPSTREAM = 'https://enka.network/api/uid'
const USER_AGENT = 'pull-verdicts/0.1'

// The page's palette mirrors src/index.css so the card and the site read
// as one product. (CSS variables can't be shared: this page is raw HTML.)
const COLORS = {
  bg: '#0d1220',
  surface: '#131a2b',
  text: '#e8e6e3',
  quiet: '#8f99ab',
  gold: '#f5c86b',
  PULL: '#3ddc97',
  SKIP: '#ed313e',
  LOVE: '#f0a840',
} as const

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function fetchUpstream(uid: string): Promise<Response> {
  return fetch(`${UPSTREAM}/${uid}`, { headers: { 'User-Agent': USER_AGENT } })
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const uid = url.pathname.split('/').pop() ?? ''
  if (!/^\d{9}$/.test(uid)) {
    return new Response('UID must be 9 digits', { status: 400 })
  }
  // The og card must match the banner the sharer judged: the tweet drafts
  // ?b=<slug>. Absent or unknown slug falls back to today's active banner.
  const banner = bannerBySlug(url.searchParams.get('b'))

  const title = `My pull verdict for ${banner.character}`
  const cta = escapeHtml('Get your own verdict')

  let upstream: Response
  try {
    upstream = await fetchUpstream(uid)
  } catch {
    return html({ title, body: notice('Could not reach Enka.Network, try again soon.', cta) })
  }

  // 404 = showcase private or empty; 429 = rate limited. The link still
  // resolves, so give humans a plain page with no result card.
  if (upstream.status === 404) {
    return html({ title, body: notice('That showcase is private or empty, so there is no verdict to show.', cta) })
  }
  if (upstream.status === 429) {
    return html({ title, body: notice('Enka.Network rate limit, try again soon.', cta) })
  }
  if (!upstream.ok) {
    return html({ title, body: notice('Something went wrong reading the showcase, try again soon.', cta) })
  }

  let payload: { avatarInfoList?: EnkaAvatar[] }
  try {
    payload = (await upstream.json()) as { avatarInfoList?: EnkaAvatar[] }
  } catch {
    return html({ title, body: notice('Could not read the showcase, try again soon.', cta) })
  }
  if (!Array.isArray(payload.avatarInfoList) || payload.avatarInfoList.length === 0) {
    return html({ title, body: notice('That showcase is private or empty, so there is no verdict to show.', cta) })
  }

  const verdict = computeVerdict(enkaToRoster(payload.avatarInfoList), banner)
  const label = DECISION_LABEL[verdict.decision]
  const color = COLORS[verdict.decision]
  const reason = escapeHtml(verdict.reasons[0])
  const character = escapeHtml(banner.character)

  const ogTitle = `My pull verdict for ${character}: ${label}`
  const ogDescription = `${reason} Check yours:`
  const ogImage = `${url.origin}/share/${uid}/og.png`

  return html({
    title: ogTitle,
    description: ogDescription,
    image: ogImage,
    body: `
      <main>
        <p class="kicker">Pull Verdicts</p>
        <p class="word ${DECISION_CLASS[verdict.decision]}">${escapeHtml(label)}</p>
        <p class="character">${character} &middot; ${escapeHtml(banner.element)}</p>
        <p class="reason">${reason}</p>
        <a class="cta" href="/?b=${escapeHtml(bannerSlug(banner.character))}">${cta}</a>
        <p class="quiet">from the public showcase for UID ${uid}</p>
      </main>`,
  })
}

// The landing page: verdict up top, one call to action. The Open Graph
// tags are the point; the body just has to hold up for humans.
function html(page: {
  title: string
  description?: string
  image?: string
  body: string
}): Response {
  const { title, description, image, body } = page
  const tags = [
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    description
      ? `<meta property="og:description" content="${escapeHtml(description)}" />`
      : '',
    image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : '',
  ]
    .filter(Boolean)
    .join('\n    ')

  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="${COLORS.bg}" />
    <title>${escapeHtml(title)} | Pull Verdicts</title>
    ${tags}
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: ${COLORS.bg};
        color: ${COLORS.text};
        font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
        text-align: center;
      }
      main { max-width: 640px; padding: 48px 24px; }
      .kicker {
        margin: 0 0 8px;
        font-size: 14px;
        font-weight: 600;
        letter-spacing: 0.4em;
        text-transform: uppercase;
        color: ${COLORS.gold};
      }
      .word { margin: 0; font-size: clamp(56px, 12vw, 110px); font-weight: 800; line-height: 1.1; }
      .word.PULL { color: ${COLORS.PULL}; }
      .word.SKIP { color: ${COLORS.SKIP}; }
      .word.LOVE { color: ${COLORS.LOVE}; }
      .character { margin: 12px 0 0; font-size: 22px; font-weight: 600; color: ${COLORS.gold}; }
      .reason { margin: 16px auto 0; max-width: 46ch; font-size: 18px; color: ${COLORS.text}; opacity: 0.85; }
      .cta {
        display: inline-block;
        margin-top: 32px;
        padding: 14px 24px;
        border-radius: 12px;
        background: ${COLORS.text};
        color: ${COLORS.bg};
        font-weight: 600;
        text-decoration: none;
      }
      .quiet { margin-top: 24px; font-size: 14px; color: ${COLORS.quiet}; }
    </style>
  </head>
  <body>
    ${body}
  </body>
</html>`,
    {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    },
  )
}

// The no-verdict body: same shell, plain message, same CTA.
function notice(message: string, cta: string): string {
  return `
      <main>
        <p class="kicker">Pull Verdicts</p>
        <p class="reason">${escapeHtml(message)}</p>
        <a class="cta" href="/">${escapeHtml(cta)}</a>
      </main>`
}
