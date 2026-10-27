import type { ImportReport } from '../core/types'
import { useT } from '../i18n'

export function ImportSummary({ report }: { report: ImportReport }) {
  const t = useT()
  if (report.read === 0) return null
  const { discarded } = report
  return (
    <section className="panel summary">
      <div className="kpis">
        <div>
          <strong>{report.valid}</strong>
          <span>{t.summary.valid}</span>
        </div>
        <div>
          <strong>{report.read}</strong>
          <span>{t.summary.read}</span>
        </div>
      </div>
      <ul className="muted small">
        {discarded['sin-jugadas'] > 0 && <li>{t.summary.noMoves(discarded['sin-jugadas'])}</li>}
        {discarded.duplicada > 0 && <li>{t.summary.duplicates(discarded.duplicada)}</li>}
        {discarded['posicion-inicial'] > 0 && <li>{t.summary.nonStandard(discarded['posicion-inicial'])}</li>}
      </ul>
      {report.warnings.length > 0 && (
        <details className="small">
          <summary>{t.summary.truncated(report.warnings.length)}</summary>
          <ul>
            {report.warnings.map((w, i) => (
              <li key={i}>
                <b>
                  {w.white} – {w.black}
                </b>{' '}
                ({w.source}): {t.summary.invalidMove(w.warning.token, w.warning.move, w.warning.kept)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
