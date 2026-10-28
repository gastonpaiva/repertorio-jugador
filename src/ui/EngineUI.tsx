import type { EngineStatus } from '../engine/hooks'
import { formatScore, whiteShare, type MoveMark, type Score } from '../engine/score'
import { useT } from '../i18n'

/** Barra vertical: la parte blanca crece con la ventaja de las blancas. */
export function EvalBar({ score, orientation }: { score: Score | null; orientation: 'w' | 'b' }) {
  const share = score ? whiteShare(score) : 50
  return (
    <div className={`eval-bar${orientation === 'b' ? ' flipped' : ''}`} aria-hidden="true">
      <div className="eval-white" style={{ height: `${share}%` }} />
      {score && <span className={`eval-label ${share >= 50 ? 'on-white' : 'on-black'}`}>{formatScore(score)}</span>}
    </div>
  )
}

export function EngineToggle({
  on,
  onChange,
  status,
  detail,
}: {
  on: boolean
  onChange: (on: boolean) => void
  status: EngineStatus
  /** Texto de avance (profundidad, posiciones analizadas) que reemplaza a "analizando…". */
  detail?: string
}) {
  const t = useT()
  return (
    <div className="engine-toggle">
      <label className="switch">
        <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} />
        <span className="slider" aria-hidden="true" />
        <span>{t.engine.name}</span>
      </label>
      <span className="muted small">
        {status === 'loading' && t.engine.loading}
        {status === 'running' && (detail ?? t.engine.analyzing)}
        {status === 'done' && detail}
        {status === 'error' && <span className="error">{t.engine.error}</span>}
      </span>
    </div>
  )
}

export function Mark({ mark }: { mark: MoveMark | null }) {
  const t = useT()
  if (!mark) return null
  const cls = mark === '??' ? 'blunder' : mark === '?' ? 'mistake' : 'inaccuracy'
  return (
    <span className={`mark ${cls}`} title={t.engine.marks[cls]}>
      {mark}
    </span>
  )
}
