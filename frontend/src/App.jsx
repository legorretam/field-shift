import { useEffect, useState } from 'react'
import { analyze, getCrops, usingSample } from './api.js'
import { normalizePriorities } from './lib.js'
import FieldMap from './components/FieldMap.jsx'
import FarmForm from './components/FarmForm.jsx'
import Results from './components/Results.jsx'

const STEPS = [
  { id: 'field', label: 'Field' },
  { id: 'farm', label: 'Farm' },
  { id: 'compare', label: 'Compare' },
]

export default function App() {
  const [step, setStep] = useState('field')
  const [point, setPoint] = useState(null) // { lat, lon, label }
  const [crops, setCrops] = useState([])
  const [farm, setFarm] = useState({ main: 'maize', off: 'fallow' })
  const [priorities, setPriorities] = useState({ water: 50, soil: 30, income: 20 })
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState('idle') // idle | loading | error
  const [error, setError] = useState('')

  // Each step starts at the top of the page.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [step])

  useEffect(() => {
    getCrops().then(setCrops).catch((e) => setError(e.message))
  }, [])

  async function runAnalysis() {
    setStep('compare')
    setStatus('loading')
    setError('')
    try {
      const data = await analyze({
        lat: point.lat,
        lon: point.lon,
        current_rotation: [farm.main, farm.off],
        priorities: normalizePriorities(priorities),
      })
      setResult(data)
      setStatus('idle')
    } catch (e) {
      setError(e.message)
      setStatus('error')
    }
  }

  const reached = { field: true, farm: !!point, compare: !!result || status !== 'idle' }

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Field Shift, start over">
          <span className="brand-mark" aria-hidden="true">
            <i /><i /><i />
          </span>
          Field Shift
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
          <span>NASA and USDA open data</span>
          {usingSample && (
            <span className="sample-flag" title="Set VITE_API_URL to use the live backend">
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
            crops={crops}
            farm={farm}
            onFarm={setFarm}
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
            point={point}
            crops={crops}
            priorities={normalizePriorities(priorities)}
            onRetry={runAnalysis}
            onEdit={() => setStep('farm')}
          />
        )}
      </main>
    </div>
  )
}
