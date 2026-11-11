import { useEffect, useState } from 'react'
import type { ElementName, RosterCharacter } from './types'
import { CHARACTERS, RosterError, getRoster, iconUrl } from './api'
import { MOCK_BANNER, MOCK_VERDICT } from './mockData'

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

const DECISION_CLASS = {
  PULL: 'pull',
  SKIP: 'skip',
  LOVE: 'love',
} as const

const DECISION_LABEL = {
  PULL: 'PULL',
  SKIP: 'SKIP',
  LOVE: 'Only if you love them',
} as const

type Phase = 'uid' | 'loading' | 'roster' | 'manual' | 'verdict' | 'error'

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
}

function UidScreen({ onSubmit }: UidScreenProps) {
  const [uid, setUid] = useState('')

  return (
    <section className="screen screen-uid">
      <h1>Should you pull?</h1>
      <p className="intro">
        Enter your Genshin Impact UID. Pull Verdicts reads your public
        showcase, compares it against the current banner, and gives you a
        verdict — with the reasons.
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
          placeholder="UID, e.g. 700000001"
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
      <p className="quiet">Public showcase data only. Nothing to log in to.</p>
    </section>
  )
}

// ---------- Loading ----------

function LoadingScreen({ uid }: { uid: string }) {
  return (
    <section className="screen">
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
          </li>
        ))}
      </ul>
      <button type="button" className="primary" onClick={onConfirm}>
        Looks right — give me the verdict
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
        Done — use this roster
      </button>
    </section>
  )
}

// ---------- Verdict screen (mock until stage 5) ----------

interface VerdictScreenProps {
  roster: RosterCharacter[]
  banner: typeof MOCK_BANNER
  verdict: typeof MOCK_VERDICT
  onBack: () => void
}

function VerdictScreen({ roster, banner, verdict, onBack }: VerdictScreenProps) {
  const matching = roster.filter((character) => character.element === banner.element)
  return (
    <section className="screen">
      <button type="button" className="text" onClick={onBack}>
        ← Back to roster
      </button>
      <div className="banner-card">
        <span>
          <strong>{banner.character}</strong>{' '}
          <span className="quiet">{banner.element}</span>
        </span>
        <span className="quiet">ends {banner.endDate}</span>
      </div>
      <div className="verdict-card">
        <p className={`verdict-word ${DECISION_CLASS[verdict.decision]}`}>
          {DECISION_LABEL[verdict.decision]}
        </p>
        <p className="verdict-character">{banner.character}</p>
        <ul className="reasons">
          {verdict.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        <details className="why">
          <summary>Why this verdict</summary>
          <ul>
            {matching.length > 0 ? (
              matching.map((character) => (
                <li key={character.id}>
                  {character.name} — Lv. {character.level}, C
                  {character.constellation}, {character.element}
                </li>
              ))
            ) : (
              <li>No {banner.element} characters on your roster yet.</li>
            )}
          </ul>
        </details>
      </div>
    </section>
  )
}

// ---------- App ----------

export default function App() {
  const [phase, setPhase] = useState<Phase>('uid')
  const [uid, setUid] = useState('')
  const [roster, setRoster] = useState<RosterCharacter[]>([])
  const [error, setError] = useState<RosterErrorState | null>(null)

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
      const enriched: RosterCharacter[] = characters.map((entry) => {
        const data = CHARACTERS[entry.id]
        return {
          id: entry.id,
          name: data?.name ?? entry.id,
          element: (data?.element ?? 'None') as ElementName,
          level: entry.level,
          constellation: entry.constellation,
        }
      })
      setRoster(enriched)
      saveRoster(targetUid, enriched)
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
      {phase === 'uid' && <UidScreen onSubmit={fetchRoster} />}
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
          banner={MOCK_BANNER}
          verdict={MOCK_VERDICT}
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
