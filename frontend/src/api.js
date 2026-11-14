// Single place where the frontend talks to the backend.
// With no VITE_API_URL set, it answers from the sample files so the UI
// can be built before the backend exists. Same shape as contract/.
import sample from './mock/sample-response.json'
import sampleCrops from './mock/crops.json'

const API = (import.meta.env?.VITE_API_URL || '').replace(/\/$/, '')
export const usingSample = !API

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export async function getCrops() {
  if (usingSample) return sampleCrops
  const res = await fetch(`${API}/api/crops`)
  if (!res.ok) throw new Error(`The server answered ${res.status} for /api/crops`)
  return res.json()
}

// body = { lat, lon, current_rotation: [mainCropId, offSeasonCropId], priorities: { water, soil, income } }
export async function analyze(body) {
  if (usingSample) {
    await wait(1100)
    // Sample data describes one real place. Never relabel it as the field the user picked.
    return sample
  }
  const res = await fetch(`${API}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`The server answered ${res.status} for /api/analyze`)
  return res.json()
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
