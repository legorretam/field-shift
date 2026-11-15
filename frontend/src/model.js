// Turns the R model's answer (Spanish labels, one flat row per pair of crops) into
// what the screens show (English, one entry per crop to plant now).
//
// The vocabulary below is every value the model returned across 72 test runs over the
// lower 48 states and all twelve months (Nov 15). Anything new falls back to the
// model's own text, so nothing is ever hidden.

const fold = (s) =>
  String(s ?? '')
    .replaceAll('_', ' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

const CROPS = {
  maiz: 'Corn',
  sorgo: 'Sorghum',
  'trigo invierno': 'Winter wheat',
  'trigo primavera': 'Spring wheat',
  'otro heno/forraje': 'Other hay or forage',
  guisantes: 'Peas',
  'guisantes arvejas': 'Field peas',
  arvejas: 'Field peas',
  papas: 'Potatoes',
  alfalfa: 'Alfalfa',
  centeno: 'Rye',
  soya: 'Soybeans',
  soja: 'Soybeans',
  cebada: 'Barley',
  avena: 'Oats',
  algodon: 'Cotton',
  girasol: 'Sunflower',
  canola: 'Canola',
  arroz: 'Rice',
  frijol: 'Dry beans',
  frijoles: 'Dry beans',
  barbecho: 'Bare soil (fallow)',
  // Perennials
  manzanas: 'Apples',
  'bayas de cana': 'Caneberries',
  'arboles navidad': 'Christmas trees',
  uvas: 'Grapes',
  arandanos: 'Blueberries',
  cerezas: 'Cherries',
  duraznos: 'Peaches',
  citricos: 'Citrus',
  naranjas: 'Oranges',
  almendras: 'Almonds',
  nueces: 'Walnuts',
}

const SEASONS = { otono: 'fall', primavera: 'spring', verano: 'summer', invierno: 'winter' }

const COMPAT = { optima: 'Best fit', compatible: 'Good fit' }

const HARVEST = {
  otono: 'Fall',
  verano: 'Summer',
  primavera: 'Spring',
  invierno: 'Winter',
  'invierno (tras varios anos)': 'Winter, after several years',
  'verano / otono': 'Summer to fall',
}

const MANAGEMENT = {
  'mantener huerto y coberturas': 'Keep the orchard, with cover crops between trees',
  'mantener plantacion; luego rotar fuera del bloque': 'Keep the planting, then rotate out of that block',
  'mantener plantacion': 'Keep the planting',
  'mantener cobertura vegetal entre hileras': 'Keep plant cover between the rows',
}

const REASONS = {
  'cobertura invernal para proteger suelo en otono': 'Winter cover that protects the soil from fall on',
  'sucesion directa de otono tras cosecha de sorgo': 'Planted straight after the sorghum harvest, in fall',
  'leguminosa de primavera para fijar nitrogeno': 'A spring legume that fixes nitrogen',
  'doble cultivo tras cosecha de verano; tolera calor estival': 'A second crop after the summer harvest; it handles summer heat',
  'siembra de otono tras rastrojo de trigo': 'Seeded in fall into the wheat stubble',
  'leguminosa para cortar ciclo de cereales': 'A legume breaks the run of cereals',
  'rotacion clasica cereal de invierno -> maiz de primavera': 'The classic rotation: winter cereal, then spring corn',
  'siembra otonal tras ultimo corte de forraje': 'Seeded in fall after the last forage cutting',
  'aprovecha materia organica acumulada por el forraje': 'Uses the organic matter the forage built up',
  'aprovecha el nitrogeno fijado por la arveja para siembra de otono': 'Uses the nitrogen the peas fixed, for a fall seeding',
  'cereal de primavera beneficiado por leguminosa previa': 'A spring cereal that benefits from the legume before it',
  'establecimiento tardio de verano/otono': 'Established late, in summer or fall',
  'excelente aporte de nitrogeno organico para maiz en primavera': 'Peas leave organic nitrogen for corn in spring',
  'cobertura obligada tras remover suelo en cosecha de papa': 'Potato harvest loosens the soil, so it needs cover right away',
  'cereal de invierno protege suelo suelto tras tuberculos': 'A winter cereal holds loose soil after a tuber crop',
  'cereal no hospedero de enfermedades de la papa': 'A cereal does not carry potato diseases',
  'leguminosa recomendada tras cobertura para recuperar estructura': 'A legume after the cover crop rebuilds soil structure',
  'buen aprovechamiento de fertilidad residual en primavera': 'Makes good use of the fertility left over in spring',
  'excelente respuesta tras roturar pradera de alfalfa': 'Grows well after an alfalfa stand is turned under',
  'maximo aprovechamiento del nitrogeno fijado por la alfalfa': 'Makes the most of the nitrogen the alfalfa fixed',
}

const tidy = (s) => {
  const t = String(s ?? '').replaceAll('_', ' ').replace(/\s+/g, ' ').trim()
  return t.charAt(0).toUpperCase() + t.slice(1)
}
const from = (table, s) => table[fold(s)] || tidy(s)

export const cropName = (s) => from(CROPS, s)

// "Inmediata (Otoño)" -> "Right after harvest, in fall"; "Siguiente (Primavera)" -> "Next spring"
export function plantingWindow(s) {
  const m = fold(s).match(/^(inmediata|siguiente)\s*\((.+)\)$/)
  if (!m) return tidy(s)
  const season = SEASONS[m[2]] || m[2]
  return m[1] === 'inmediata' ? `Right after harvest, in ${season}` : `Next ${season}`
}

const isImmediate = (s) => fold(s).startsWith('inmediata')

export const compatibility = (s) => ({ label: from(COMPAT, s), best: fold(s) === 'optima' })

const round = (n) => (typeof n === 'number' ? Math.round(n) : null)

// Groups the flat rows into one option per crop to plant now, best first.
export function shapeResult(data) {
  const byOption = new Map()
  for (const r of data.rotaciones || []) {
    if (!byOption.has(r.Opcion_Hoy)) {
      byOption.set(r.Opcion_Hoy, {
        id: r.Opcion_Hoy,
        crop: cropName(r.Cultivo_Hoy),
        score: round(r.Score_Hoy),
        scores: { water: round(r.Score_Agua_Hoy), soil: round(r.Score_Suelo_Hoy), income: round(r.Score_Ingreso_Hoy) },
        next: [],
      })
    }
    byOption.get(r.Opcion_Hoy).next.push({
      crop: cropName(r.Siguiente_Cultivo),
      window: plantingWindow(r.Ventana_Siembra),
      immediate: isImmediate(r.Ventana_Siembra),
      fit: compatibility(r.Compatibilidad),
      score: round(r.Score_Sucesion),
      why: from(REASONS, r.Razon_Agronomica),
    })
  }
  const options = [...byOption.values()]
    .sort((a, b) => a.id - b.id)
    .map((o) => ({ ...o, next: o.next.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)) }))

  const perennials = (data.extras_perennes || [])
    .map((p) => ({
      crop: cropName(p.Arbol_o_Perenne),
      score: round(p.Score_Total),
      scores: { water: round(p.Agua), soil: round(p.Suelo), income: round(p.Ingreso) },
      harvest: from(HARVEST, p.Cosecha),
      care: from(MANAGEMENT, p.Manejo_Huerto),
    }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

  return { options, perennials }
}
