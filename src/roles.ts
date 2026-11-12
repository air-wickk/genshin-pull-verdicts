// Per-character main role tags, keyed by the character name used in
// src/data/characters.json. The verdict engine matches these against the
// banner's roleTags (src/banners.json), so tuning the rules usually means
// editing this file.
//
// This is community-meta opinion, not gospel. Source it from KeqingMains
// guides when you tune it. Characters without an entry have unknown roles;
// the engine then declines to SKIP on their behalf rather than guess.

export type RoleTag = 'on-field DPS' | 'off-field DPS' | 'support' | 'healer' | 'shielder'

export const ROLES: Record<string, RoleTag[]> = {
  // --- Mondstadt / Liyue ---
  'Jean': ['healer'],
  'Kaeya': ['off-field DPS'],
  'Diluc': ['on-field DPS'],
  'Razor': ['on-field DPS'],
  'Amber': ['off-field DPS'],
  'Venti': ['support'],
  'Xiangling': ['off-field DPS'],
  'Beidou': ['off-field DPS'],
  'Xingqiu': ['off-field DPS'],
  'Ningguang': ['on-field DPS'],
  'Klee': ['on-field DPS'],
  'Zhongli': ['shielder', 'support'],
  'Fischl': ['off-field DPS'],
  'Bennett': ['support', 'healer'],
  'Tartaglia': ['on-field DPS'],
  'Noelle': ['on-field DPS', 'shielder', 'healer'],
  'Qiqi': ['healer'],
  'Chongyun': ['off-field DPS'],
  'Ganyu': ['on-field DPS'],
  'Albedo': ['off-field DPS'],
  'Diona': ['shielder', 'healer'],
  'Mona': ['support'],
  'Keqing': ['on-field DPS'],
  'Sucrose': ['support'],
  'Xinyan': ['off-field DPS'],
  'Rosaria': ['off-field DPS'],
  'Hu Tao': ['on-field DPS'],
  'Kaedehara Kazuha': ['support'],
  'Yanfei': ['on-field DPS'],
  'Yoimiya': ['on-field DPS'],
  'Thoma': ['shielder'],
  'Eula': ['on-field DPS'],

  // --- Inazuma ---
  'Raiden Shogun': ['off-field DPS', 'on-field DPS'],
  'Sayu': ['healer'],
  'Sangonomiya Kokomi': ['healer', 'support'],
  'Gorou': ['support'],
  'Kujou Sara': ['support'],
  'Arataki Itto': ['on-field DPS'],
  'Yae Miko': ['off-field DPS'],
  'Shikanoin Heizou': ['on-field DPS'],
  'Yelan': ['off-field DPS'],
  'Kuki Shinobu': ['healer'],
  'Kamisato Ayato': ['on-field DPS'],
  'Kamisato Ayaka': ['on-field DPS'],
  'Aloy': ['on-field DPS'],
  'Shenhe': ['support'],
  'Yun Jin': ['support'],
  'Kirara': ['shielder'],

  // --- Sumeru ---
  'Collei': ['off-field DPS'],
  'Dori': ['healer'],
  'Tighnari': ['on-field DPS'],
  'Nilou': ['on-field DPS'],
  'Cyno': ['on-field DPS'],
  'Candace': ['support'],
  'Nahida': ['off-field DPS'],
  'Layla': ['shielder'],
  'Wanderer': ['on-field DPS'],
  'Faruzan': ['support'],
  'Yaoyao': ['healer'],
  'Alhaitham': ['on-field DPS'],
  'Dehya': ['on-field DPS'],
  'Mika': ['support'],
  'Kaveh': ['on-field DPS'],
  'Baizhu': ['healer', 'shielder'],

  // --- Fontaine ---
  'Lynette': ['support'],
  'Lyney': ['on-field DPS'],
  'Freminet': ['on-field DPS'],
  'Wriothesley': ['on-field DPS'],
  'Neuvillette': ['on-field DPS'],
  'Charlotte': ['healer'],
  'Furina': ['off-field DPS'],
  'Chevreuse': ['support'],
  'Navia': ['on-field DPS'],
  'Gaming': ['on-field DPS'],
  'Xianyun': ['support'],
  'Chiori': ['off-field DPS'],
  'Sigewinne': ['healer'],
  'Arlecchino': ['on-field DPS'],
  'Sethos': ['on-field DPS'],
  'Clorinde': ['on-field DPS'],
  'Emilie': ['off-field DPS'],

  // --- Natlan and after ---
  'Kachina': ['support'],
  'Kinich': ['on-field DPS'],
  'Mualani': ['on-field DPS'],
  'Xilonen': ['support'],
  'Chasca': ['on-field DPS'],
  'Ororon': ['off-field DPS'],
  'Mavuika': ['on-field DPS'],
  'Citlali': ['support', 'shielder'],
  'Lan Yan': ['shielder'],
  'Yumemizuki Mizuki': ['healer'],
  'Iansan': ['support'],
  'Varesa': ['on-field DPS'],
  'Escoffier': ['healer'],
  'Ifa': ['healer'],
  'Skirk': ['on-field DPS'],
  'Dahlia': ['support'],
  'Ineffa': ['off-field DPS'],
  'Lauma': ['support'],
  'Flins': ['off-field DPS'],
  'Aino': ['support'],
  'Nefer': ['on-field DPS'],
  // Version 7.2 (not yet in the bundled data store; matches the manual
  // add-by-hand roster entries until the next data rebuild).
  'Mitya': ['on-field DPS', 'support'],
  'Valeriy': ['support'],
  // Phase 2 rerun characters also missing from the bundled store.
  'Zibai': ['on-field DPS'],
  'Linnea': ['off-field DPS', 'support', 'healer'],
  // Characters the data rebuild resolved from the Enka store; roles
  // per Prydwen/KQM/Mobalytics guides and HoYoverse's own role notes.
  'Columbina': ['off-field DPS', 'support'],
  'Illuga': ['support'],
  'Varka': ['on-field DPS'],
  'Lohen': ['on-field DPS'],
  'Nicole': ['support'],
  'Prune': ['off-field DPS', 'support'],
  'Sandrone': ['on-field DPS'],
  'Vodyanitsa': ['support', 'healer'],
  'Vesna': ['on-field DPS'],
  'Alyosha': ['support', 'healer'],
  'Odette': ['off-field DPS', 'support'],
}

export function getRoles(name: string): RoleTag[] | undefined {
  return ROLES[name]
}
