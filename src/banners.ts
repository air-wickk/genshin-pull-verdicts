// The hand-updated banner list (src/banners.json). Each game version
// runs two limited character banners per phase, so the file holds every
// banner of the current version and the app picks between them. All
// readers of banner data (the app, the share-page edge functions) go
// through here so dates and defaults have one source of truth.
import bannerData from './banners.json'
import type { Banner } from './types'

export const BANNERS = bannerData as Banner[]

// "Raiden Shogun" → "raiden-shogun", the slug used in share links.
export function bannerSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}

// "2026-11-24" becomes "Nov 24": ISO dates are for data, not for people.
export function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
}

function bannerStart(banner: Banner): number {
  return Date.parse(`${banner.startDate}T00:00:00`)
}

function bannerEnd(banner: Banner): number {
  return Date.parse(`${banner.endDate}T23:59:59`)
}

/** Has the banner's end date passed? The list is hand-updated, so this
 *  detects stale data and the UI says so plainly. */
export function bannerEnded(banner: Banner): boolean {
  return Date.now() > bannerEnd(banner)
}

/** 'starts Nov 24' before, 'ends Nov 24' during, 'ended Nov 24' after. */
export function bannerDateLabel(banner: Banner): string {
  const now = Date.now()
  if (now < bannerStart(banner)) return `starts ${formatDate(banner.startDate)}`
  if (bannerEnded(banner)) return `ended ${formatDate(banner.endDate)}`
  return `ends ${formatDate(banner.endDate)}`
}

/** The banner the site judges against by default: the one whose window
 *  contains today, else the next one to start, else the first in the file. */
export function activeBanner(list: Banner[] = BANNERS): Banner {
  const now = Date.now()
  return (
    list.find((banner) => bannerStart(banner) <= now && now <= bannerEnd(banner)) ??
    list
      .filter((banner) => bannerStart(banner) > now)
      .sort((a, b) => bannerStart(a) - bannerStart(b))[0] ??
    list[0]
  )
}

/** Pick a banner by URL slug (e.g. "?b=furina" or "?b=mitya"); an absent
 *  or unknown slug falls back to the active one. The share pages use
 *  this so the preview card matches the banner the sharer judged. */
export function bannerBySlug(
  slug: string | null | undefined,
  list: Banner[] = BANNERS,
): Banner {
  if (slug) {
    const wanted = slug.toLowerCase()
    const found = list.find((banner) => bannerSlug(banner.character) === wanted)
    if (found) return found
  }
  return activeBanner(list)
}
