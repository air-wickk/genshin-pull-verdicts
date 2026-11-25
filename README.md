# Pull Verdicts

**Should you pull on the current Genshin banner? Enter your UID, get a verdict (pull, skip, or only if you love them) with the reasons why.**

Not a tier list: a verdict for *your* account, read from your public in-game showcase.

## Status

Working locally. Screenshots: TODO (needs a browser session). Live URL: TODO, see Deploy.

## How it works

1. Player enters their game UID. No login, public showcase data only.
2. A server-side proxy calls [Enka.Network](https://enka.network), a free
   community API, and returns the showcase characters: names, elements,
   levels, constellations.
3. The app shows the roster for review, with an add-by-hand fallback for
   private or partial showcases.
4. Banner data is rebuilt automatically from the UIGF org's watcher
   dataset (see below), which follows HoYoverse's official announcements.
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

**Banner data is automatic.** There is no official banner API, so a
scheduled GitHub Action (`.github/workflows/sync-banners.yml`) rebuilds
`src/banners.json` from the
[UIGF org's CurrentBannerWatcher](https://github.com/UIGF-org/CurrentBannerWatcher)
dataset, which is generated from HoYoverse's official event wish
announcements and published well before each phase starts:

- featured 5-star, banner name, exact start and end times
- element, weapon type and rarity from the Enka data store
- role tags from `src/data/roles.json`

The action refreshes `src/data/characters.json` first, regenerates the
banner list, runs the tests, and commits only if something changed. Vercel
redeploys from that commit. Ended phases drop out automatically; the last
one is kept for a week so recently shared links still resolve.

One editorial step remains, per new character: add pairings, an optional
tier override and an art nudge to `src/banner-meta.json`, and role tags to
`src/data/roles.json` once the community has settled them. Until then the
banner still syncs, and the verdict says plainly that the character is not
catalogued yet instead of guessing.

Announced characters whose banner dates are not out yet live in
`src/upcoming.json`, the one hand-curated banner list (no structured feed
carries undated teases, and unreleased characters are not in the Enka data
store). The site shows them as a quiet "Coming next" line under the banner
card, with no verdict and no picker entry until they have a dated phase.
The sync deletes each entry as soon as that character gets a real banner.

Run the sync locally with `node scripts/sync-banners.mjs`. To refresh the
character table by hand:

```sh
curl -o data/enka/avatars.json https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store/gi/avatars.json
curl -o data/enka/locs.json https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store/gi/locs.json
node scripts/build-enka-data.mjs
```

Tuning the verdicts means editing `src/verdict.ts` (thresholds, rule order)
and `src/data/roles.json` (per-character role tags). Community meta is
opinion; source rules from [KeqingMains](https://keqingmains.com/) guides
and let players disagree: every verdict shows its reasons for exactly that
reason.

## Architecture

- **App:** Vite + React + TypeScript, one page, three screens (UID → roster → verdict)
- **Proxy:** Vercel Edge Function (`api/uid/[uid].ts`), CORS, User-Agent, `ttl` cache
- **Hosting:** Vercel free tier (frontend + functions deploy together)
- **Banner data:** GitHub Action sync from the UIGF watcher, committed to `src/banners.json`
- **Upcoming:** `src/upcoming.json` for announced but undated characters, pruned by the sync
- **Storage:** none server-side; localStorage remembers the last roster
- **Data:** Enka.Network API (no key) + bundled character data store

The proxy exists because Enka sends no CORS headers and asks clients for a
custom `User-Agent`, which browsers cannot set. Verified 2026-11-10.

## Deploy

1. Push this repo to GitHub.
2. Create a Vercel account via **Continue with GitHub** (no new password).
3. Import the repo in Vercel; the framework preset **Vite** is detected
   automatically, and `api/` functions deploy with it. No configuration
   needed.
4. The live URL appears; put it in this README.

## Honest risks

- Enka only sees characters a player put on their **public showcase**;
  private or partial showcases get the add-by-hand fallback.
- Enka is fan-run with dynamic rate limits; if it goes down, the app pauses
  with it. The proxy's `ttl`-aware caching keeps us well inside limits.
- Banner data comes from a community dataset built from official notices,
  so it can lag an announcement by up to a day. The phase's own start and
  end times still control what the app shows.
- The "Coming next" line is hand-curated (an announcement can name a
  character without a date), and it is informational only: no verdict
  until the character has a dated banner.
- Meta is opinion. The verdicts show their reasons; players tell you when
  they're wrong.
- No logins, ever. Public showcase data only.
