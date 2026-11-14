import { formatCoord } from '../lib.js'

const PRIORITIES = [
  { key: 'water', label: 'Save water', hint: 'Crops that need less rain or irrigation' },
  { key: 'soil', label: 'Rebuild soil', hint: 'Less bare ground, more roots and organic matter' },
  { key: 'income', label: 'Keep income steady', hint: 'Crops with a harvest you can sell' },
]

export default function FarmForm({ point, crops, farm, onFarm, priorities, onPriorities, onSubmit }) {
  const mainOptions = crops.filter((c) => c.group !== 'fallow')
  const total = priorities.water + priorities.soil + priorities.income || 1

  return (
    <section className="form-screen">
      <div className="form-head">
        <p className="crumb">
          {point?.label || 'Selected field'} <span className="muted">({formatCoord(point.lat, point.lon)})</span>
        </p>
        <h1 className="display">Tell us about your farm</h1>
      </div>

      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
      >
        <fieldset className="block">
          <legend className="block-title">What do you grow now?</legend>
          <label className="field">
            <span className="field-label">Main season</span>
            <select value={farm.main} onChange={(e) => onFarm({ ...farm, main: e.target.value })}>
              {mainOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Rest of the year</span>
            <select value={farm.off} onChange={(e) => onFarm({ ...farm, off: e.target.value })}>
              {crops.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <p className="note">This becomes your current rotation, the baseline every option is compared with.</p>
        </fieldset>

        <fieldset className="block">
          <legend className="block-title">What matters most to you?</legend>
          {PRIORITIES.map((p) => (
            <label className="slider" key={p.key}>
              <span className="slider-top">
                <span className="field-label">{p.label}</span>
                <span className="slider-share">{Math.round((priorities[p.key] / total) * 100)}%</span>
              </span>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={priorities[p.key]}
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
          </button>
        </div>
      </form>
    </section>
  )
}
