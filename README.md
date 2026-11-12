# Pull Verdicts

**Should you pull on the current Genshin banner? Enter your UID and get a verdict (pull, skip, or only if you love them) with the reasons behind it.**

This isn't a tier list. It's a verdict for *your* account, based on your public in-game showcase.

## How it works

1. The player enters their game UID. No login, and only public showcase data is used.
2. A server-side proxy calls [Enka.Network](https://enka.network), a free community API, and returns the showcase characters: names, elements, levels, and constellations.
3. The app shows the roster for review. Players with a private or partial showcase can add characters by hand.
4. A small rules engine (`src/verdict.ts`) compares the current banner character against the roster and returns a verdict with reasons, plus a shareable 1200x630 PNG.

### The verdict rules

Rules run in order, and the first match wins. A "strong" character is Lv. 70+, and a pairing partner counts at Lv. 60+.

1. **SKIP** if a strong character already covers the banner's element and one of its jobs. A second copy of the same job is a sidegrade. One consensus check: an Apex-tier (T0/T0.5) banner character over a built cover far below it (T1.5 or weaker) softens the SKIP to "only if you love them", since the upgrade is real but replacing a built carry is a luxury.
2. **PULL** if nobody covers the element and job. The reasons name the gap precisely, and a young roster (2 or fewer strong characters) adds an early-account reason. One consensus modifier (Prydwen ranks: a generated snapshot in `src/data/tiers.json`, optionally overridden per banner in `banners.json`) downgrades a gap-PULL to "only if you love them" for weak-tier units, and adds a reason for top-tier ones.
3. **PULL** if the banner character pairs into a strong team with a character the player already owns.
4. **LOVE** otherwise. The account is covered on paper, but the cover was never built, so pull for love, not meta.

Every verdict ships with its reasons. The rules are deliberately readable so players can argue with them.

## Sharing

Share verdict renders the 1200x630 card and opens an in-app dialog: post on X with a pre-filled draft, copy the image, copy the link, or download it. The draft links to `/share/{uid}?b={character}` (two Vercel edge functions, `api/share/[uid].ts` and `api/share-og/[uid].ts`), which run the same rules engine server-side for the chosen banner and serve the sharer's verdict as the tweet's large preview card (og:image, drawn with @vercel/og). Clicking the card opens the site with that banner preselected. The embed only works on the deployed site; in dev the link goes nowhere.

## Development

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # verdict rule tests (vitest)
npm run build    # typecheck + production build to dist/
node scripts/build-prydwen-tiers.mjs   # refresh consensus tiers; pass a saved page if Prydwen blocks the fetch
```

## Architecture

- **App:** Vite + React + TypeScript, one page, three screens (UID → roster → verdict)
- **Proxy:** Vercel Edge Function that handles CORS, the `User-Agent` header, and caching
- **Share:** Vercel Edge Functions that re-run the verdict server-side for tweet preview cards
- **Storage:** none server-side; localStorage remembers the last roster
- **Data:** Enka.Network API plus bundled character data and a Prydwen consensus-tier snapshot

## Notes

- Each game version runs two limited character banners per phase; the banner card on the home screen is the picker (click it for the list). The list in `src/banners.json` is hand-updated every version.
- Only characters on a player's public showcase are visible; otherwise, add them by hand.
- Meta is opinion. Every verdict shows its reasons so players can disagree.
- No logins, ever.

*Unofficial fan project, not affiliated with HoYoverse.*
