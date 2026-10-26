import type { ImportReport } from '../core/types'

export function ImportSummary({ report }: { report: ImportReport }) {
  if (report.read === 0) return null
  const { discarded } = report
  return (
    <section className="panel summary">
      <div className="kpis">
        <div>
          <strong>{report.valid}</strong>
          <span>partidas válidas</span>
        </div>
        <div>
          <strong>{report.read}</strong>
          <span>leídas</span>
        </div>
      </div>
      <ul className="muted small">
        {discarded['sin-jugadas'] > 0 && <li>{discarded['sin-jugadas']} sin jugadas (incomparecencias, byes)</li>}
        {discarded.duplicada > 0 && <li>{discarded.duplicada} duplicadas ignoradas</li>}
        {discarded['posicion-inicial'] > 0 && <li>{discarded['posicion-inicial']} desde posición no estándar</li>}
      </ul>
      {report.warnings.length > 0 && (
        <details className="small">
          <summary>{report.warnings.length} partidas con jugadas inválidas (truncadas)</summary>
          <ul>
            {report.warnings.map((w, i) => (
              <li key={i}>
                <b>
                  {w.white} – {w.black}
                </b>{' '}
                ({w.source}): {w.message}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
