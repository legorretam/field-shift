export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const MONTH_INDEX = Object.fromEntries(MONTHS.map((m, i) => [m.toLowerCase(), i]))

// "Jun-Oct" -> [{ start: 5, span: 5 }]; "Nov-May" wraps -> two pieces.
export function seasonPieces(season) {
  const [a, b] = season.split('-').map((s) => MONTH_INDEX[s.trim().slice(0, 3).toLowerCase()])
  if (a === undefined || b === undefined) return []
  if (b >= a) return [{ start: a, span: b - a + 1 }]
  return [
    { start: a, span: 12 - a },
    { start: 0, span: b + 1 },
  ]
}

export function seasonLength(season) {
  return seasonPieces(season).reduce((n, p) => n + p.span, 0)
}

export const SCORE_KEYS = [
  { key: 'water', label: 'Water' },
  { key: 'soil', label: 'Soil' },
  { key: 'resilience', label: 'Resilience' },
  { key: 'income', label: 'Income' },
]

// How well a strategy matches what the farmer said matters (0-100).
export function fitScore(scores, priorities) {
  const keys = ['water', 'soil', 'income']
  const total = keys.reduce((n, k) => n + (priorities[k] || 0), 0) || 1
  return Math.round(keys.reduce((n, k) => n + (scores[k] || 0) * (priorities[k] || 0), 0) / total)
}

export function normalizePriorities(raw) {
  const total = raw.water + raw.soil + raw.income || 1
  return {
    water: +(raw.water / total).toFixed(2),
    soil: +(raw.soil / total).toFixed(2),
    income: +(raw.income / total).toFixed(2),
  }
}

export const formatCoord = (lat, lon) =>
  `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`

// Short crop names for strips and summaries.
export const cropLabel = (crop, id) => (crop?.group === 'fallow' || id === 'fallow' ? 'Bare soil' : crop?.name || id)

// Texture class for a crop's segment or swatch.
export const segClass = (crop, id) => {
  if ((crop?.id || id) === 'sorghum') return 'seg-sorghum'
  return `seg-${crop?.group || (id === 'fallow' ? 'fallow' : 'cereal')}`
}

const WATER_WORDS = { low: 'Low water', medium: 'Medium water', high: 'High water' }
export const cropMeta = (crop) =>
  crop.group === 'fallow'
    ? 'Nothing planted'
    : [WATER_WORDS[crop.water_need], crop.nitrogen_fixing && 'fixes nitrogen'].filter(Boolean).join(', ')

// NASA POWER native grid, the same one as backend/data/climate/power_climatology_2001_2025_conus.csv.
// Cell centers sit at lat = 24 + 0.5 * i and lon = -125 + 0.625 * j (i, j whole numbers).
// Both steps are exact in binary, so centers match the CSV rows exactly.
export const GRID = { lat0: 24, lon0: -125, dLat: 0.5, dLon: 0.625 }

export function snapToCell(lat, lon) {
  const i = Math.round((lat - GRID.lat0) / GRID.dLat)
  const j = Math.round((lon - GRID.lon0) / GRID.dLon)
  return { lat: GRID.lat0 + i * GRID.dLat, lon: GRID.lon0 + j * GRID.dLon }
}

export const cellBounds = ({ lat, lon }) => [
  [lat - GRID.dLat / 2, lon - GRID.dLon / 2],
  [lat + GRID.dLat / 2, lon + GRID.dLon / 2],
]

export const sameCell = (a, b) => !!a && !!b && a.lat === b.lat && a.lon === b.lon

// A grid cell center with the precision the grid actually has: "39.0° N, 101.875° W".
export const formatCell = ({ lat, lon }) =>
  `${Math.abs(lat).toFixed(1)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}° ${lon >= 0 ? 'E' : 'W'}`
