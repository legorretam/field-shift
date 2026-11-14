import { cropLabel, cropMeta, formatCoord, segClass } from '../lib.js'
import { ArrowIcon, CheckIcon } from './Icons.jsx'

const PRIORITIES = [
  { key: 'water', label: 'Save water', hint: 'Crops that need less rain or irrigation', color: 'var(--rain)' },
  { key: 'soil', label: 'Rebuild soil', hint: 'Fewer bare months, more roots and organic matter', color: 'var(--legume)' },
  { key: 'income', label: 'Keep income steady', hint: 'A harvest you can sell nearby', color: 'var(--cereal)' },
]

const OFF_SEASON_IDS = new Set(['wheat', 'barley'])
const offSeasonFit = (c) => ['fallow', 'cover', 'legume', 'forage'].includes(c.group) || OFF_SEASON_IDS.has(c.id)

function CropPicker({ name, crops, value, onChange }) {
  return (
    <div className="crop-grid" role="radiogroup" aria-label={name}>
      {crops.map((c) => (
        <label className="crop-tile" key={c.id}>
          <input type="radio" name={name} value={c.id} checked={value === c.id} onChange={() => onChange(c.id)} />
          <span className={`crop-swatch ${segClass(c)}`} aria-hidden="true" />
          <span className="crop-tile-name">{cropLabel(c, c.id)}</span>
          <span className="crop-tile-meta">{cropMeta(c)}</span>
          <span className="crop-check" aria-hidden="true">
            <CheckIcon width="12" height="12" />
          </span>
        </label>
      ))}
    </div>
  )
}

export default function FarmForm({ point, crops, farm, onFarm, priorities, onPriorities, onSubmit }) {
  const mainOptions = crops.filter((c) => c.group !== 'fallow' && c.group !== 'cover')
  const offOptions = crops.filter(offSeasonFit)
  const total = priorities.water + priorities.soil + priorities.income || 1
  const share = (k) => Math.round((priorities[k] / total) * 100)

  return (
    <section className="form-screen screen">
      <div className="form-head">
        <p className="crumb">
          <strong>{point?.label || 'Your field'}</strong>, {formatCoord(point.lat, point.lon)}
        </p>
        <h1 className="display">What grows here now?</h1>
        <p className="lede">
          Your current rotation is the baseline. Every option we suggest is measured against it.
        </p>
      </div>

      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
      >
        <fieldset className="block">
          <legend className="block-title">Your rotation today</legend>
          <div className="season-label">
            <span className="field-label">Main season</span>
            <span className="muted">Spring to fall</span>
          </div>
          <CropPicker name="main-crop" crops={mainOptions} value={farm.main} onChange={(main) => onFarm({ ...farm, main })} />
          <div className="season-label">
            <span className="field-label">Rest of the year</span>
            <span className="muted">Fall to spring</span>
          </div>
          <CropPicker name="off-crop" crops={offOptions} value={farm.off} onChange={(off) => onFarm({ ...farm, off })} />
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
        </fieldset>

        <div className="form-actions">
          <button className="btn btn-primary btn-lg" type="submit" disabled={!crops.length}>
            Compare rotations
            <ArrowIcon className="arrow" />
          </button>
          <span className="note">Takes a few seconds while we read the NASA data.</span>
        </div>
      </form>
    </section>
  )
}
