import { useEffect, useMemo, useState } from 'react'
import { shapeResult } from '../model.js'
import { useI18n } from '../i18n.jsx'

const SCORES = ['water', 'soil', 'income']

export default function Results({ status, error, result, request, point, sample, onRetry, onEdit, onPickAgain, onSources }) {
  const { t, cell } = useI18n()
  const label = point?.label || (point ? t('map.cellAt', { c: cell(point) }) : t('res.yourField'))

  if (status === 'loading') return <Loading label={label} />

  if (status === 'outside') {
    return (
      <section className="results screen">
        <div className="error-panel" role="alert">
          <h1 className="h2">{t('res.outsideTitle')}</h1>
          <p>{t('res.outsideBody')}</p>
          <div className="row-actions">
            <button className="btn btn-primary" onClick={onPickAgain}>{t('res.pickAgain')}</button>
            <button className="btn btn-quiet" onClick={onRetry}>{t('res.retry')}</button>
          </div>
        </div>
      </section>
    )
  }

  if (status === 'error' || !result) {
    return (
      <section className="results screen">
        <div className="error-panel" role="alert">
          <h1 className="h2">{t('res.errTitle')}</h1>
          <p>{error?.key ? t(error.key, error.vars) : error?.text || t('res.errEmpty')}</p>
          <div className="row-actions">
            <button className="btn btn-primary" onClick={onRetry}>{t('res.retry')}</button>
            <button className="btn btn-quiet" onClick={onEdit}>{t('res.edit')}</button>
          </div>
        </div>
      </section>
    )
  }

  return <Loaded result={result} request={request} point={point} label={label} sample={sample} onEdit={onEdit} onSources={onSources} />
}

function Loading({ label }) {
  const { t } = useI18n()
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
        <p className="lede">{t('res.loading', { place: label })}</p>
        {slow && <p className="note">{t('res.slow')}</p>}
      </div>
    </section>
  )
}

function Loaded({ result, request, point, label, sample, onEdit, onSources }) {
  const { t, lang, cell, monthsLong, fmtTemp, fmtRain } = useI18n()
  const { options, perennials } = useMemo(() => shapeResult(result, lang), [result, lang])
  const best = Object.fromEntries(SCORES.map((k) => [k, Math.max(...options.map((o) => o.scores[k] ?? 0))]))
  const w = request
  const weights = w.peso_agua + w.peso_suelo + w.peso_ingreso || 1
  const pct = (v) => Math.round((v / weights) * 100)
  const month = monthsLong[w.mes - 1]
  const Month = month.charAt(0).toUpperCase() + month.slice(1)
  const flagFor = (o) => monthFlag(o, w, weights)
  // 50 is the model's own line between "viable" and "not recommended".
  const low = options.length > 0 && options[0].score < 50
  const lowCold = low && flagFor(options[0]) === 'cold'

  return (
    <section className="results screen">
      {sample && (
        <p className="sample-note" role="note">
          <span className="sample-note-dot" aria-hidden="true" />
          <span>
            <b>{t('res.sampleBold')}</b> {t('res.sampleRest')}
          </span>
        </p>
      )}

      <header className="results-head">
        <div>
          <h1 className="display">{label}</h1>
          <p className="lede">
            {t('res.lede', {
              month,
              t: fmtTemp(Number(w.temp_actual)),
              r: fmtRain(Number(w.precip_actual)),
              w: pct(w.peso_agua),
              s: pct(w.peso_suelo),
              i: pct(w.peso_ingreso),
            })}
          </p>
        </div>
        <button className="btn btn-quiet" onClick={onEdit}>{t('res.edit')}</button>
      </header>

      <div className="section-head">
        <h2 className="h2">{t('res.nowTitle')}</h2>
        <p className="note">{t('res.nowNote')}</p>
      </div>

      {low && (
        <div className="low-note" role="note">
          <p className="low-title">{t('res.lowTitle', { month })}</p>
          <p>{lowCold ? t('res.lowCold', { Month }) : t('res.lowOther')}</p>
          <button type="button" className="btn btn-quiet" onClick={onEdit}>
            {t('res.tryMonth')}
          </button>
        </div>
      )}

      <ScoreKey />

      <ol className="options">
        {options.map((o, i) => (
          <li className={`option${i === 0 ? ' is-top' : ''}`} key={o.id} style={{ '--i': i }}>
            <div className="option-main">
              <span className="option-rank" aria-hidden="true">{i + 1}</span>
              <div className="option-title">
                <h3 className="option-name">{o.crop}</h3>
                {i === 0 && !low && <span className="tag tag-best">{t('res.best')}</span>}
              </div>
              <div className="option-score">
                <div className="fit-ring fit-ring-sm" style={{ '--p': o.score }} role="img" aria-label={t('score.ringAria', { n: o.score })}>
                  <span>
                    <b>{o.score}</b>
                    <small>{t('score.of100')}</small>
                  </span>
                </div>
                <span className="score-cap" aria-hidden="true">{t('score.overall')}</span>
                {flagFor(o) && (
                  <span className={`score-flag is-${flagFor(o)}`}>{t(`score.${flagFor(o)}`, { month })}</span>
                )}
              </div>
              <Meters scores={o.scores} best={best} row={i} />
            </div>

            <div className="option-next">
              <div className="next-head">
                <h4 className="next-title">{t('res.then')}</h4>
                <span className="next-head-score" aria-hidden="true">{t('score.follow')}</span>
              </div>
              <ul className="next-list">
                {o.next.map((n, k) => (
                  <li className="next" key={k}>
                    <div className="next-top">
                      <span className="next-crop">{n.crop}</span>
                      {/* Most pairings are the model's best kind; only the weaker ones get a label. */}
                      {!n.fit.best && <span className="tag tag-current">{n.fit.label}</span>}
                      <span className="next-score" title={t('score.keyFollow')}>
                        <span className="sr-only">{t('score.followAria', { n: n.score })}</span>
                        <span aria-hidden="true">{n.score}</span>
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
            <h2 className="h2">{t('res.perTitle')}</h2>
            <p className="note">{t('res.perNote')}</p>
          </div>
          <ul className="perennial-grid">
            {perennials.map((p, i) => (
              <li className="perennial" key={p.crop} style={{ '--i': i }}>
                <div className="perennial-top">
                  <h3 className="option-name">{p.crop}</h3>
                  <span className="perennial-score">
                    <span className="score-cap">{t('score.overall')}</span>
                    <span>
                      <b>{p.score}</b> {t('score.of100')}
                    </span>
                  </span>
                </div>
                <Meters scores={p.scores} row={i} />
                <dl className="perennial-facts">
                  <div>
                    <dt>{t('res.harvest')}</dt>
                    <dd>{p.harvest}</dd>
                  </div>
                  <div>
                    <dt>{t('res.care')}</dt>
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
          {t('res.disclaimer')}
        </p>
        <ul className="sources">
          <li>
            <a href="https://power.larc.nasa.gov/" target="_blank" rel="noreferrer">NASA POWER</a>
            <span className="muted">, {t('res.srcPower', { c: cell(point) })}</span>
          </li>
          <li>{t('res.srcModel')}</li>
          <li>
            <button type="button" className="link-btn" onClick={onSources}>
              {t('src.all')}
            </button>
          </li>
        </ul>
      </footer>
    </section>
  )
}

// The three scores behind the overall one, each 0 to 100.
function ScoreKey() {
  const { t } = useI18n()
  return (
    <section className="score-key" aria-labelledby="score-key-title">
      <h3 className="score-key-title" id="score-key-title">
        {t('score.keyTitle')}
        <span className="muted"> {t('score.scale')}</span>
      </h3>
      <dl>
        <div>
          <dt>
            <span className="key-ring" aria-hidden="true" />
            {t('score.overall')}
          </dt>
          <dd>{t('score.keyOverall')}</dd>
        </div>
        <div>
          <dt>
            <span className="key-bars" aria-hidden="true">
              <i /><i /><i />
            </span>
            {t('score.keyParts.title')}
          </dt>
          <dd>{t('score.keyParts')}</dd>
        </div>
        <div>
          <dt>
            <span className="key-num" aria-hidden="true">75</span>
            {t('score.follow')}
          </dt>
          <dd>{t('score.keyFollow')}</dd>
        </div>
      </dl>
    </section>
  )
}

function Meters({ scores, best, row }) {
  const { t } = useI18n()
  return (
    <div className="option-meters" style={{ '--row': row }}>
      {SCORES.map((k) => {
        const v = scores[k]
        const label = t(`score.${k}`)
        return (
          <div className={`meter${best && v === best[k] ? ' is-best' : ''}`} key={k} title={t('score.meter', { k: label, v })}>
            <span className="meter-label">{label}</span>
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

// The model weights the three scores by the farmer's priorities, subtracts up to 25
// points for heat stress, and cuts the result to 30% when the month is too cold for
// the crop to grow. The answer doesn't say which happened, so read it off the gap
// between the weighted scores and the overall score.
function monthFlag(o, w, weights) {
  const s = o.scores
  const expected = (w.peso_agua * s.water + w.peso_suelo * s.soil + w.peso_ingreso * s.income) / weights
  if (!(expected > 0)) return null
  if (o.score < expected * 0.5) return 'cold'
  if (expected - o.score >= 3) return 'heat'
  return null
}
