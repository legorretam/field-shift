import { useMemo, useState } from 'react'
import { MONTHS, SCORE_KEYS, cropLabel, fitScore, formatCoord, seasonPieces } from '../lib.js'
import StrategyDetail from './StrategyDetail.jsx'

const GROUP_LABELS = {
  cereal: 'Cereal',
  legume: 'Legume, fixes nitrogen',
  cover: 'Cover crop',
  forage: 'Forage',
  fiber: 'Fiber',
  fallow: 'Bare soil',
}

export default function Results({ status, error, result, point, crops, priorities, onRetry, onEdit }) {
  const label = point?.label || result?.location?.label || 'Your field'

  if (status === 'loading') {
    return (
      <section className="results">
        <div className="loading" role="status">
          <span className="loading-strips" aria-hidden="true">
            <i /><i /><i />
          </span>
          <p className="lede">Reading 20 years of NASA climate data for {label}…</p>
        </div>
      </section>
    )
  }

  if (status === 'error' || !result) {
    return (
      <section className="results">
        <div className="panel error-panel" role="alert">
          <h1 className="h2">Results didn’t load</h1>
          <p>{error || 'The analysis server sent nothing back.'}</p>
          <p className="note">
            Check that the backend is running at the address in VITE_API_URL, or leave it empty to use
            sample data.
          </p>
          <div className="row-actions">
            <button className="btn btn-primary" onClick={onRetry}>Try again</button>
            <button className="btn btn-quiet" onClick={onEdit}>Change farm details</button>
          </div>
        </div>
      </section>
    )
  }

  return <Loaded result={result} label={label} crops={crops} priorities={priorities} onEdit={onEdit} />
}

function Loaded({ result, label, crops, priorities, onEdit }) {
  const { climate, strategies, location } = result
  const fits = useMemo(
    () => Object.fromEntries(strategies.map((s) => [s.id, fitScore(s.scores, priorities)])),
    [strategies, priorities],
  )
  const bestId = strategies.reduce((best, s) => (fits[s.id] > fits[best] ? s.id : best), strategies[0].id)
  const [selected, setSelected] = useState(bestId)
  const chosen = strategies.find((s) => s.id === selected) || strategies[0]
  const cropById = useMemo(() => Object.fromEntries(crops.map((c) => [c.id, c])), [crops])

  return (
    <section className="results">
      <header className="results-head">
        <div>
          <h1 className="display">{label}</h1>
          <p className="lede">
            {formatCoord(location.lat, location.lon)}. Climate averages for {climate.period} from NASA
            POWER, over a cell about 55 km wide.
          </p>
        </div>
        <button className="btn btn-quiet" onClick={onEdit}>Change farm details</button>
      </header>

      <FieldFacts result={result} cropById={cropById} />

      <YearBoard
        climate={climate}
        strategies={strategies}
        cropById={cropById}
        fits={fits}
        bestId={bestId}
        selected={selected}
        onSelect={setSelected}
      />

      <StrategyDetail strategy={chosen} cropById={cropById} fit={fits[chosen.id]} isBest={chosen.id === bestId} />

      <footer className="results-foot">
        <p>
          This tool shows options to explore. It does not replace your own judgment or advice from a
          local agronomist.
        </p>
        {result.sources?.length > 0 && (
          <ul className="sources">
            {result.sources.map((s) => (
              <li key={s.name}>
                <a href={s.url} target="_blank" rel="noreferrer">{s.name}</a>
                {s.note && <span className="muted">: {s.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </footer>
    </section>
  )
}

function YearBoard({ climate, strategies, cropById, fits, bestId, selected, onSelect }) {
  const months = [...climate.monthly].sort((a, b) => a.month - b.month)
  const frost = new Set(climate.frost_risk_months || [])
  const heat = new Set(climate.heat_stress_months || [])

  const tLo = Math.min(...months.map((m) => m.t_min_c)) - 3
  const tHi = Math.max(...months.map((m) => m.t_max_c)) + 3
  const tPos = (t) => ((t - tLo) / (tHi - tLo)) * 100
  const rainMax = Math.max(...months.map((m) => m.precip_mm), 1)
  const soil = months.map((m) => m.soil_moisture_root)
  const soilY = (v) => (1 - v) * 100
  const soilLine = soil.map((v, i) => `${((i + 0.5) / 12) * 100},${soilY(v)}`).join(' ')

  const groupsShown = new Set(
    strategies.flatMap((s) => s.sequence.map((q) => cropById[q.crop]?.group || 'fallow')),
  )

  return (
    <div className="board-scroll">
      <div
        className="board"
        style={{ gridTemplateRows: `auto 104px 104px 88px auto repeat(${strategies.length}, auto)` }}
      >
        {months.map((m, i) =>
          frost.has(m.month) || heat.has(m.month) ? (
            <div
              key={`tint-${m.month}`}
              className={`tint ${frost.has(m.month) ? 'tint-frost' : 'tint-heat'}`}
              style={{ gridColumn: i + 2 }}
              aria-hidden="true"
            />
          ) : null,
        )}

        {/* Month header */}
        <div className="cell label-cell head-cell" style={{ gridRow: 1 }}>
          <span className="tint-key"><i className="sw sw-frost" />Frost risk</span>
          <span className="tint-key"><i className="sw sw-heat" />Heat stress</span>
        </div>
        {months.map((m, i) => (
          <div key={`h-${m.month}`} className="cell month-head" style={{ gridRow: 1, gridColumn: i + 2 }}>
            {MONTHS[m.month - 1]}
          </div>
        ))}
        <div className="cell score-head" style={{ gridRow: 1 }}>
          {SCORE_KEYS.map((k) => (
            <span key={k.key}>{k.label}</span>
          ))}
        </div>

        {/* Temperature */}
        <RowLabel row={2} title="Temperature" sub="°C, average low to high" />
        {months.map((m, i) => (
          <div key={`t-${m.month}`} className="cell plot" style={{ gridRow: 2, gridColumn: i + 2 }}>
            <span
              className="t-range"
              style={{ bottom: `${tPos(m.t_min_c)}%`, height: `${tPos(m.t_max_c) - tPos(m.t_min_c)}%` }}
              title={`${MONTHS[m.month - 1]}: ${m.t_min_c} to ${m.t_max_c} °C`}
            >
              <span className="t-hi">{Math.round(m.t_max_c)}</span>
              <span className="t-lo">{Math.round(m.t_min_c)}</span>
            </span>
          </div>
        ))}

        {/* Rain */}
        <RowLabel row={3} title="Rain" sub="mm per month" />
        {months.map((m, i) => (
          <div key={`r-${m.month}`} className="cell plot" style={{ gridRow: 3, gridColumn: i + 2 }}>
            <span
              className="rain-bar"
              style={{ height: `${Math.max((m.precip_mm / rainMax) * 82, 2)}%` }}
              title={`${MONTHS[m.month - 1]}: ${m.precip_mm} mm`}
            >
              <span className="rain-val">{Math.round(m.precip_mm)}</span>
            </span>
          </div>
        ))}

        {/* Soil moisture */}
        <RowLabel
          row={4}
          title="Soil moisture"
          sub={`root zone, ${Math.min(...soil).toFixed(2)} to ${Math.max(...soil).toFixed(2)}`}
        />
        <div className="cell soil-plot" style={{ gridRow: 4 }}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline points={soilLine} vectorEffect="non-scaling-stroke" />
          </svg>
          {soil.map((v, i) => (
            <span
              key={`s-${i}`}
              className="soil-dot"
              style={{ left: `${((i + 0.5) / 12) * 100}%`, top: `${soilY(v)}%` }}
              title={`${MONTHS[i]}: ${v.toFixed(2)}`}
            />
          ))}
        </div>

        {/* Section header */}
        <div className="board-section" style={{ gridRow: 5 }}>
          <h2 className="h2">Three rotations to explore</h2>
          <ul className="crop-key">
            {[...groupsShown].map((g) => (
              <li key={g}>
                <i className={`sw seg-${g}`} />
                {GROUP_LABELS[g] || g}
              </li>
            ))}
          </ul>
        </div>

        {/* Strategies */}
        {strategies.map((s, idx) => (
          <button
            key={s.id}
            className="strat"
            style={{ gridRow: 6 + idx }}
            aria-pressed={selected === s.id}
            onClick={() => onSelect(s.id)}
          >
            <span className="cell strat-label">
              <span className="strat-name">{s.name}</span>
              <span className="strat-tags">
                {s.is_current && <span className="tag tag-current">Today</span>}
                {s.id === bestId && <span className="tag tag-best">Best match</span>}
              </span>
              <span className="strat-fit">Match {fits[s.id]} / 100</span>
            </span>

            <span className="strip">
              {s.sequence.flatMap((q, qi) => {
                const crop = cropById[q.crop]
                const group = crop?.group || 'fallow'
                const name = cropLabel(crop, q.crop)
                const pieces = seasonPieces(q.season)
                const widest = pieces.reduce((w, p, pi) => (p.span > pieces[w].span ? pi : w), 0)
                return pieces.map((p, pi) => (
                  <span
                    key={`${qi}-${pi}`}
                    className={`seg seg-${group}`}
                    style={{ gridColumn: `${p.start + 1} / span ${p.span}` }}
                    title={`${name}, ${q.season}`}
                  >
                    {pi === widest && p.span >= 2 && <span className="seg-name">{name}</span>}
                  </span>
                ))
              })}
            </span>

            <span className="cell strat-scores">
              {SCORE_KEYS.map((k) => (
                <span className="meter" key={k.key} title={`${k.label}: ${s.scores[k.key]} / 100`}>
                  <span className="meter-num">{s.scores[k.key]}</span>
                  <span className="meter-track">
                    <span className="meter-fill" style={{ width: `${s.scores[k.key]}%` }} />
                  </span>
                </span>
              ))}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function FieldFacts({ result, cropById }) {
  const { soil, groundwater, cropland_history: history, climate } = result
  const trend = climate.trend
  const facts = []

  if (soil) {
    facts.push({
      key: 'soil',
      label: 'Soil',
      value: soil.texture,
      sub: [soil.organic_matter_pct != null && `${soil.organic_matter_pct}% organic matter`, soil.drainage?.toLowerCase()]
        .filter(Boolean)
        .join(', '),
      source: soil.source,
    })
  }
  if (groundwater?.trend_cm_per_year != null) {
    facts.push({
      key: 'gw',
      label: 'Groundwater',
      value: `${signed(groundwater.trend_cm_per_year)} cm a year`,
      sub: groundwater.since ? `trend since ${groundwater.since}` : 'regional trend',
      source: groundwater.source,
      alert: groundwater.trend_cm_per_year < 0,
    })
  }
  if (history?.length) {
    const counts = history.reduce((m, h) => ({ ...m, [h.crop]: (m[h.crop] || 0) + 1 }), {})
    const [top, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    facts.push({
      key: 'history',
      label: 'What grew here',
      value: cropLabel(cropById[top], top),
      sub: `in ${n} of the last ${history.length} years`,
      source: 'USDA CropScape',
    })
  }
  if (trend) {
    facts.push({
      key: 'rain',
      label: 'Rain trend',
      value: `${signed(trend.precip_change_pct_per_decade)}% a decade`,
      source: 'NASA POWER',
    })
    facts.push({
      key: 'temp',
      label: 'Temperature trend',
      value: `${signed(trend.t_mean_change_c_per_decade)} °C a decade`,
      source: 'NASA POWER',
    })
  }
  if (!facts.length) return null

  return (
    <dl className="facts">
      {facts.map((f) => (
        <div key={f.key} className={`fact${f.alert ? ' fact-alert' : ''}`}>
          <dt>{f.label}</dt>
          <dd>
            <span className="fact-value">{f.value}</span>
            {f.sub && <span className="fact-sub">{f.sub}</span>}
            <span className="fact-source">{f.source}</span>
          </dd>
        </div>
      ))}
    </dl>
  )
}

function RowLabel({ row, title, sub }) {
  return (
    <div className="cell label-cell" style={{ gridRow: row }}>
      <span className="row-title">{title}</span>
      <span className="row-sub">{sub}</span>
    </div>
  )
}

const signed = (n) => (n > 0 ? `+${n}` : `${n}`).replace('-', '−')
