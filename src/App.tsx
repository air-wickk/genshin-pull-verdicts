import { useState } from 'react'
import type { ElementName, RosterCharacter, Screen } from './types'
import { MOCK_BANNER, MOCK_ROSTER, MOCK_VERDICT } from './mockData'

const ELEMENT_COLORS: Record<ElementName, string> = {
  Pyro: 'var(--pyro)',
  Hydro: 'var(--hydro)',
  Anemo: 'var(--anemo)',
  Electro: 'var(--electro)',
  Dendro: 'var(--dendro)',
  Cryo: 'var(--cryo)',
  Geo: 'var(--geo)',
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

interface RosterScreenProps {
  uid: string
  roster: RosterCharacter[]
  onConfirm: () => void
  onBack: () => void
}

function RosterScreen({ uid, roster, onConfirm, onBack }: RosterScreenProps) {
  return (
    <section className="screen">
      <button type="button" className="text" onClick={onBack}>
        ← Change UID
      </button>
      <h1>Your showcase</h1>
      <p className="quiet">UID {uid}</p>
      <ul className="roster-grid">
        {roster.map((character) => (
          <li key={character.name} className="roster-card">
            <span className="name">{character.name}</span>
            <span className="roster-meta">
              <span
                className="element-dot"
                style={{ background: ELEMENT_COLORS[character.element] }}
                aria-label={character.element}
              />
              <span className="quiet">
                Lv. {character.level} · C{character.constellation}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <button type="button" className="primary" onClick={onConfirm}>
        Looks right — give me the verdict
      </button>
    </section>
  )
}

interface VerdictScreenProps {
  onBack: () => void
}

function VerdictScreen({ onBack }: VerdictScreenProps) {
  const verdict = MOCK_VERDICT
  const banner = MOCK_BANNER
  const roster = MOCK_ROSTER

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
            {roster
              .filter((character) => character.element === banner.element)
              .map((character) => (
                <li key={character.name}>
                  {character.name} — Lv. {character.level}, C
                  {character.constellation}, {character.element}
                </li>
              ))}
          </ul>
        </details>
      </div>
    </section>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('uid')
  const [uid, setUid] = useState('')
  const roster = MOCK_ROSTER

  return (
    <main className="app">
      {screen === 'uid' && (
        <UidScreen
          onSubmit={(submitted) => {
            setUid(submitted)
            setScreen('roster')
          }}
        />
      )}
      {screen === 'roster' && (
        <RosterScreen
          uid={uid}
          roster={roster}
          onConfirm={() => setScreen('verdict')}
          onBack={() => setScreen('uid')}
        />
      )}
      {screen === 'verdict' && (
        <VerdictScreen onBack={() => setScreen('roster')} />
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
