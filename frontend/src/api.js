// Single place where the frontend talks to the backend.
// The live model is the team's R API on Render. Set VITE_API_URL to point somewhere
// else, or to "sample" to answer from src/mock/ with no server at all.
import sample from './mock/sample-recomendar.json'

const RENDER_API = 'https://api-agro-r.onrender.com'
const ENV_API = (import.meta.env?.VITE_API_URL || '').trim()
export const usingSample = ENV_API.toLowerCase() === 'sample'
const API = usingSample ? '' : (ENV_API || RENDER_API).replace(/\/$/, '')

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// Render's free plan sleeps when nobody uses it. Knock on the door as soon as the
// page opens so the server is awake by the time the farmer asks for results.
export function wakeServer() {
  if (usingSample) return
  fetch(`${API}/`).catch(() => {})
}

// Raised when the model has no data for the chosen place (the R code fails there).
export class OutsideCoverageError extends Error {}

// body = { lat, lon, mes, temp_actual, precip_actual, peso_agua, peso_suelo, peso_ingreso }
// Returns { status, rotaciones: [...], extras_perennes: [...] } exactly as the R API sends it.
export async function recommend(body, { timeoutMs = 120000 } = {}) {
  if (usingSample) {
    await wait(1100)
    return sample
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  let res
  try {
    res = await fetch(`${API}/api/recomendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error('The model took too long to answer. The server may still be waking up: try again in a moment.')
    }
    throw new Error('Could not reach the model server. Check your connection and try again.')
  } finally {
    clearTimeout(timer)
  }

  const data = await res.json().catch(() => null)
  // The R code fails with a 500 for places it has no data for. Once the team adds the
  // tryCatch it answers { status: "error", mensaje } instead; both mean the same here.
  if (res.status === 500 || (data && data.status === 'error')) {
    throw new OutsideCoverageError(data?.mensaje || 'No model data for this place.')
  }
  if (!res.ok || !data) throw new Error(`The model server answered ${res.status}.`)
  if (!Array.isArray(data.rotaciones) || !data.rotaciones.length) {
    throw new OutsideCoverageError('The model returned no options for this place.')
  }
  return data
}

// Monthly climate per NASA POWER grid cell, 2001-2025 averages, built from
// backend/data/climate/power_climatology_2001_2025_conus.csv (see scripts/make-climate.mjs).
// { "lat,lon": [[12 mean temps °C], [12 monthly rain totals mm]] }
let climatePromise = null
export function loadClimate() {
  if (!climatePromise) {
    climatePromise = fetch('/climate-monthly.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .catch((e) => {
        climatePromise = null
        throw e
      })
  }
  return climatePromise
}

// Returns { temp: [12], rain: [12] } for a grid cell center, or null if the cell is not in the file.
export async function cellClimate({ lat, lon }) {
  const table = await loadClimate()
  const row = table[`${lat},${lon}`]
  return row ? { temp: row[0], rain: row[1] } : null
}

// Place names. Free, keyless services with CORS; every call has a timeout so the
// interface never waits forever. Photon (OpenStreetMap data) answers searches,
// BigDataCloud answers "what county is this point in".
function fetchJson(url, ms = 6000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  return fetch(url, { signal: ctrl.signal })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    })
    .finally(() => clearTimeout(timer))
}

// Returns { lat, lon, label } for the best US match, or null.
export async function searchPlace(query) {
  try {
    const data = await fetchJson(`https://photon.komoot.io/api/?limit=5&lang=en&q=${encodeURIComponent(query)}`)
    const hit = (data.features || []).find((f) => f.properties?.countrycode === 'US')
    if (hit) {
      const [lon, lat] = hit.geometry.coordinates
      const p = hit.properties
      const county = p.county ? (/county|parish/i.test(p.county) ? p.county : `${p.county} County`) : null
      return { lat, lon, label: [county || p.city || p.name, p.state].filter(Boolean).join(', ') }
    }
  } catch {
    // fall through to the second service
  }
  const name = query.split(',')[0].trim()
  const state = query.split(',')[1]?.trim().toLowerCase()
  const data = await fetchJson(
    `https://geocoding-api.open-meteo.com/v1/search?count=10&language=en&countryCode=US&format=json&name=${encodeURIComponent(name)}`,
  ).catch(() => {
    throw new Error('Place search is not available right now. Click the map instead.')
  })
  const results = data.results || []
  const hit = results.find((r) => state && r.admin1?.toLowerCase().startsWith(state)) || results[0]
  if (!hit) return null
  const county = hit.admin2 ? (/county|parish/i.test(hit.admin2) ? hit.admin2 : `${hit.admin2} County`) : hit.name
  return { lat: hit.latitude, lon: hit.longitude, label: [county, hit.admin1].filter(Boolean).join(', ') }
}

// Returns { label, inUS } or null when the lookup fails or times out.
export async function placeName(lat, lon) {
  try {
    const d = await fetchJson(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en&latitude=${lat}&longitude=${lon}`,
      5000,
    )
    const admin = d.localityInfo?.administrative || []
    const county = admin.find((a) => a.adminLevel === 6)?.name
    const local = county || d.city || d.locality
    const label = local && d.principalSubdivision ? `${local}, ${d.principalSubdivision}` : d.principalSubdivision || null
    return { label, inUS: d.countryCode === 'US' }
  } catch {
    return null
  }
}
