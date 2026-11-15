import { useEffect, useMemo, useState } from 'react'
import { formatCell } from '../lib.js'
import { shapeResult } from '../model.js'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const SCORES = [
  { key: 'water', label: 'Water' },
  { key: 'soil', label: 'Soil' },
  { key: 'income', label: 'Income' },
]

export default function Results({ status, error, result, request, point, sample, onRetry, onEdit, onPickAgain }) {
  const label = point?.label || 'Your field'

  if (status === 'loading') return <Loading label={label} />

  if (status === 'outside') {
    return (
      <section className="results screen">
        <div className="error-panel" role="alert">
          <h1 className="h2">No crop data for this square</h1>
          <p>
            The crop model covers farmland in the lower 48 states. This grid square has no data, which usually
            means it is mostly water, city, or across the border.
          </p>
          <div className="row-actions">
            <button className="btn btn-primary" onClick={onPickAgain}>Pick another square</button>
            <button className="btn btn-quiet" onClick={onRetry}>Try again</button>
          </div>
        </div>
      </section>
    )
  }

  if (status === 'error' || !result) {
    return (
      <section className="results screen">
        <div className="error-panel" role="alert">
          <h1 className="h2">Results didn’t load</h1>
          <p>{error || 'The crop model sent nothing back.'}</p>
          <div className="row-actions">
            <button className="btn btn-primary" onClick={onRetry}>Try again</button>
            <button className="btn btn-quiet" onClick={onEdit}>Change details</button>
          </div>
        </div>
      </section>
    )
  }

  return <Loaded result={result} request={request} point={point} label={label} sample={sample} onEdit={onEdit} />
}

function Loading({ label }) {
  // Render's free plan sleeps; the first answer after a quiet spell is slow. Say so.
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 7000)
    return () => clearTimeout(t)
  }, [])
  return (
    <section className="results screen">
      <div className="loading" role="status">
        <span className="loading-strips" aria-hidden="true">
          <i /><i /><i />
        </span>
        <p className="lede">Running the crop model for {label}…</p>
        {slow && (
          <p className="note">
            The model server is waking up. The first answer after a quiet spell can take up to a minute.
          </p>
        )}
      </div>
    </section>
  )
}

function Loaded({ result, request, point, label, sample, onEdit }) {
  const { options, perennials } = useMemo(() => shapeResult(result), [result])
  const best = Object.fromEntries(SCORES.map((s) => [s.key, Math.max(...options.map((o) => o.scores[s.key] ?? 0))]))
  const w = request
  const weights = w.peso_agua + w.peso_suelo + w.peso_ingreso || 1
  const pct = (v) => Math.round((v / weights) * 100)

  return (
    <section className="results screen">
      {sample && (
        <p className="sample-note" role="note">
          <span className="sample-note-dot" aria-hidden="true" />
          <span>
            <b>Sample data.</b> The app is set to VITE_API_URL=sample, so every answer is the built-in example for a
            square in central Iowa in May, not the field you picked.
          </span>
        </p>
      )}

      <header className="results-head">
        <div>
          <h1 className="display">{label}</h1>
          <p className="lede">
            Planting in {MONTH_NAMES[w.mes - 1]}, at {fmt(w.temp_actual)} °C on average with {fmt(w.precip_actual)} mm
            of rain. Weighted {pct(w.peso_agua)}% water, {pct(w.peso_suelo)}% soil, {pct(w.peso_ingreso)}% income.
          </p>
        </div>
        <button className="btn btn-quiet" onClick={onEdit}>Change details</button>
      </header>

      <div className="section-head">
        <h2 className="h2">What to plant now</h2>
        <p className="note">
          Each crop scores 0 to 100 for this square, weighted by your priorities. Under it, the crops that fit best
          after it.
        </p>
      </div>

      <ol className="options">
        {options.map((o, i) => (
          <li className={`option${i === 0 ? ' is-top' : ''}`} key={o.id} style={{ '--i': i }}>
            <div className="option-main">
              <span className="option-rank" aria-hidden="true">{i + 1}</span>
              <div className="option-title">
                <h3 className="option-name">{o.crop}</h3>
                {i === 0 && <span className="tag tag-best">Best match</span>}
              </div>
              <div className="fit-ring fit-ring-sm" style={{ '--p': o.score }} role="img" aria-label={`Score ${o.score} of 100`}>
                <span>
                  <b>{o.score}</b>
                  <small>of 100</small>
                </span>
              </div>
              <Meters scores={o.scores} best={best} row={i} />
            </div>

            <div className="option-next">
              <h4 className="next-title">Then plant</h4>
              <ul className="next-list">
                {o.next.map((n, k) => (
                  <li className="next" key={k}>
                    <div className="next-top">
                      <span className="next-crop">{n.crop}</span>
                      <span className={`tag ${n.fit.best ? 'tag-fit' : 'tag-current'}`}>{n.fit.label}</span>
                      <span className="next-score" title="How well this crop follows the one before, 0 to 100">
                        {n.score}
                      </span>
                    </div>
                    <p className="next-when">{n.window}</p>
                    <p className="next-why">{n.why}</p>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>

      {perennials.length > 0 && (
        <section className="perennials">
          <div className="section-head">
            <h2 className="h2">Or switch to a perennial</h2>
            <p className="note">Orchards and berry plantings stay for years instead of rotating every season.</p>
          </div>
          <ul className="perennial-grid">
            {perennials.map((p, i) => (
              <li className="perennial" key={p.crop} style={{ '--i': i }}>
                <div className="perennial-top">
                  <h3 className="option-name">{p.crop}</h3>
                  <span className="perennial-score">
                    <b>{p.score}</b> of 100
                  </span>
                </div>
                <Meters scores={p.scores} row={i} />
                <dl className="perennial-facts">
                  <div>
                    <dt>Harvest</dt>
                    <dd>{p.harvest}</dd>
                  </div>
                  <div>
                    <dt>Care</dt>
                    <dd>{p.care}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="results-foot">
        <p className="disclaimer">
          Field Shift shows options to explore. Your own judgment and a local agronomist decide what goes in the
          ground.
        </p>
        <ul className="sources">
          <li>
            <a href="https://power.larc.nasa.gov/" target="_blank" rel="noreferrer">NASA POWER</a>
            <span className="muted">, climate averages 2001 to 2025 for {formatCell(point)}</span>
          </li>
          <li>Field Shift crop model, run on our server for each request</li>
        </ul>
      </footer>
    </section>
  )
}

function Meters({ scores, best, row }) {
  return (
    <div className="option-meters" style={{ '--row': row }}>
      {SCORES.map((s) => {
        const v = scores[s.key]
        return (
          <div className={`meter${best && v === best[s.key] ? ' is-best' : ''}`} key={s.key} title={`${s.label}: ${v} of 100`}>
            <span className="meter-label">{s.label}</span>
            <span className="meter-num">{v ?? '–'}</span>
            <span className="meter-track">
              <span className="meter-fill" style={{ width: `${v ?? 0}%` }} />
            </span>
          </div>
        )
      })}
    </div>
  )
}

const fmt = (n) => {
  const v = Number(n)
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}
