// Generates src/data/characters.json from Enka.Network's raw data store
// (data/enka/characters.json + loc.json, fetched from
// github.com/EnkaNetwork/API-docs). Re-run after a game version adds
// characters:  node scripts/build-enka-data.mjs
//
// The raw files are large (they include skill descriptions in 17 languages),
// so the app bundles only what the roster screen needs: ~30KB of
// id → name, element, icon, weapon type.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const characters = JSON.parse(
  readFileSync(join(root, 'data/enka/characters.json'), 'utf8'),
)
const loc = JSON.parse(readFileSync(join(root, 'data/enka/loc.json'), 'utf8'))
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

const slim = {}
for (const [id, c] of Object.entries(characters)) {
  slim[id] = {
    name: en[c.NameTextMapHash] ?? id,
    element: ELEMENTS[c.Element] ?? 'None',
    icon: c.SideIconName,
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
