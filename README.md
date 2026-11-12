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

1. **SKIP** if a strong character already covers the banner's element and one of its jobs. A second copy of the same job is a sidegrade.
2. **PULL** if nobody covers the element and job. The reasons name the gap precisely, and a young roster (2 or fewer strong characters) adds an early-account reason. One hand-updated modifier: the consensus rank from Prydwen's tier list (stored in `banners.json`) downgrades a gap-PULL to "only if you love them" for weak-tier units, and adds a reason for top-tier ones.
3. **PULL** if the banner character pairs into a strong team with a character the player already owns.
4. **LOVE** otherwise. The account is covered on paper, but the cover was never built, so pull for love, not meta.

Every verdict ships with its reasons. The rules are deliberately readable so players can argue with them.

## Development

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # verdict rule tests (vitest)
npm run build    # typecheck + production build to dist/
```

## Architecture

- **App:** Vite + React + TypeScript, one page, three screens (UID → roster → verdict)
- **Proxy:** Vercel Edge Function that handles CORS, the `User-Agent` header, and caching
- **Storage:** none server-side; localStorage remembers the last roster
- **Data:** Enka.Network API plus a bundled character data store

## Notes

- Only characters on a player's public showcase are visible; otherwise, add them by hand.
- Meta is opinion. Every verdict shows its reasons so players can disagree.
- No logins, ever.

*Unofficial fan project, not affiliated with HoYoverse.*
