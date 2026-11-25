// Regenerates src/banners.json from the UIGF org's CurrentBannerWatcher
// dataset (github.com/UIGF-org/CurrentBannerWatcher), which is updated
// automatically from HoYoverse's official event wish announcements, ahead
// of each phase. Run by .github/workflows/sync-banners.yml, and by hand:
//
//   node scripts/sync-banners.mjs
//
// What is automatic, and what stays editorial:
//   automatic  featured 5-star, banner name, start and end timestamps
//   automatic  element, weapon type (src/data/characters.json)
//   automatic  role tags (src/data/roles.json)
//   editorial  pairings, tier overrides, art nudges (src/banner-meta.json)
//   editorial  announced characters without dates (src/upcoming.json)
//
// The sync prunes src/upcoming.json entries once their character has a
// dated banner, so the curated list cannot go stale.
//
// A brand-new character missing from banner-meta.json still syncs: the
// banner appears with no pairings, no tier override and no art nudge, and
// the verdict engine says plainly that the character is not catalogued
// yet instead of guessing. Add the editorial entry once the kit is known.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const SOURCE =
  'https://raw.githubusercontent.com/UIGF-org/CurrentBannerWatcher/main/banner-data.json'
const SERVER_OFFSET = '+08:00' // the dataset's times are Asia server time
const DAY_MS = 24 * 60 * 60 * 1000
// Keep banners that ended recently so share links made near the end of a
// phase still resolve to the banner they were made for. The picker labels
// them as ended, and activeBanner never selects them while a live banner
// exists.
const KEEP_ENDED_DAYS = 7

// UIGF pool types that are character event wishes: the ones this app
// judges. 301 = Character Event Wish, 400 = Character Event Wish-2.
// Weapon (302), Chronicled (500), standard and beginner pools are out.
const POOLS = new Set([301, 400])

const WEAPONS = {
  WEAPON_SWORD_ONE_HAND: 'Sword',
  WEAPON_CLAYMORE: 'Claymore',
  WEAPON_POLE: 'Polearm',
  WEAPON_BOW: 'Bow',
  WEAPON_CATALYST: 'Catalyst',
}

const characters = JSON.parse(readFileSync(join(root, 'src/data/characters.json'), 'utf8'))
const roles = JSON.parse(readFileSync(join(root, 'src/data/roles.json'), 'utf8'))
const meta = JSON.parse(readFileSync(join(root, 'src/banner-meta.json'), 'utf8'))
const target = join(root, 'src/banners.json')

// "2026/11/24 18:00" (server time) becomes an ISO timestamp with an
// explicit offset, so the app compares correct instants in any timezone.
function serverTime(value) {
  const match = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})$/.exec(value ?? '')
  if (!match) return undefined
  const [, year, month, day, hour, minute] = match
  return `${year}-${month}-${day}T${hour}:${minute}:00${SERVER_OFFSET}`
}

function bannerName(name) {
  return (name ?? '').replace(/^Event Wish\s+/, '').trim()
}

async function fetchSource() {
  const response = await fetch(SOURCE, {
    headers: { 'User-Agent': 'pull-verdicts-banner-sync' },
  })
  if (!response.ok) {
    throw new Error(`UIGF watcher returned ${response.status}`)
  }
  const data = await response.json()
  if (!data || typeof data !== 'object') {
    throw new Error('UIGF watcher returned an unexpected payload')
  }
  return data
}

function build(data, now = Date.now()) {
  const entries = []
  const warnings = []
  // Every character with a dated character-event banner in the source,
  // including old phases already dropped from the output. Used to prune
  // src/upcoming.json, which should only list undated characters.
  const dated = new Set()

  for (const [annId, raw] of Object.entries(data)) {
    if (!POOLS.has(raw?.UIGF_pool_type)) continue

    const startsAt = serverTime(raw.start_time)
    const endsAt = serverTime(raw.end_time)
    if (!startsAt || !endsAt) {
      warnings.push(`${annId}: unreadable start/end time, skipped`)
      continue
    }

    const featured = raw.UpOrangeList ?? []
    if (featured.length !== 1) {
      warnings.push(`${annId}: ${featured.length} featured 5-stars, skipped`)
      continue
    }

    const character = characters[String(featured[0])]
    if (!character) {
      warnings.push(`${annId}: unknown character id ${featured[0]}, skipped (refresh src/data/characters.json)`)
      continue
    }

    const editorial = meta[character.name] ?? {}
    if (!roles[character.name]) {
      warnings.push(`${character.name}: no role tags yet, verdict will say so`)
    }
    dated.add(character.name)

    // Keep the phase that just ended for a few days, drop older history.
    if (Date.parse(endsAt) < now - KEEP_ENDED_DAYS * DAY_MS) continue

    entries.push({
      id: Number(annId),
      banner: {
        character: character.name,
        element: character.element,
        weaponType: WEAPONS[character.weaponType] ?? character.weaponType ?? 'Unknown',
        bannerName: bannerName(raw['en-us']?.banner_name),
        roleTags: roles[character.name] ?? [],
        pairings: editorial.pairings ?? [],
        ...(editorial.tier ? { tier: editorial.tier } : {}),
        ...(typeof editorial.artShift === 'number' ? { artShift: editorial.artShift } : {}),
        startsAt,
        endsAt,
        startDate: startsAt.slice(0, 10),
        endDate: endsAt.slice(0, 10),
      },
    })
  }

  // Announcement order breaks ties, so concurrent banners keep the order
  // the game presents them in (and the first one stays the default pick).
  entries.sort(
    (a, b) => a.banner.startsAt.localeCompare(b.banner.startsAt) || a.id - b.id,
  )
  const banners = entries.map((entry) => entry.banner)

  if (banners.length === 0) {
    throw new Error('no character event banners in the source; refusing to write an empty list')
  }
  if (!banners.some((banner) => Date.parse(banner.endsAt) > now)) {
    throw new Error('every banner in the source has ended; refusing to write a stale list')
  }

  return { banners, warnings, dated: [...dated] }
}

const { banners, warnings, dated } = build(await fetchSource())
for (const warning of warnings) console.warn(`warning: ${warning}`)

writeFileSync(target, JSON.stringify(banners, null, 2) + '\n')
console.log(`Wrote ${banners.length} banners to src/banners.json`)
for (const banner of banners) {
  console.log(`  ${banner.startDate} → ${banner.endDate}  ${banner.character} (${banner.bannerName})`)
}

// src/upcoming.json is the one hand-curated banner input: characters
// announced without dates. Drop any that now have a dated banner, so the
// list cannot go stale or show a name twice.
const upcomingPath = join(root, 'src/upcoming.json')
const upcoming = JSON.parse(readFileSync(upcomingPath, 'utf8'))
const datedNames = new Set(dated)
const remaining = upcoming.filter((entry) => !datedNames.has(entry.character))
if (remaining.length !== upcoming.length) {
  for (const entry of upcoming) {
    if (datedNames.has(entry.character)) {
      console.log(`  pruned upcoming: ${entry.character} now has a dated banner`)
    }
  }
  writeFileSync(upcomingPath, JSON.stringify(remaining, null, 2) + '\n')
}
