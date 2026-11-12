// Generates src/data/characters.json from Enka.Network's raw data store
// (data/enka/avatars.json + locs.json, fetched from
// github.com/EnkaNetwork/API-docs, store/gi). Re-run after a game version
// adds characters:  node scripts/build-enka-data.mjs
//
// The raw files are large (they include talents and props for 15 languages),
// so the app bundles only what the roster screen needs: ~30KB of
// id → name, element, icon, weapon type.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const characters = JSON.parse(
  readFileSync(join(root, 'data/enka/avatars.json'), 'utf8'),
)
const loc = JSON.parse(readFileSync(join(root, 'data/enka/locs.json'), 'utf8'))
const en = loc.en

// Enka's internal element names → the names players know.
const ELEMENTS = {
  Fire: 'Pyro',
  Water: 'Hydro',
  Wind: 'Anemo',
  Electric: 'Electro',
  Grass: 'Dendro',
  Ice: 'Cryo',
  Rock: 'Geo',
  None: 'None',
}

// Keys like "10000005-501" are skin variants of the Traveler; roster
// showcase ids are always plain numbers, so those variants never match.
// An entry with no element and no name hash is an unreleased placeholder;
// skipping it beats shipping a nameless id.
const slim = {}
for (const [id, c] of Object.entries(characters)) {
  if (!/^\d+$/.test(id)) continue
  if (!c.Element && !c.NameTextMapHash) continue
  // The gi store prefixes icon keys with "/ui/" and ".png"; the app's
  // iconUrl adds both itself, so keep the bare key either way.
  const icon = (c.SideIconName ?? '')
    .replace(/^\/ui\//, '')
    .replace(/\.png$/, '')
  slim[id] = {
    name: en[c.NameTextMapHash] ?? id,
    element: ELEMENTS[c.Element] ?? 'None',
    icon,
    weaponType: c.WeaponType,
  }
}

mkdirSync(join(root, 'src/data'), { recursive: true })
writeFileSync(
  join(root, 'src/data/characters.json'),
  JSON.stringify(slim, null, 2) + '\n',
)

const count = Object.keys(slim).length
console.log(`Wrote src/data/characters.json with ${count} characters`)
