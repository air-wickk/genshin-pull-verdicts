// Decision → CSS class and human label, shared by the app (App.tsx) and
// the share-page edge functions (api/share/[uid].ts, api/share-og/[uid].ts),
// so the tweet card and the site always speak the same words.

export const DECISION_CLASS = {
  PULL: 'pull',
  SKIP: 'skip',
  LOVE: 'love',
} as const

export const DECISION_LABEL = {
  PULL: 'PULL',
  SKIP: 'SKIP',
  LOVE: 'Only if you love them',
} as const
