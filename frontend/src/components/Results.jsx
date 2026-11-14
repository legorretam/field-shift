import { useMemo, useRef, useState } from 'react'
import { MONTHS, SCORE_KEYS, cropLabel, fitScore, formatCoord, seasonPieces, segClass } from '../lib.js'
import StrategyDetail from './StrategyDetail.jsx'

const GROUP_LABELS = {
  cereal: 'Cereal',
  sorghum: 'Sorghum',
  legume: 'Legume, fixes nitrogen',
  cover: 'Cover crop',
  forage: 'Forage',
  fiber: 'Fiber',
  fallow: 'Bare soil',
}

export default function Results({ status, error, result, point, sample, crops, priorities, onRetry, onEdit }) {
  // In sample mode the data belongs to the sample's place, so the page is titled with it.
  const label = (sample ? result?.location?.label : point?.label) || result?.location?.label || 'Your field'

  if (status === 'loading') {
    return (
      <section className="results screen">
        <div className="loading" role="status">
          <span className="loading-strips" aria-hidden="true">
            <i /><i /><i />
          </span>
          <p className="lede">Reading twenty years of NASA climate data for {label}…</p>
        </div>
      </section>
    )
  }

  if (status === 'error' || !result) {
    return (
      <section className="results screen">
        <div className="error-panel" role="alert">
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

  return (
    <Loaded
      result={result}
      label={label}
      picked={sample ? point?.label : null}
      crops={crops}
      priorities={priorities}
      onEdit={onEdit}
    />
  )
}

function Loaded({ result, label, picked, crops, priorities, onEdit }) {
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
    <section className="results screen">
      {picked !== null && (
        <p className="sample-note" role="note">
          <span className="sample-note-dot" aria-hidden="true" />
          <span>
            <b>Sample data.</b> You picked {picked || 'a field'}. Until the live backend is connected, every
            result shows the built-in example for {label}.
          </span>
        </p>
      )}
      <header className="results-head">
        <div>
          <h1 className="display">{label}</h1>
          <p className="lede">
            {formatCoord(location.lat, location.lon)}. Climate is the 20-year average for {climate.period} from
            NASA POWER, over a cell about 55 km across.
          </p>
        </div>
        <button className="btn btn-quiet" onClick={onEdit}>Change farm details</button>
      </header>

      <FieldFacts result={result} cropById={cropById} />

      <div className="board-head">
        <div>
          <h2 className="h2">Your field’s year</h2>
          <p className="lede">
            Point at or tap any month to read it across the climate and all three rotations. With the
            keyboard, focus the board and use the arrow keys.
          </p>
        </div>
      </div>

      <p className="swipe-hint" aria-hidden="true">Swipe sideways for every month. Tap a month to read it.</p>

      <YearBoard
        climate={climate}
        strategies={strategies}
        cropById={cropById}
        fits={fits}
        bestId={bestId}
        selected={selected}
        onSelect={setSelected}
        place={label}
      />

      <StrategyDetail
        key={chosen.id}
        strategy={chosen}
        cropById={cropById}
        fit={fits[chosen.id]}
        isBest={chosen.id === bestId}
      />

      <footer className="results-foot">
        <p className="disclaimer">
          Field Shift shows options to explore. Your own judgment and a local agronomist decide what
          goes in the ground.
        </p>
        {result.sources?.length > 0 && (
          <ul className="sources">
            {result.sources.map((s) => (
              <li key={s.name}>
                <a href={s.url} target="_blank" rel="noreferrer">{s.name}</a>
                {s.note && <span className="muted">, {s.note.charAt(0).toLowerCase() + s.note.slice(1)}</span>}
              </li>
            ))}
          </ul>
        )}
      </footer>
    </section>
  )
}

function YearBoard({ climate, strategies, cropById, fits, bestId, selected, onSelect, place }) {
  const boardRef = useRef(null)
  const lastHover = useRef(0)
  const [hover, setHover] = useState(null)
  const [pinned, setPinned] = useState(null)
  const active = hover ?? pinned

  const months = [...climate.monthly].sort((a, b) => a.month - b.month)
  const frost = new Set(climate.frost_risk_months || [])
  const heat = new Set(climate.heat_stress_months || [])

  const tLo = Math.min(...months.map((m) => m.t_min_c)) - 4
  const tHi = Math.max(...months.map((m) => m.t_max_c)) + 4
  const tPos = (t) => ((t - tLo) / (tHi - tLo)) * 100
  const rainMax = Math.max(...months.map((m) => m.precip_mm), 1)
  const soil = months.map((m) => m.soil_moisture_root)
  const soilY = (v) => (1 - v) * 100
  const soilLine = soil.map((v, i) => `${((i + 0.5) / 12) * 100},${soilY(v)}`).join(' ')

  const groupsShown = [
    ...new Set(
      strategies.flatMap((s) =>
        s.sequence.map((q) => (q.crop === 'sorghum' ? 'sorghum' : cropById[q.crop]?.group || 'fallow')),
      ),
    ),
  ]

  function monthAt(clientX) {
    const heads = boardRef.current?.querySelectorAll('.month-head')
    if (!heads?.length) return null
    const first = heads[0].getBoundingClientRect()
    const last = heads[heads.length - 1].getBoundingClientRect()
    const i = Math.floor(((clientX - first.left) / (last.right - first.left)) * 12)
    return i >= 0 && i < 12 ? i : null
  }

  // Mouse reads on hover; touch and pen pin a month with a tap.
  function onPointerMove(e) {
    if (e.pointerType !== 'mouse') return
    const i = monthAt(e.clientX)
    if (i !== null) lastHover.current = i
    setHover(i)
  }
  function onPointerDown(e) {
    if (e.pointerType === 'mouse') return
    const i = monthAt(e.clientX)
    if (i === null) return
    lastHover.current = i
    setPinned((p) => (p === i ? null : i))
  }
  function onKeyDown(e) {
    if (e.target !== e.currentTarget) return
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
    if (step) {
      e.preventDefault()
      setPinned((p) => {
        const next = p === null ? (step > 0 ? 0 : 11) : (p + step + 12) % 12
        lastHover.current = next
        return next
      })
    } else if (e.key === 'Escape') setPinned(null)
  }

  const shown = active ?? lastHover.current
  const hm = months[shown]
  const on = (i) => (active === i ? ' is-on' : '')
  const flags = [frost.has(hm.month) && 'frost risk', heat.has(hm.month) && 'heat stress'].filter(Boolean)
  const spoken =
    active === null
      ? ''
      : `${MONTH_NAMES[shown]}: ${Math.round(hm.precip_mm)} millimeters of rain, ${Math.round(hm.t_min_c)} to ${Math.round(
          hm.t_max_c,
        )} degrees, soil moisture ${hm.soil_moisture_root.toFixed(2)}${flags.length ? `, ${flags.join(' and ')}` : ''}. ` +
        strategies
          .map((s) => `${s.name}: ${cropInMonth(s, shown, cropById)}`)
          .join('. ')

  return (
    <div
      className="board-scroll"
      tabIndex={0}
      role="group"
      aria-label={`Year board for ${place}. Use the left and right arrow keys to read each month.`}
      onKeyDown={onKeyDown}
    >
      <ClimateTable months={months} frost={frost} heat={heat} place={place} />
      <p className="sr-only" aria-live="polite">{spoken}</p>
      <div
        ref={boardRef}
        className="board"
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHover(null)}
        onPointerDown={onPointerDown}
        style={{ gridTemplateRows: `auto 112px 112px 92px auto repeat(${strategies.length}, auto)` }}
      >
        {months.map((m, i) => (
          <div
            key={`col-${m.month}`}
            className={`col${frost.has(m.month) ? ' col-frost' : heat.has(m.month) ? ' col-heat' : ''}${on(i)}`}
            style={{ gridColumn: i + 2 }}
            aria-hidden="true"
          />
        ))}

        <div className={`readout${active !== null ? ' is-on' : ''}`} style={{ '--m': shown }} aria-hidden="true">
          <strong>{MONTHS[shown]}</strong>
          <span>{Math.round(hm.precip_mm)} mm rain</span>
          <span>
            {Math.round(hm.t_min_c)} to {Math.round(hm.t_max_c)} °C
          </span>
          <span>soil {hm.soil_moisture_root.toFixed(2)}</span>
          {frost.has(hm.month) && <span className="flag flag-frost">Frost risk</span>}
          {heat.has(hm.month) && <span className="flag">Heat stress</span>}
        </div>

        {/* Month header */}
        <div className="cell head-cell" aria-hidden="true" style={{ gridRow: 1 }}>
          <span className="tint-key"><i className="sw sw-frost" />Frost risk</span>
          <span className="tint-key"><i className="sw sw-heat" />Heat stress</span>
        </div>
        {months.map((m, i) => (
          <div key={`h-${m.month}`} className={`cell month-head${on(i)}`} aria-hidden="true" style={{ gridRow: 1, gridColumn: i + 2 }}>
            {MONTHS[m.month - 1]}
          </div>
        ))}
        <div className="cell score-head" aria-hidden="true" style={{ gridRow: 1 }}>
          {SCORE_KEYS.map((k) => (
            <span key={k.key}>{k.label}</span>
          ))}
        </div>

        {/* Temperature */}
        <RowLabel row={2} title="Temperature" sub="°C, average low to high" />
        {months.map((m, i) => (
          <div key={`t-${m.month}`} className={`cell plot${on(i)}`} aria-hidden="true" style={{ gridRow: 2, gridColumn: i + 2, '--m': i }}>
            <span
              className="t-range"
              style={{ bottom: `${tPos(m.t_min_c)}%`, height: `${tPos(m.t_max_c) - tPos(m.t_min_c)}%` }}
            >
              <span className="t-hi">{Math.round(m.t_max_c)}</span>
              <span className="t-lo">{Math.round(m.t_min_c)}</span>
            </span>
          </div>
        ))}
        <div className="cell row-end" style={{ gridRow: 2 }} />

        {/* Rain */}
        <RowLabel row={3} title="Rain" sub="mm per month" />
        {months.map((m, i) => (
          <div key={`r-${m.month}`} className={`cell plot${on(i)}`} aria-hidden="true" style={{ gridRow: 3, gridColumn: i + 2, '--m': i }}>
            <span className="rain-bar" style={{ height: `${Math.max((m.precip_mm / rainMax) * 78, 2)}%` }}>
              <span className="rain-val">{Math.round(m.precip_mm)}</span>
            </span>
          </div>
        ))}
        <div className="cell row-end" style={{ gridRow: 3 }} />

        {/* Soil moisture */}
        <RowLabel
          row={4}
          title="Soil moisture"
          sub={`root zone, ${Math.min(...soil).toFixed(2)} to ${Math.max(...soil).toFixed(2)}`}
        />
        <div className="cell soil-plot" aria-hidden="true" style={{ gridRow: 4 }}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline points={soilLine} vectorEffect="non-scaling-stroke" />
          </svg>
          {soil.map((v, i) => (
            <span
              key={`s-${i}`}
              className={`soil-dot${on(i)}`}
              style={{ left: `${((i + 0.5) / 12) * 100}%`, top: `${soilY(v)}%`, '--m': i }}
            />
          ))}
        </div>
        <div className="cell row-end" style={{ gridRow: 4 }} />

        {/* Section header */}
        <div className="board-section" style={{ gridRow: 5 }}>
          <h3 className="h2">Three rotations to explore</h3>
          <ul className="crop-key">
            {groupsShown.map((g) => (
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
            style={{ gridRow: 6 + idx, '--row': idx }}
            aria-pressed={selected === s.id}
            aria-label={strategyLabel(s, fits[s.id], s.id === bestId, cropById)}
            onClick={() => onSelect(s.id)}
          >
            <span className="cell strat-label">
              <span className="strat-name">{s.name}</span>
              <span className="strat-tags">
                {s.is_current && <span className="tag tag-current">Today</span>}
                {s.id === bestId && <span className="tag tag-best">Best match</span>}
              </span>
              <span className="strat-fit">Match {fits[s.id]} of 100</span>
            </span>

            <span className="strip">
              {s.sequence.flatMap((q, qi) => {
                const crop = cropById[q.crop]
                const name = cropLabel(crop, q.crop)
                const pieces = seasonPieces(q.season)
                const widest = pieces.reduce((w, p, pi) => (p.span > pieces[w].span ? pi : w), 0)
                return pieces.map((p, pi) => {
                  const lit = active !== null && active >= p.start && active < p.start + p.span
                  return (
                    <span
                      key={`${qi}-${pi}`}
                      className={`seg ${segClass(crop, q.crop)}${lit ? ' is-on' : ''}`}
                      style={{ gridColumn: `${p.start + 1} / span ${p.span}` }}
                      title={`${name}, ${q.season}`}
                    >
                      {pi === widest && p.span >= 2 && <span className="seg-name">{name}</span>}
                    </span>
                  )
                })
              })}
            </span>

            <span className="cell strat-scores">
              {SCORE_KEYS.map((k) => {
                const best = Math.max(...strategies.map((x) => x.scores[k.key]))
                return (
                  <span
                    className={`meter${s.scores[k.key] === best ? ' is-best' : ''}`}
                    key={k.key}
                    title={`${k.label}: ${s.scores[k.key]} of 100`}
                  >
                    <span className="meter-num">{s.scores[k.key]}</span>
                    <span className="meter-track">
                      <span className="meter-fill" style={{ width: `${s.scores[k.key]}%` }} />
                    </span>
                  </span>
                )
              })}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function RowLabel({ row, title, sub }) {
  return (
    <div className="cell label-cell" style={{ gridRow: row }} aria-hidden="true">
      <span className="row-title">{title}</span>
      <span className="row-sub">{sub}</span>
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
      sub: 'yearly total',
      source: 'NASA POWER',
    })
    facts.push({
      key: 'temp',
      label: 'Temperature trend',
      value: `${signed(trend.t_mean_change_c_per_decade)} °C a decade`,
      sub: 'yearly average',
      source: 'NASA POWER',
    })
  }
  if (!facts.length) return null

  return (
    <dl className="facts">
      {facts.map((f, i) => (
        <div key={f.key} className={`fact${f.alert ? ' fact-alert' : ''}`} style={{ '--i': i }}>
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

const signed = (n) => (n > 0 ? `+${n}` : `${n}`).replace('-', '−')

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function cropInMonth(strategy, month, cropById) {
  for (const q of strategy.sequence) {
    if (seasonPieces(q.season).some((p) => month >= p.start && month < p.start + p.span)) {
      return cropLabel(cropById[q.crop], q.crop)
    }
  }
  return 'nothing planned'
}

function strategyLabel(s, fit, best, cropById) {
  const plan = s.sequence.map((q) => `${cropLabel(cropById[q.crop], q.crop)} ${q.season.replace('-', ' to ')}`).join(', then ')
  const scores = SCORE_KEYS.map((k) => `${k.label} ${s.scores[k.key]}`).join(', ')
  const tags = [s.is_current && 'your rotation today', best && 'best match for your priorities'].filter(Boolean)
  return `${s.name}${tags.length ? ` (${tags.join(', ')})` : ''}. ${plan}. Scores out of 100: ${scores}. Match ${fit} of 100.`
}

// The board as a real table, for screen readers.
function ClimateTable({ months, frost, heat, place }) {
  return (
    <table className="sr-only">
      <caption>Monthly climate averages for {place}</caption>
      <thead>
        <tr>
          <th scope="col">Month</th>
          <th scope="col">Rain, mm</th>
          <th scope="col">Low, °C</th>
          <th scope="col">High, °C</th>
          <th scope="col">Root-zone soil moisture</th>
          <th scope="col">Risk</th>
        </tr>
      </thead>
      <tbody>
        {months.map((m) => (
          <tr key={m.month}>
            <th scope="row">{MONTH_NAMES[m.month - 1]}</th>
            <td>{Math.round(m.precip_mm)}</td>
            <td>{Math.round(m.t_min_c)}</td>
            <td>{Math.round(m.t_max_c)}</td>
            <td>{m.soil_moisture_root.toFixed(2)}</td>
            <td>{[frost.has(m.month) && 'Frost', heat.has(m.month) && 'Heat'].filter(Boolean).join(', ') || 'None'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
