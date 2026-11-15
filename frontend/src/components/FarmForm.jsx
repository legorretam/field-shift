import { useI18n } from '../i18n.jsx'
import { ArrowIcon } from './Icons.jsx'

const PRIORITIES = [
  { key: 'water', color: 'var(--rain)' },
  { key: 'soil', color: 'var(--legume)' },
  { key: 'income', color: 'var(--cereal)' },
]

const isNumber = (v) => v !== '' && v !== null && Number.isFinite(Number(v))

// Twelve months of this grid square's climate. Each month is a button: picking one
// sets the planting month and refills the numbers below.
function MonthStrip({ climate, month, onMonth }) {
  const { t, months: MONTHS, monthsLong } = useI18n()
  const rainMax = climate ? Math.max(...climate.rain, 1) : 1
  return (
    <div className="month-strip" role="group" aria-label={t('farm.monthGroup')}>
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
                ? t('farm.monthAria', { month: monthsLong[i], t: Math.round(temp), r: rain })
                : monthsLong[i]
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
  const { t } = useI18n()
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
          <span className="src-nasa">{t('farm.nasaAvg')}</span>
        ) : (
          <>
            <span>{t('farm.yours')}</span>
            {canReset && (
              <button type="button" className="link-btn" onClick={onReset}>
                {t('farm.useNasa')}
              </button>
            )}
          </>
        )}
      </span>
    </div>
  )
}

export default function FarmForm({ point, climate, conditions, onConditions, onResetField, priorities, onPriorities, onSubmit }) {
  const { t, cell, monthsLong } = useI18n()
  const total = priorities.water + priorities.soil + priorities.income
  const share = (k) => Math.round((priorities[k] / (total || 1)) * 100)
  const { month, temp, rain, source } = conditions
  const data = climate.data
  const ready = isNumber(temp) && isNumber(rain) && total > 0

  return (
    <section className="form-screen screen">
      <div className="form-head">
        <p className="crumb">
          <strong>{point?.label || t('farm.yourField')}</strong>, {t('farm.square', { c: cell(point) })}
        </p>
        <h1 className="display">{t('farm.title')}</h1>
        <p className="lede">{t('farm.lede')}</p>
      </div>

      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault()
          if (ready) onSubmit()
        }}
      >
        <fieldset className="block">
          <legend className="block-title">{t('farm.block')}</legend>

          <div className="season-label">
            <span className="field-label">{t('farm.month')}</span>
            <span className="muted">
              {climate.status === 'loading' && t('farm.loadingClimate')}
              {climate.status === 'ready' && t('farm.barsKey')}
            </span>
          </div>
          <MonthStrip climate={data} month={month} onMonth={(m) => onConditions({ month: m })} />

          <div className="num-row">
            <NumberField
              id="temp"
              label={t('farm.temp', { month: monthsLong[month - 1] })}
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
              label={t('farm.rain', { month: monthsLong[month - 1] })}
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
              ? t('farm.missing')
              : climate.status === 'error'
                ? t('farm.loadError')
                : t('farm.climateNote')}
          </p>
        </fieldset>

        <fieldset className="block">
          <legend className="block-title">{t('farm.matters')}</legend>
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
                  {t(`prio.${p.key}`)} <b>{share(p.key)}%</b>
                </span>
              ))}
            </div>
          </div>
          {PRIORITIES.map((p) => (
            <label className="slider" key={p.key}>
              <span className="slider-top">
                <span className="field-label">{t(`prio.${p.key}`)}</span>
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
              <span className="note" id={`hint-${p.key}`}>{t(`prio.${p.key}Hint`)}</span>
            </label>
          ))}
          {total === 0 && <p className="note note-warn">{t('farm.noWeight')}</p>}
        </fieldset>

        <div className="form-actions">
          <button className="btn btn-primary btn-lg" type="submit" disabled={!ready}>
            {t('farm.submit')}
            <ArrowIcon className="arrow" />
          </button>
          <span className="note">{t('farm.submitNote')}</span>
        </div>
      </form>
    </section>
  )
}
