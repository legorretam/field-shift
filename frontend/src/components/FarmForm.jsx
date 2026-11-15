import { MONTHS, formatCell } from '../lib.js'
import { ArrowIcon } from './Icons.jsx'

const PRIORITIES = [
  { key: 'water', label: 'Save water', hint: 'Crops that need less rain or irrigation', color: 'var(--rain)' },
  { key: 'soil', label: 'Rebuild soil', hint: 'Fewer bare months, more roots and organic matter', color: 'var(--legume)' },
  { key: 'income', label: 'Keep income steady', hint: 'A harvest you can sell nearby', color: 'var(--cereal)' },
]

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const isNumber = (v) => v !== '' && v !== null && Number.isFinite(Number(v))

// Twelve months of this grid square's climate. Each month is a button: picking one
// sets the planting month and refills the numbers below.
function MonthStrip({ climate, month, onMonth }) {
  const rainMax = climate ? Math.max(...climate.rain, 1) : 1
  return (
    <div className="month-strip" role="group" aria-label="Planting month">
      {MONTHS.map((m, i) => {
        const n = i + 1
        const rain = climate?.rain[i]
        const temp = climate?.temp[i]
        return (
          <button
            type="button"
            key={m}
            className="month-pick"
            aria-pressed={month === n}
            aria-label={
              climate
                ? `${MONTH_NAMES[i]}: ${Math.round(temp)} degrees and ${rain} millimeters of rain on average`
                : MONTH_NAMES[i]
            }
            onClick={() => onMonth(n)}
          >
            <span className="month-bar" aria-hidden="true">
              {climate && <span style={{ height: `${Math.max((rain / rainMax) * 100, 3)}%` }} />}
            </span>
            <span className="month-temp" aria-hidden="true">{climate ? `${Math.round(temp)}°` : ''}</span>
            <span className="month-name" aria-hidden="true">{m}</span>
          </button>
        )
      })}
    </div>
  )
}

function NumberField({ id, label, unit, value, fromNasa, canReset, onChange, onReset, step }) {
  return (
    <div className="num-field">
      <label className="field-label" htmlFor={id}>{label}</label>
      <div className="num-input">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={`${id}-src`}
          required
        />
        <span className="num-unit" aria-hidden="true">{unit}</span>
      </div>
      <span className="num-source" id={`${id}-src`}>
        {fromNasa ? (
          <span className="src-nasa">NASA POWER average</span>
        ) : (
          <>
            <span>Your value</span>
            {canReset && (
              <button type="button" className="link-btn" onClick={onReset}>
                Use NASA average
              </button>
            )}
          </>
        )}
      </span>
    </div>
  )
}

export default function FarmForm({ point, climate, conditions, onConditions, onResetField, priorities, onPriorities, onSubmit }) {
  const total = priorities.water + priorities.soil + priorities.income
  const share = (k) => Math.round((priorities[k] / (total || 1)) * 100)
  const { month, temp, rain, source } = conditions
  const data = climate.data
  const ready = isNumber(temp) && isNumber(rain) && total > 0

  return (
    <section className="form-screen screen">
      <div className="form-head">
        <p className="crumb">
          <strong>{point?.label || 'Your field'}</strong>, grid square at {formatCell(point)}
        </p>
        <h1 className="display">When are you planting?</h1>
        <p className="lede">
          We filled in this square’s usual weather from NASA POWER. If this season is running warmer, colder,
          wetter or drier, change the numbers.
        </p>
      </div>

      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault()
          if (ready) onSubmit()
        }}
      >
        <fieldset className="block">
          <legend className="block-title">Planting month and weather</legend>

          <div className="season-label">
            <span className="field-label">Month</span>
            <span className="muted">
              {climate.status === 'loading' && 'Loading NASA climate…'}
              {climate.status === 'ready' && 'Bars: rain per month. Numbers: average °C'}
            </span>
          </div>
          <MonthStrip climate={data} month={month} onMonth={(m) => onConditions({ month: m })} />

          <div className="num-row">
            <NumberField
              id="temp"
              label={`Average temperature in ${MONTH_NAMES[month - 1]}`}
              unit="°C"
              step="0.1"
              value={temp}
              fromNasa={source.temp === 'nasa'}
              canReset={!!data}
              onChange={(v) => onConditions({ temp: v })}
              onReset={() => onResetField('temp')}
            />
            <NumberField
              id="rain"
              label={`Rain in ${MONTH_NAMES[month - 1]}`}
              unit="mm"
              step="1"
              value={rain}
              fromNasa={source.rain === 'nasa'}
              canReset={!!data}
              onChange={(v) => onConditions({ rain: v })}
              onReset={() => onResetField('rain')}
            />
          </div>

          <p className="note">
            {climate.status === 'missing'
              ? 'NASA POWER has no climate for this square in our file. Type the values you expect.'
              : climate.status === 'error'
                ? 'The NASA climate file did not load. Type the values you expect, or reload the page.'
                : 'Averages for 2001 to 2025 over a grid square about 55 km across, from NASA POWER (MERRA-2).'}
          </p>
        </fieldset>

        <fieldset className="block">
          <legend className="block-title">What matters most to you?</legend>
          <div className="mix" aria-hidden="true">
            <div className="mix-bar">
              {PRIORITIES.map((p) => (
                <span key={p.key} style={{ flexGrow: priorities[p.key] || 0.001, background: p.color }} />
              ))}
            </div>
            <div className="mix-legend">
              {PRIORITIES.map((p) => (
                <span key={p.key}>
                  <i className="dot" style={{ background: p.color }} />
                  {p.label} <b>{share(p.key)}%</b>
                </span>
              ))}
            </div>
          </div>
          {PRIORITIES.map((p) => (
            <label className="slider" key={p.key}>
              <span className="slider-top">
                <span className="field-label">{p.label}</span>
                <span className="slider-share">{share(p.key)}%</span>
              </span>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={priorities[p.key]}
                style={{ '--pct': `${priorities[p.key]}%`, '--c': p.color }}
                onChange={(e) => onPriorities({ ...priorities, [p.key]: Number(e.target.value) })}
                aria-describedby={`hint-${p.key}`}
              />
              <span className="note" id={`hint-${p.key}`}>{p.hint}</span>
            </label>
          ))}
          {total === 0 && <p className="note note-warn">Give at least one priority some weight.</p>}
        </fieldset>

        <div className="form-actions">
          <button className="btn btn-primary btn-lg" type="submit" disabled={!ready}>
            Find crops for this field
            <ArrowIcon className="arrow" />
          </button>
          <span className="note">The crop model runs on our server and answers in a few seconds.</span>
        </div>
      </form>
    </section>
  )
}
