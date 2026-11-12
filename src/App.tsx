import { useEffect, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import type { Banner, ElementName, RosterCharacter, Verdict } from './types'
import { CHARACTERS, RosterError, getRoster, iconUrl } from './api'
import { DECISION_CLASS, DECISION_LABEL } from './labels'
import {
  BANNERS,
  bannerBySlug,
  bannerDateLabel,
  bannerEnded,
  bannerSlug,
  formatDate,
} from './banners'
import { verdict as computeVerdict } from './verdict'
import { bannerTier } from './tiers'
import { WishReveal } from './WishReveal'

// Canvas can't read CSS variables, so the element tint for the wish
// particles needs real hex values (mirrors the --element tokens).
const ELEMENT_HEX: Record<ElementName, string> = {
  Pyro: '#ef7938',
  Hydro: '#4cc2f1',
  Anemo: '#74c2a8',
  Electro: '#af8ec1',
  Dendro: '#a2c205',
  Cryo: '#9fd6e3',
  Geo: '#fab632',
  None: '#8f99ab',
}

// The wish reveal is motion for its own sake, so reduced-motion users
// never get it mounted at all.
const REDUCE_MOTION =
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// The burst color telegraphs the verdict the way wish colors telegraph
// rarity: gold means good news, cold blue means save your primogems.
const DECISION_FLASH: Record<keyof typeof DECISION_CLASS, string> = {
  PULL: '#f5c86b',
  SKIP: '#7fa8c9',
  LOVE: '#f0a840',
}

const ELEMENT_COLORS: Record<ElementName, string> = {
  Pyro: 'var(--pyro)',
  Hydro: 'var(--hydro)',
  Anemo: 'var(--anemo)',
  Electro: 'var(--electro)',
  Dendro: 'var(--dendro)',
  Cryo: 'var(--cryo)',
  Geo: 'var(--geo)',
  None: 'var(--quiet)',
}

type Phase = 'uid' | 'loading' | 'roster' | 'manual' | 'verdict' | 'error'

// Art URLs. The banner character can be newer than the bundled data store
// (see src/banners.json), so these are name-based. Enka's CDN keys art by
// the name with spaces removed. Splash art exists for newer characters
// only; callers must fall back to the side icon (always present).
function splashUrl(name: string): string {
  return `https://enka.network/ui/UI_Gacha_AvatarImg_${name.replace(/\s+/g, '')}.png`
}

function sideIconUrl(name: string): string {
  return `https://enka.network/ui/UI_AvatarIcon_${name.replace(/\s+/g, '')}.png`
}

// "2026-11-24" becomes "Nov 24": ISO dates are for data, not for people.
// (formatDate and the date labels live in src/banners.ts, shared with the
// share-page edge functions.)

function StaleBannerNote({ banner }: { banner: Banner }) {
  if (!bannerEnded(banner)) return null
  return (
    <p className="quiet stale-note">
      This banner ended {formatDate(banner.endDate)}. The banner list is
      hand-updated, so a new one may already be live in game.
    </p>
  )
}

interface RosterErrorState {
  kind: 'private' | 'rate-limited' | 'network'
}

const STORAGE_KEY = 'pull-verdicts:last-roster'

interface SavedRoster {
  uid: string
  roster: RosterCharacter[]
}

function loadSaved(): SavedRoster | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedRoster
    if (parsed.uid && Array.isArray(parsed.roster)) return parsed
    return null
  } catch {
    return null
  }
}

function saveRoster(uid: string, roster: RosterCharacter[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ uid, roster }))
  } catch {
    // Private browsing or full storage: the app still works without memory.
  }
}

// ---------- UID screen ----------

interface UidScreenProps {
  onSubmit: (uid: string) => void
  banner: Banner
  banners: Banner[]
  onSelectBanner: (character: string) => void
}

function UidScreen({ onSubmit, banner, banners, onSelectBanner }: UidScreenProps) {
  const [uid, setUid] = useState('')
  const consensus = bannerTier(banner)

  return (
    <section className="screen screen-uid">
      <h1 className="hero">Should you pull?</h1>
      <select
        className="banner-select"
        value={banner.character}
        onChange={(event) => onSelectBanner(event.target.value)}
        aria-label="Banner to judge against"
      >
        {banners.map((option) => (
          <option key={option.character} value={option.character}>
            {option.character} ({formatDate(option.startDate)} to{' '}
            {formatDate(option.endDate)})
          </option>
        ))}
      </select>
      <div
        className="banner-card"
        style={{ borderLeft: `3px solid ${ELEMENT_COLORS[banner.element]}` }}
      >
        <span>
          <strong>{banner.character}</strong>{' '}
          <span className="quiet">
            {banner.element} · {banner.weaponType.toLowerCase()}
          </span>
          {banner.bannerName && (
            <span className="banner-name">{banner.bannerName}</span>
          )}
          {consensus && (
            <span className="banner-tier">Prydwen: {consensus}</span>
          )}
        </span>
        <span className="quiet">{bannerDateLabel(banner)}</span>
      </div>
      <StaleBannerNote banner={banner} />
      <p className="art-caption">
        Pull Verdicts reads your public showcase, compares it against the
        current banner, and gives you a verdict, with the reasons.
      </p>
      <form
        className="field"
        onSubmit={(event) => {
          event.preventDefault()
          if (uid.trim()) onSubmit(uid.trim())
        }}
      >
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]{9}"
          placeholder="Your 9-digit UID"
          value={uid}
          onChange={(event) =>
            setUid(event.target.value.replace(/[^0-9]/g, '').slice(0, 9))
          }
          aria-label="Genshin Impact UID"
        />
        <button type="submit" className="primary" disabled={uid.length !== 9}>
          Check my roster
        </button>
      </form>
      <p className="quiet">Public showcase data only.</p>
    </section>
  )
}

// ---------- Loading ----------

function LoadingScreen({ uid }: { uid: string }) {
  return (
    <section className="screen">
      <span className="load-star" aria-hidden="true">
        ✦
      </span>
      <p className="quiet">Reading showcase for UID {uid}…</p>
      <ul className="roster-grid" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="roster-card">
            <div className="skeleton skeleton-icon" />
            <div className="skeleton skeleton-line" />
          </li>
        ))}
      </ul>
    </section>
  )
}

// ---------- Error screens ----------

const ERROR_COPY: Record<RosterErrorState['kind'], { title: string; body: string }> = {
  'private': {
    title: 'Showcase is private or empty',
    body: 'The showcase for this UID is either hidden or has no characters on it. You can add your characters by hand instead.',
  },
  'rate-limited': {
    title: 'Rate limited',
    body: 'Enka.Network needs a minute to cool down. Try again shortly.',
  },
  'network': {
    title: 'Something went wrong',
    body: 'Could not read the showcase right now. Check the UID and try again.',
  },
}

interface ErrorScreenProps {
  error: RosterErrorState
  onManual: () => void
  onRetry: () => void
  onBack: () => void
}

function ErrorScreen({ error, onManual, onRetry, onBack }: ErrorScreenProps) {
  const copy = ERROR_COPY[error.kind]
  return (
    <section className="screen">
      <button type="button" className="text" onClick={onBack}>
        ← Change UID
      </button>
      <h1>{copy.title}</h1>
      <p>{copy.body}</p>
      {error.kind === 'private' ? (
        <button type="button" className="primary" onClick={onManual}>
          Add characters by hand
        </button>
      ) : (
        <button type="button" className="primary" onClick={onRetry}>
          Try again
        </button>
      )}
    </section>
  )
}

// ---------- Roster screen ----------

function ConstellationPips({ count }: { count: number }) {
  return (
    <span className="pips" role="img" aria-label={`Constellation ${count}`}>
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className={i < count ? 'pip filled' : 'pip'}>
          ✦
        </span>
      ))}
    </span>
  )
}

interface RosterScreenProps {
  uid: string
  roster: RosterCharacter[]
  onConfirm: () => void
  onManual: () => void
  onBack: () => void
}

function RosterScreen({ uid, roster, onConfirm, onManual, onBack }: RosterScreenProps) {
  return (
    <section className="screen">
      <button type="button" className="text" onClick={onBack}>
        ← Change UID
      </button>
      <h1>Your showcase</h1>
      <p className="quiet">UID {uid}</p>
      <ul className="roster-grid">
        {roster.map((character) => (
          <li
            key={character.id}
            className="roster-card"
            style={{ '--element': ELEMENT_COLORS[character.element] } as React.CSSProperties}
          >
            <img
              className="roster-icon"
              src={iconUrl(character)}
              alt={`${character.name} icon`}
              width={48}
              height={48}
              loading="lazy"
            />
            <div>
              <div className="name">{character.name}</div>
              <div className="roster-meta">
                <span
                  className="element-dot"
                  style={{ background: ELEMENT_COLORS[character.element] }}
                  aria-hidden="true"
                />
                <span className="quiet">Lv. {character.level}</span>
                <ConstellationPips count={character.constellation} />
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className="quiet">
        {roster.length} characters ·{' '}
        {new Set(roster.map((character) => character.element)).size} elements
        covered
      </p>
      <p className="quiet showcase-note">
        Showcases hold up to 8 pinned characters. Anyone unpinned is
        invisible to public data, so pin your strongest characters in game
        or add them by hand.
      </p>
      <button type="button" className="primary" onClick={onConfirm}>
        Looks right, give me the verdict
      </button>
      <button type="button" className="text" onClick={onManual}>
        Missing someone? Add characters by hand
      </button>
    </section>
  )
}

// ---------- Manual fallback ----------

interface ManualScreenProps {
  uid: string
  roster: RosterCharacter[]
  onChange: (roster: RosterCharacter[]) => void
  onDone: () => void
  onBack: () => void
}

function ManualScreen({ uid, roster, onChange, onDone, onBack }: ManualScreenProps) {
  const [name, setName] = useState('')
  const [level, setLevel] = useState('90')
  const [constellation, setConstellation] = useState('0')

  const match = Object.entries(CHARACTERS).find(
    ([, data]) => data.name.toLowerCase() === name.trim().toLowerCase(),
  )

  const addCharacter = () => {
    if (!match) return
    const [id, data] = match
    const character: RosterCharacter = {
      id,
      name: data.name,
      element: data.element as ElementName,
      level: Math.min(Math.max(Number(level) || 1, 1), 90),
      constellation: Math.min(Math.max(Number(constellation) || 0, 0), 6),
    }
    if (!roster.some((existing) => existing.id === character.id)) {
      onChange([...roster, character])
    }
    setName('')
    setLevel('90')
    setConstellation('0')
  }

  return (
    <section className="screen">
      <button type="button" className="text" onClick={onBack}>
        ← Back
      </button>
      <h1>Add characters by hand</h1>
      <p className="quiet">
        UID {uid} · start typing a name, then add each character on your account.
      </p>
      <form
        className="field manual-form"
        onSubmit={(event) => {
          event.preventDefault()
          addCharacter()
        }}
      >
        <input
          type="text"
          list="character-names"
          placeholder="Character name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label="Character name"
        />
        <datalist id="character-names">
          {Object.values(CHARACTERS).map((data) => (
            <option key={data.name} value={data.name} />
          ))}
        </datalist>
        <div className="manual-row">
          <label>
            <span className="quiet">Level</span>
            <input
              type="text"
              inputMode="numeric"
              value={level}
              onChange={(event) =>
                setLevel(event.target.value.replace(/[^0-9]/g, '').slice(0, 2))
              }
              aria-label="Character level"
            />
          </label>
          <label>
            <span className="quiet">Constellation</span>
            <input
              type="text"
              inputMode="numeric"
              value={constellation}
              onChange={(event) =>
                setConstellation(event.target.value.replace(/[^0-9]/g, '').slice(0, 1))
              }
              aria-label="Constellation level"
            />
          </label>
          <button type="submit" className="primary" disabled={!match}>
            Add
          </button>
        </div>
      </form>
      {roster.length > 0 && (
        <ul className="roster-grid">
          {roster.map((character) => (
            <li key={character.id} className="roster-card">
              <img
                className="roster-icon"
                src={iconUrl(character)}
                alt={`${character.name} icon`}
                width={40}
                height={40}
                loading="lazy"
              />
              <div>
                <div className="name">{character.name}</div>
                <div className="roster-meta">
                  <span
                    className="element-dot"
                    style={{ background: ELEMENT_COLORS[character.element] }}
                    aria-label={character.element}
                  />
                  <span className="quiet">
                    Lv. {character.level} · C{character.constellation}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="remove"
                onClick={() =>
                  onChange(roster.filter((existing) => existing.id !== character.id))
                }
                aria-label={`Remove ${character.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="primary" onClick={onDone}>
        Done, use this roster
      </button>
    </section>
  )
}

// ---------- Verdict screen ----------

interface ShareCardProps {
  verdictResult: Verdict
  decisionClass: 'pull' | 'skip' | 'love'
  uid: string
  banner: Banner
}

function ShareCard({ verdictResult, decisionClass, uid, banner }: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [rendering, setRendering] = useState(false)
  const [failed, setFailed] = useState(false)
  // The rendered PNG, held open by the dialog. Null means closed.
  const [rendered, setRendered] = useState<{ dataUrl: string; blob: Blob } | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [linkState, setLinkState] = useState<'idle' | 'copied' | 'failed'>('idle')
  // Writing an image to the clipboard is a Chromium/Firefox thing; Safari
  // only got it recently. Hide the button where it cannot work.
  const canCopy =
    typeof ClipboardItem === 'function' && 'write' in navigator.clipboard

  const render = async () => {
    if (!cardRef.current) return
    setRendering(true)
    setFailed(false)
    try {
      const dataUrl = await toPng(cardRef.current, {
        width: 1200,
        height: 630,
        pixelRatio: 1,
      })
      const blob = await (await fetch(dataUrl)).blob()
      setCopyState('idle')
      setLinkState('idle')
      setRendered({ dataUrl, blob })
    } catch (error) {
      // Render failures were invisible before; keep the button state but
      // also say what actually went wrong in the console.
      console.warn('Share render failed:', error)
      setFailed(true)
    } finally {
      setRendering(false)
    }
  }

  // Escape closes the dialog, like any native sheet.
  useEffect(() => {
    if (!rendered) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setRendered(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rendered])

  // Opens the composer with the card's verdict pre-filled and a link to
  // the share page, whose Open Graph tags render the result as the
  // clickable preview card. The user edits the text before it posts, so
  // this is a draft, never an auto-post.
  const shareLink = `${window.location.origin}/share/${uid}?b=${bannerSlug(banner.character)}`

  const shareOnX = () => {
    if (!rendered) return
    const text = `Should I pull ${banner.character}? My verdict: ${DECISION_LABEL[verdictResult.decision]}. Check yours: ${shareLink}`
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  const copyImage = async () => {
    if (!rendered) return
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': rendered.blob }),
      ])
      setCopyState('copied')
    } catch (error) {
      console.warn('Clipboard write failed:', error)
      setCopyState('failed')
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setLinkState('copied')
    } catch (error) {
      console.warn('Clipboard write failed:', error)
      setLinkState('failed')
    }
  }

  const download = () => {
    if (!rendered) return
    const filename = `pull-verdicts-${banner.character.toLowerCase().replace(/\s+/g, '-')}.png`
    const link = document.createElement('a')
    link.download = filename
    link.href = rendered.dataUrl
    link.click()
  }

  return (
    <>
      <button type="button" className="primary" onClick={render} disabled={rendering}>
        {rendering ? 'Rendering…' : failed ? 'Rendering failed, try again' : 'Share verdict'}
      </button>
      {rendered && (
        <div
          className="share-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Share your verdict"
          onClick={() => setRendered(null)}
        >
          <div className="share-dialog" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="share-close"
              aria-label="Close"
              onClick={() => setRendered(null)}
            >
              ✕
            </button>
            <img className="share-preview" src={rendered.dataUrl} alt="Verdict card preview" />
            <div className="share-actions">
              <button type="button" className="primary" onClick={shareOnX}>
                Post on X
              </button>
              {canCopy && (
                <button type="button" onClick={copyImage}>
                  {copyState === 'copied'
                    ? 'Copied ✓'
                    : copyState === 'failed'
                      ? 'Copy failed, try again'
                      : 'Copy image'}
                </button>
              )}
              <button type="button" onClick={copyLink}>
                {linkState === 'copied'
                  ? 'Link copied ✓'
                  : linkState === 'failed'
                    ? 'Copy failed, try again'
                    : 'Copy link'}
              </button>
              <button type="button" onClick={download}>
                Download
              </button>
            </div>
          </div>
        </div>
      )}
      {/* The staging wrapper holds the off-screen positioning. The rendered
          card inside it must position itself normally: html-to-image copies
          computed styles onto the clone, so a fixed -20000px card would be
          cloned off-canvas too and export a blank image. */}
      <div className="share-staging" aria-hidden="true">
        <div ref={cardRef} className={`share-card ${decisionClass}`}>
          <p className="share-kicker">Pull Verdicts</p>
          <img className="share-icon" src={sideIconUrl(banner.character)} alt="" crossOrigin="anonymous" />
          <p className={`share-word ${DECISION_CLASS[verdictResult.decision]}`}>
            {DECISION_LABEL[verdictResult.decision]}
          </p>
          <p className="share-character">
            ✦ {banner.character} · {banner.element} ✦
          </p>
          <p className="share-reason">{verdictResult.reasons[0]}</p>
        </div>
      </div>
    </>
  )
}

interface VerdictScreenProps {
  roster: RosterCharacter[]
  uid: string
  banner: Banner
  onBack: () => void
}

function CharacterArt({ banner }: { banner: Banner }) {
  // Splash art for newer characters; the side icon always exists.
  const [splashFailed, setSplashFailed] = useState(false)

  const src = splashFailed ? sideIconUrl(banner.character) : splashUrl(banner.character)

  return (
    <img
      className="character-art"
      src={src}
      alt={`${banner.character} art`}
      crossOrigin="anonymous"
      onError={() => setSplashFailed(true)}
    />
  )
}

function VerdictScreen({ roster, uid, banner, onBack }: VerdictScreenProps) {
  const verdictResult = useMemo(
    () => computeVerdict(roster, banner),
    [roster, banner],
  )
  const matching = roster.filter((character) => character.element === banner.element)
  const decisionClass = DECISION_CLASS[verdictResult.decision]
  const consensus = bannerTier(banner)

  return (
    <section className="screen screen-verdict">
      {!REDUCE_MOTION && (
        <WishReveal
          color={ELEMENT_HEX[banner.element]}
          flash={DECISION_FLASH[verdictResult.decision]}
          celebrate={verdictResult.decision !== 'SKIP'}
        />
      )}
      {!REDUCE_MOTION && (
        <div
          className="wish-flash"
          style={{ '--flash': DECISION_FLASH[verdictResult.decision] } as React.CSSProperties}
          aria-hidden="true"
        />
      )}
      <div className="astral" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <button type="button" className="text" onClick={onBack}>
        ← Back to roster
      </button>
      <CharacterArt banner={banner} />
      <div
        className="banner-card"
        style={{ borderLeft: `3px solid ${ELEMENT_COLORS[banner.element]}` }}
      >
        <span>
          <strong>{banner.character}</strong>{' '}
          <span className="quiet">
            {banner.element} · {banner.weaponType.toLowerCase()}
          </span>
          {banner.bannerName && (
            <span className="banner-name">{banner.bannerName}</span>
          )}
          {consensus && (
            <span className="banner-tier">Prydwen: {consensus}</span>
          )}
        </span>
        <span className="quiet">{bannerDateLabel(banner)}</span>
      </div>
      <StaleBannerNote banner={banner} />
      <div
        className={`verdict-card ${decisionClass}`}
        style={{ '--element': ELEMENT_COLORS[banner.element] } as React.CSSProperties}
      >
        <span className="sparkles" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
        <p className={`verdict-word ${decisionClass}`}>
          {DECISION_LABEL[verdictResult.decision]}
        </p>
        <p className="verdict-character">{banner.character}</p>
        <ul className="reasons">
          {verdictResult.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        <details className="why">
          <summary>Why this verdict</summary>
          <ul>
            {matching.length > 0 ? (
              matching.map((character) => (
                <li key={character.id}>
                  {character.name}, Lv. {character.level}, C
                  {character.constellation}, {character.element}
                </li>
              ))
            ) : (
              <li>No {banner.element} characters on your roster yet.</li>
            )}
          </ul>
        </details>
      </div>
      <ShareCard
        verdictResult={verdictResult}
        decisionClass={decisionClass}
        uid={uid}
        banner={banner}
      />
    </section>
  )
}

// ---------- App ----------

export default function App() {
  const [phase, setPhase] = useState<Phase>('uid')
  const [uid, setUid] = useState('')
  const [roster, setRoster] = useState<RosterCharacter[]>([])
  const [error, setError] = useState<RosterErrorState | null>(null)
  // The banner to judge against. A share link's "?b=furina" preselects;
  // otherwise the banner whose window contains today decides.
  const [banner, setBanner] = useState<Banner>(() =>
    bannerBySlug(new URLSearchParams(window.location.search).get('b')),
  )

  const selectBanner = (character: string) => {
    const found = BANNERS.find((option) => option.character === character)
    if (found) setBanner(found)
  }

  // Restore the last roster once, then let the user navigate freely.
  useEffect(() => {
    const saved = loadSaved()
    if (saved && saved.roster.length > 0) {
      setUid(saved.uid)
      setRoster(saved.roster)
      setPhase('roster')
    }
  }, [])

  const fetchRoster = async (targetUid: string) => {
    setUid(targetUid)
    setError(null)
    setPhase('loading')
    try {
      const characters = await getRoster(targetUid)
      setRoster(characters)
      saveRoster(targetUid, characters)
      setPhase('roster')
    } catch (caught) {
      setError({
        kind: caught instanceof RosterError ? caught.kind : 'network',
      })
      setPhase('error')
    }
  }

  return (
    <main className="app">
      <div className="bloom" aria-hidden="true" />
      <div className="shooting-stars" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      {phase === 'uid' && (
        <UidScreen
          onSubmit={fetchRoster}
          banner={banner}
          banners={BANNERS}
          onSelectBanner={selectBanner}
        />
      )}
      {phase === 'loading' && <LoadingScreen uid={uid} />}
      {phase === 'error' && error && (
        <ErrorScreen
          error={error}
          onManual={() => setPhase('manual')}
          onRetry={() => fetchRoster(uid)}
          onBack={() => setPhase('uid')}
        />
      )}
      {phase === 'roster' && (
        <RosterScreen
          uid={uid}
          roster={roster}
          onConfirm={() => setPhase('verdict')}
          onManual={() => setPhase('manual')}
          onBack={() => setPhase('uid')}
        />
      )}
      {phase === 'manual' && (
        <ManualScreen
          uid={uid}
          roster={roster}
          onChange={(next) => {
            setRoster(next)
            saveRoster(uid, next)
          }}
          onDone={() => setPhase('verdict')}
          onBack={() => setPhase(roster.length > 0 ? 'roster' : 'uid')}
        />
      )}
      {phase === 'verdict' && (
        <VerdictScreen
          roster={roster}
          uid={uid}
          banner={banner}
          onBack={() => setPhase('roster')}
        />
      )}
      <footer className="footnote">
        <p className="quiet">
          Pull Verdicts · not affiliated with HoYoverse · verdicts are opinions,
          reasons included
        </p>
      </footer>
    </main>
  )
}
