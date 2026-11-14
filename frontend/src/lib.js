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
