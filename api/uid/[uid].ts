// Vercel Edge Function: CORS + User-Agent proxy for Enka.Network.
// Browsers cannot set a custom User-Agent and Enka sends no CORS headers,
// so this function is the only path the frontend has to the data.
// Deployed automatically with the app; in development Vite's server proxy
// (vite.config.ts) does the same job locally.

const UPSTREAM = 'https://enka.network/api/uid'
const USER_AGENT = 'pull-verdicts/0.1'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
} as const

export const runtime = 'edge'

function json(body: string, init: { status: number; headers?: Record<string, string> }) {
  return new Response(body, {
    status: init.status,
    headers: { 'Content-Type': 'application/json', ...CORS, ...init.headers },
  })
}

export async function GET(request: Request): Promise<Response> {
  const uid = new URL(request.url, 'https://placeholder.com').pathname.split('/').pop() ?? ''
  if (!/^\d{9}$/.test(uid)) {
    return json(JSON.stringify({ error: 'UID must be 9 digits' }), { status: 400 })
  }

  let upstream: Response
  try {
    upstream = await fetch(`${UPSTREAM}/${uid}`, {
      headers: { 'User-Agent': USER_AGENT },
    })
  } catch {
    return json(
      JSON.stringify({ error: 'Could not reach Enka.Network' }),
      { status: 502 },
    )
  }

  // Pass Enka's own status through: 404 = private or empty showcase,
  // 429 = rate limited. The frontend keys its error screens off these.
  const body = await upstream.text()

  let cacheControl = 'public, s-maxage=60, stale-while-revalidate=300'
  try {
    const parsed = JSON.parse(body) as { ttl?: number }
    if (typeof parsed.ttl === 'number' && parsed.ttl > 0) {
      // Respect the ttl Enka asks us to honor.
      cacheControl = `public, s-maxage=${parsed.ttl}, stale-while-revalidate=300`
    }
  } catch {
    // Non-JSON error body: fall back to the default cache window.
  }

  return json(body, {
    status: upstream.status,
    headers: { 'Cache-Control': cacheControl },
  })
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS })
}
