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
    return { ...sample, location: { ...sample.location, lat: body.lat, lon: body.lon } }
  }
  const res = await fetch(`${API}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`The server answered ${res.status} for /api/analyze`)
  return res.json()
}

// Place names come from OpenStreetMap (Nominatim). Free, keep requests low.
export async function searchPlace(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=us&q=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
  if (!res.ok) throw new Error('Place search is not available right now')
  const [hit] = await res.json()
  if (!hit) return null
  return { lat: Number(hit.lat), lon: Number(hit.lon), label: shortName(hit) }
}

// Returns { label, inUS } or null when the lookup fails.
export async function placeName(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&lat=${lat}&lon=${lon}`
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
    if (!res.ok) return null
    const hit = await res.json()
    if (hit.error) return { label: null, inUS: false }
    return { label: shortName(hit), inUS: hit.address?.country_code === 'us' }
  } catch {
    return null
  }
}

// "Finney County, Kansas" or "Garden City, Kansas"
function shortName(hit) {
  const a = hit.address || {}
  const local = a.county || a.city || a.town || a.village || a.municipality
  if (local && a.state) return `${local}, ${a.state}`
  return a.state || hit.display_name?.split(',').slice(0, 2).join(',') || null
}
