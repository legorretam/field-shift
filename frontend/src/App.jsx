import { useEffect, useState } from 'react'
import { OutsideCoverageError, cellClimate, loadClimate, recommend, usingSample, wakeServer } from './api.js'
import FieldMap from './components/FieldMap.jsx'
import FarmForm from './components/FarmForm.jsx'
import Results from './components/Results.jsx'

const STEPS = [
  { id: 'field', label: 'Field' },
  { id: 'farm', label: 'Farm' },
  { id: 'compare', label: 'Compare' },
]

const NASA = { temp: 'nasa', rain: 'nasa' }

export default function App() {
  const [step, setStep] = useState('field')
  const [point, setPoint] = useState(null) // { lat, lon, label }
  const [climate, setClimate] = useState({ status: 'idle', data: null }) // data: { temp: [12], rain: [12] }
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [userValues, setUserValues] = useState({ temp: '', rain: '' })
  const [source, setSource] = useState(NASA) // per field: 'nasa' (autofilled) or 'user' (typed)
  const [priorities, setPriorities] = useState({ water: 50, soil: 30, income: 20 })
  const [request, setRequest] = useState(null)
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState('idle') // idle | loading | error | outside
  const [error, setError] = useState('')

  // Each step starts at the top of the page.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [step])

  // Wake the model server and fetch the climate table while the farmer looks at the map.
  useEffect(() => {
    wakeServer()
    loadClimate().catch(() => {})
  }, [])

  // A new field gets its own NASA averages; typed values belonged to the old one.
  const cellKey = point ? `${point.lat},${point.lon}` : null
  useEffect(() => {
    if (!point) return
    let live = true
    setSource(NASA)
    setClimate({ status: 'loading', data: null })
    cellClimate(point)
      .then((data) => live && setClimate({ status: data ? 'ready' : 'missing', data }))
      .catch(() => live && setClimate({ status: 'error', data: null }))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cellKey])

  // Autofilled fields always show the NASA average for the chosen month.
  const nasaValue = (k) => (climate.data ? climate.data[k][month - 1] : '')
  const value = (k) => (source[k] === 'nasa' && climate.data ? nasaValue(k) : userValues[k])
  const conditions = { month, temp: value('temp'), rain: value('rain'), source }

  function updateConditions(patch) {
    if (patch.month) setMonth(patch.month)
    for (const k of ['temp', 'rain']) {
      if (k in patch) {
        setUserValues((u) => ({ ...u, [k]: patch[k] }))
        setSource((s) => ({ ...s, [k]: 'user' }))
      }
    }
  }

  async function runAnalysis() {
    const body = {
      lat: point.lat,
      lon: point.lon,
      mes: month,
      temp_actual: Number(conditions.temp),
      precip_actual: Number(conditions.rain),
      peso_agua: priorities.water,
      peso_suelo: priorities.soil,
      peso_ingreso: priorities.income,
    }
    setStep('compare')
    setStatus('loading')
    setError('')
    setRequest(body)
    try {
      const data = await recommend(body)
      setResult(data)
      setStatus('idle')
    } catch (e) {
      setResult(null)
      setError(e.message)
      setStatus(e instanceof OutsideCoverageError ? 'outside' : 'error')
    }
  }

  const reached = { field: true, farm: !!point, compare: !!result || status !== 'idle' }

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Field Shift, start over">
          <span className="brand-mark" aria-hidden="true">
            <i /><i /><i />
            {/* A small blue flower growing at the end of the middle row. */}
            <svg className="brand-bloom" viewBox="0 0 20 20">
              <circle cx="10" cy="5" r="4.2" />
              <circle cx="14.76" cy="8.45" r="4.2" />
              <circle cx="12.94" cy="14.05" r="4.2" />
              <circle cx="7.06" cy="14.05" r="4.2" />
              <circle cx="5.24" cy="8.45" r="4.2" />
              <circle className="brand-bloom-eye" cx="10" cy="10" r="2.6" />
            </svg>
          </span>
          <span className="brand-word">Field Shift</span>
        </a>
        <nav className="steps" aria-label="Progress">
          <ol>
            {STEPS.map((s, i) => (
              <li key={s.id} className={reached[s.id] ? 'is-reached' : undefined}>
                <button
                  className="step"
                  aria-current={step === s.id ? 'step' : undefined}
                  disabled={!reached[s.id]}
                  onClick={() => setStep(s.id)}
                >
                  <span className="step-num">{i + 1}</span>
                  <span className="step-label">{s.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <div className="topbar-side">
          <span>NASA open data</span>
          {usingSample && (
            <span className="sample-flag" title="VITE_API_URL is set to sample">
              Sample data
            </span>
          )}
        </div>
      </header>

      <main className="stage" key={step}>
        {step === 'field' && (
          <FieldMap point={point} onPick={setPoint} onContinue={() => setStep('farm')} />
        )}
        {step === 'farm' && (
          <FarmForm
            point={point}
            climate={climate}
            conditions={conditions}
            onConditions={updateConditions}
            onResetField={(k) => setSource((s) => ({ ...s, [k]: 'nasa' }))}
            priorities={priorities}
            onPriorities={setPriorities}
            onSubmit={runAnalysis}
          />
        )}
        {step === 'compare' && (
          <Results
            status={status}
            error={error}
            result={result}
            request={request}
            point={point}
            sample={usingSample}
            onRetry={runAnalysis}
            onEdit={() => setStep('farm')}
            onPickAgain={() => setStep('field')}
          />
        )}
      </main>
    </div>
  )
}
