# Pull Verdicts

**Should you pull on the current Genshin banner? Enter your UID, get a verdict — pull, skip, or only if you love them — with the reasons why.**

Not a tier list: a verdict for *your* account, read from your public in-game showcase.

## Status

Working locally. Screenshots: TODO (needs a browser session). Live URL: TODO — see Deploy.

## How it works

1. Player enters their game UID. No login, public showcase data only.
2. A server-side proxy calls [Enka.Network](https://enka.network), a free
   community API, and returns the showcase characters: names, elements,
   levels, constellations.
3. The app shows the roster for review, with an add-by-hand fallback for
   private or partial showcases.
4. The current banner ships as a hand-updated data file (`src/banners.json`).
5. A small rules engine (`src/verdict.ts`) compares the banner character
   against the roster and returns a verdict with reasons, plus a shareable
   1200x630 PNG.

## Development

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # verdict rule tests (vitest)
npm run build    # typecheck + production build to dist/
```

In development, Vite's server proxy forwards `/api/uid/:uid` to
`enka.network` with the required `User-Agent` header. In production, the
Vercel Edge Function `api/uid/[uid].ts` does the same job and adds CORS
headers plus `ttl`-aware caching.

### Updating the banner data

**Every game version (~6 weeks), update `src/banners.json` by hand**: the
featured character, element, role tags, and pairing partners. There is no
official banner API — this file is the one hand-maintained input, and a
missed update means the app shows last version's banner. Character
names/elements come from Enka's data store; refresh them after a new
character releases with:

```sh
curl -o data/enka/characters.json https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store/characters.json
curl -o data/enka/loc.json https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store/loc.json
node scripts/build-enka-data.mjs
```

Tuning the verdicts means editing `src/verdict.ts` (thresholds, rule order)
and `src/roles.ts` (per-character role tags). Community meta is opinion;
source rules from [KeqingMains](https://keqingmains.com/) guides and let
players disagree — every verdict shows its reasons for exactly that reason.

## Architecture

- **App:** Vite + React + TypeScript, one page, three screens (UID → roster → verdict)
- **Proxy:** Vercel Edge Function (`api/uid/[uid].ts`) — CORS, User-Agent, `ttl` cache
- **Hosting:** Vercel free tier (frontend + function deploy together)
- **Storage:** none server-side; localStorage remembers the last roster
- **Data:** Enka.Network API (no key) + bundled character data store

The proxy exists because Enka sends no CORS headers and asks clients for a
custom `User-Agent`, which browsers cannot set. Verified 2026-11-10.

## Deploy

1. Push this repo to GitHub.
2. Create a Vercel account via **Continue with GitHub** (no new password).
3. Import the repo in Vercel — framework preset **Vite** is detected
   automatically, and `api/` functions deploy with it. No configuration
   needed.
4. The live URL appears; put it in this README.

## Honest risks

- Enka only sees characters a player put on their **public showcase**;
  private or partial showcases get the add-by-hand fallback.
- Enka is fan-run with dynamic rate limits; if it goes down, the app pauses
  with it. The proxy's `ttl`-aware caching keeps us well inside limits.
- Banner data is hand-updated each version (see above).
- Meta is opinion. The verdicts show their reasons; players tell you when
  they're wrong.
- No logins, ever. Public showcase data only.
