// Generates src/data/tiers.json from Prydwen's server-rendered Genshin
// tier list (https://www.prydwen.gg/genshin-impact/tier-list, Overall
// view). Re-run at each patch or whenever consensus shifts:
//   node scripts/build-prydwen-tiers.mjs
//
// Prydwen sits behind Cloudflare and rejects non-browser clients with
// 403. If the live fetch is blocked, save the page from your browser
// (right-click, Save As, Webpage HTML only) and pass the file:
//   node scripts/build-prydwen-tiers.mjs path/to/tier-list.html
//
// The file maps character names (same naming as src/data/characters.json
// and src/roles.ts) to their Overall tier (T0..T5, half steps included).
// Characters missing from the map have unknown tiers; the engine then
// declines to use consensus on their behalf rather than guess.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const PAGE_URL = 'https://www.prydwen.gg/genshin-impact/tier-list'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PullVerdicts/0.1 (tier snapshot)'

// Prydwen's container classes use bare numbers and "05"; the app speaks
// in the T-prefixed labels players see on the page.
const LABELS = {
  '0': 'T0',
  '05': 'T0.5',
  '1': 'T1',
  '15': 'T1.5',
  '2': 'T2',
  '3': 'T3',
  '4': 'T4',
  '5': 'T5',
}

async function loadHtml() {
  const savedPath = process.argv[2]
  if (savedPath) return readFileSync(savedPath, 'utf8')
  const response = await fetch(PAGE_URL, { headers: { 'User-Agent': USER_AGENT } })
  if (response.status === 403) {
    console.error(
      'Prydwen blocked the direct fetch (403, Cloudflare). Save the page\n' +
        'from your browser and re-run with the file path:\n' +
        '  node scripts/build-prydwen-tiers.mjs path/to/tier-list.html',
    )
    process.exit(1)
  }
  if (!response.ok) {
    console.error(`Prydwen returned ${response.status}`)
    process.exit(1)
  }
  return response.text()
}

const html = await loadHtml()

// The page is server-rendered: one Overall tier list, tier groups as
// "custom-tier tier-<n>" containers, characters as "emp-name" spans.
// Walk the events in order: a tier event switches the current tier, a
// name event files that character under it.
const start = html.indexOf('custom-tier-list-genshin')
const next = html.indexOf('custom-tier-list-genshin', start + 1)
const scope = html.slice(start, next === -1 ? html.length : next)

const eventRe = /custom-tier tier-([\w-]+)|emp-name">([^<]+)</g
const tiers = {}
let currentTier = null
let match
while ((match = eventRe.exec(scope))) {
  if (match[1]) {
    currentTier = LABELS[match[1]] ?? match[1]
  } else if (match[2] && currentTier && !(match[2] in tiers)) {
    tiers[match[2]] = currentTier
  }
}

// Alphabetical, so a re-run produces a diff that reads like a changelog.
const sorted = Object.fromEntries(
  Object.entries(tiers).sort(([a], [b]) => a.localeCompare(b)),
)

mkdirSync(join(root, 'src/data'), { recursive: true })
writeFileSync(
  join(root, 'src/data/tiers.json'),
  JSON.stringify(sorted, null, 2) + '\n',
)
const count = Object.keys(sorted).length
console.log(`Wrote src/data/tiers.json with ${count} characters`)
