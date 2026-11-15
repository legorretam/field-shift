// English and Spanish for the whole interface. English is the default (the judges
// read English); the choice is remembered in this browser.
// The crop model answers in Spanish; model.js turns its words into either language.
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { formatCell as cellEn, formatCoord as coordEn } from './lib.js'

const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
}
const MONTHS_LONG = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
}

const DICT = {
  en: {
    'lang.label': 'Language',
    'brand.home': 'Field Shift, start over',
    'nav.progress': 'Progress',
    'step.field': 'Field',
    'step.farm': 'Farm',
    'step.compare': 'Compare',
    'top.data': 'NASA open data',
    'top.sample': 'Sample data',
    'top.sampleTitle': 'VITE_API_URL is set to sample',

    'map.title': 'Every field has a year.',
    'map.lede':
      'Pick the grid square that holds your field. We read two decades of NASA climate for it and score the crops you could plant there next.',
    'map.searchLabel': 'Town or county',
    'map.find': 'Find',
    'map.finding': 'Finding…',
    'map.noPlace': 'No place called "{q}" in the lower 48. Try a nearby town or county.',
    'map.outside': 'Field Shift covers farms in the 48 contiguous states. Pick a point inside them.',
    'map.searchDown': 'Place search is not available right now. Click the map instead.',
    'map.style': 'Map style',
    'map.satellite': 'Satellite',
    'map.graphic': 'Map',
    'map.ndvi': 'Vegetation layer, MODIS NDVI',
    'map.locating': 'Locating…',
    'map.cellAt': 'Grid square at {c}',
    'map.cellCentered': 'Grid square centered at {c}',
    'map.cellNote':
      'Field Shift works on NASA POWER’s grid: squares 0.5° tall and 0.625° wide, about 55 km across. Results describe the whole square, not a single field.',
    'map.use': 'Use this field',
    'map.empty': 'Click the map to pick a grid square. Zoom in to see the grid.',
    'map.ndviKey': 'Vegetation, last 8 days',
    'map.ndviBare': 'Bare',
    'map.ndviDense': 'Dense',
    'map.hide': 'Hide panel',
    'map.show': 'Show panel',

    'farm.yourField': 'Your field',
    'farm.square': 'grid square at {c}',
    'farm.title': 'When are you planting?',
    'farm.lede':
      'We filled in this square’s usual weather from NASA POWER. If this season is running warmer, colder, wetter or drier, change the numbers.',
    'farm.block': 'Planting month and weather',
    'farm.month': 'Month',
    'farm.monthGroup': 'Planting month',
    'farm.loadingClimate': 'Loading NASA climate…',
    'farm.barsKey': 'Bars: rain per month. Numbers: average °C',
    'farm.monthAria': '{month}: {t} degrees and {r} millimeters of rain on average',
    'farm.temp': 'Average temperature in {month}',
    'farm.rain': 'Rain in {month}',
    'farm.nasaAvg': 'NASA POWER average',
    'farm.yours': 'Your value',
    'farm.useNasa': 'Use NASA average',
    'farm.missing': 'NASA POWER has no climate for this square in our file. Type the values you expect.',
    'farm.loadError': 'The NASA climate file did not load. Type the values you expect, or reload the page.',
    'farm.climateNote': 'Averages for 2001 to 2025 over a grid square about 55 km across, from NASA POWER (MERRA-2).',
    'farm.matters': 'What matters most to you?',
    'farm.noWeight': 'Give at least one priority some weight.',
    'farm.submit': 'Find crops for this field',
    'farm.submitNote': 'The crop model runs on our server and answers in a few seconds.',
    'prio.water': 'Save water',
    'prio.waterHint': 'Crops that need less rain or irrigation',
    'prio.soil': 'Rebuild soil',
    'prio.soilHint': 'Fewer bare months, more roots and organic matter',
    'prio.income': 'Keep income steady',
    'prio.incomeHint': 'A harvest you can sell nearby',

    'res.yourField': 'Your field',
    'res.loading': 'Running the crop model for {place}…',
    'res.slow': 'The model server is waking up. The first answer after a quiet spell can take up to a minute.',
    'res.outsideTitle': 'No crop data for this square',
    'res.outsideBody':
      'The crop model covers farmland in the lower 48 states. This grid square has no data, which usually means it is mostly water, city, or across the border.',
    'res.pickAgain': 'Pick another square',
    'res.retry': 'Try again',
    'res.errTitle': 'Results didn’t load',
    'res.errEmpty': 'The crop model sent nothing back.',
    'res.edit': 'Change details',
    'res.sampleBold': 'Sample data.',
    'res.sampleRest':
      'The app is set to VITE_API_URL=sample, so every answer is the built-in example for a square in central Iowa in May, not the field you picked.',
    'res.lede':
      'Planting in {month}, at {t} °C on average with {r} mm of rain. Weighted {w}% water, {s}% soil, {i}% income.',
    'res.nowTitle': 'What to plant now',
    'res.nowNote': 'Ranked by overall score for this square and month. Under each crop, the crops that fit best after it.',
    'res.best': 'Best match',
    'res.then': 'Then plant',
    'res.perTitle': 'Or switch to a perennial',
    'res.perNote': 'Orchards and berry plantings stay for years instead of rotating every season.',
    'res.harvest': 'Harvest',
    'res.care': 'Care',
    'res.disclaimer':
      'Field Shift shows options to explore. Your own judgment and a local agronomist decide what goes in the ground.',
    'res.srcPower': 'climate averages 2001 to 2025 for {c}',
    'res.srcModel': 'Field Shift crop model, run on our server for each request',

    'err.timeout': 'The model took too long to answer. The server may still be waking up: try again in a moment.',
    'err.network': 'Could not reach the model server. Check your connection and try again.',
    'err.status': 'The model server answered {n}.',

    'score.overall': 'Overall score',
    'score.of100': 'of 100',
    'score.ringAria': 'Overall score {n} of 100',
    'score.water': 'Water score',
    'score.soil': 'Soil score',
    'score.income': 'Income score',
    'score.meter': '{k}: {v} of 100',
    'score.follow': 'Follow-up score',
    'score.followAria': 'Follow-up score {n} of 100',
    'score.keyTitle': 'How to read the scores',
    'score.keyOverall':
      'The water, soil and income scores, weighted by your priorities and adjusted for how well this month’s weather suits planting here.',
    'score.keyParts': 'How each crop does on its own. Higher is better: less water, healthier soil, more income.',
    'score.keyParts.title': 'Water, soil, income',
    'score.keyFollow': 'How well the next crop follows this one in the rotation.',
    'score.scale': 'All scores run from 0 to 100.',
  },

  es: {
    'lang.label': 'Idioma',
    'brand.home': 'Field Shift, empezar de nuevo',
    'nav.progress': 'Progreso',
    'step.field': 'Campo',
    'step.farm': 'Granja',
    'step.compare': 'Comparar',
    'top.data': 'Datos abiertos de NASA',
    'top.sample': 'Datos de ejemplo',
    'top.sampleTitle': 'VITE_API_URL está en sample',

    'map.title': 'Cada campo tiene su año.',
    'map.lede':
      'Elige el cuadro de la cuadrícula donde está tu campo. Leemos dos décadas de clima de NASA para ese cuadro y calificamos los cultivos que podrías sembrar ahí.',
    'map.searchLabel': 'Pueblo o condado',
    'map.find': 'Buscar',
    'map.finding': 'Buscando…',
    'map.noPlace': 'No encontramos "{q}" en los 48 estados contiguos. Prueba con un pueblo o condado cercano.',
    'map.outside': 'Field Shift cubre granjas en los 48 estados contiguos de EE. UU. Elige un punto dentro de ellos.',
    'map.searchDown': 'La búsqueda no está disponible ahora. Elige directo en el mapa.',
    'map.style': 'Estilo del mapa',
    'map.satellite': 'Satélite',
    'map.graphic': 'Mapa',
    'map.ndvi': 'Capa de vegetación, MODIS NDVI',
    'map.locating': 'Ubicando…',
    'map.cellAt': 'Cuadro en {c}',
    'map.cellCentered': 'Cuadro con centro en {c}',
    'map.cellNote':
      'Field Shift trabaja con la cuadrícula de NASA POWER: cuadros de 0.5° de alto y 0.625° de ancho, de unos 55 km. Los resultados describen el cuadro completo, no una sola parcela.',
    'map.use': 'Usar este campo',
    'map.empty': 'Da clic en el mapa para elegir un cuadro. Acércate para ver la cuadrícula.',
    'map.ndviKey': 'Vegetación, últimos 8 días',
    'map.ndviBare': 'Escasa',
    'map.ndviDense': 'Densa',
    'map.hide': 'Ocultar panel',
    'map.show': 'Mostrar panel',

    'farm.yourField': 'Tu campo',
    'farm.square': 'cuadro en {c}',
    'farm.title': '¿Cuándo vas a sembrar?',
    'farm.lede':
      'Llenamos el clima típico de este cuadro con datos de NASA POWER. Si esta temporada viene más caliente, más fría, más húmeda o más seca, cambia los números.',
    'farm.block': 'Mes de siembra y clima',
    'farm.month': 'Mes',
    'farm.monthGroup': 'Mes de siembra',
    'farm.loadingClimate': 'Cargando el clima de NASA…',
    'farm.barsKey': 'Barras: lluvia por mes. Números: °C promedio',
    'farm.monthAria': '{month}: {t} grados y {r} milímetros de lluvia en promedio',
    'farm.temp': 'Temperatura promedio en {month}',
    'farm.rain': 'Lluvia en {month}',
    'farm.nasaAvg': 'Promedio de NASA POWER',
    'farm.yours': 'Tu valor',
    'farm.useNasa': 'Usar promedio de NASA',
    'farm.missing': 'NASA POWER no tiene clima para este cuadro en nuestro archivo. Escribe los valores que esperas.',
    'farm.loadError': 'No se cargó el archivo de clima de NASA. Escribe los valores que esperas o recarga la página.',
    'farm.climateNote': 'Promedios de 2001 a 2025 en un cuadro de unos 55 km, de NASA POWER (MERRA-2).',
    'farm.matters': '¿Qué es lo más importante para ti?',
    'farm.noWeight': 'Dale algo de peso al menos a una prioridad.',
    'farm.submit': 'Buscar cultivos para este campo',
    'farm.submitNote': 'El modelo de cultivos corre en nuestro servidor y responde en unos segundos.',
    'prio.water': 'Ahorrar agua',
    'prio.waterHint': 'Cultivos que necesitan menos lluvia o riego',
    'prio.soil': 'Recuperar el suelo',
    'prio.soilHint': 'Menos meses de suelo desnudo, más raíces y materia orgánica',
    'prio.income': 'Mantener el ingreso',
    'prio.incomeHint': 'Una cosecha que puedas vender cerca',

    'res.yourField': 'Tu campo',
    'res.loading': 'Corriendo el modelo de cultivos para {place}…',
    'res.slow':
      'El servidor del modelo se está despertando. La primera respuesta después de un rato sin uso puede tardar hasta un minuto.',
    'res.outsideTitle': 'No hay datos de cultivos para este cuadro',
    'res.outsideBody':
      'El modelo cubre tierras agrícolas en los 48 estados contiguos. Este cuadro no tiene datos, casi siempre porque es sobre todo agua, ciudad o está del otro lado de la frontera.',
    'res.pickAgain': 'Elegir otro cuadro',
    'res.retry': 'Intentar de nuevo',
    'res.errTitle': 'No se cargaron los resultados',
    'res.errEmpty': 'El modelo de cultivos no devolvió nada.',
    'res.edit': 'Cambiar datos',
    'res.sampleBold': 'Datos de ejemplo.',
    'res.sampleRest':
      'La app tiene VITE_API_URL=sample, así que todas las respuestas son el ejemplo de un cuadro en el centro de Iowa en mayo, no el campo que elegiste.',
    'res.lede':
      'Siembra en {month}, con {t} °C en promedio y {r} mm de lluvia. Peso: {w}% agua, {s}% suelo, {i}% ingreso.',
    'res.nowTitle': 'Qué sembrar ahora',
    'res.nowNote': 'Ordenados por puntaje general para este cuadro y este mes. Debajo de cada uno, los cultivos que mejor le siguen.',
    'res.best': 'Mejor opción',
    'res.then': 'Después siembra',
    'res.perTitle': 'O cambia a un cultivo perenne',
    'res.perNote': 'Los huertos y las plantaciones de frutos rojos se quedan por años en lugar de rotar cada temporada.',
    'res.harvest': 'Cosecha',
    'res.care': 'Manejo',
    'res.disclaimer':
      'Field Shift muestra opciones para explorar. Tu criterio y un agrónomo local deciden qué se siembra.',
    'res.srcPower': 'promedios climáticos de 2001 a 2025 para {c}',
    'res.srcModel': 'Modelo de cultivos de Field Shift, corre en nuestro servidor en cada consulta',

    'err.timeout': 'El modelo tardó demasiado en responder. Puede que el servidor siga despertando: intenta de nuevo en un momento.',
    'err.network': 'No pudimos conectar con el servidor del modelo. Revisa tu conexión e intenta de nuevo.',
    'err.status': 'El servidor del modelo respondió {n}.',

    'score.overall': 'Puntaje general',
    'score.of100': 'de 100',
    'score.ringAria': 'Puntaje general {n} de 100',
    'score.water': 'Puntaje de agua',
    'score.soil': 'Puntaje de suelo',
    'score.income': 'Puntaje de ingreso',
    'score.meter': '{k}: {v} de 100',
    'score.follow': 'Puntaje de sucesión',
    'score.followAria': 'Puntaje de sucesión {n} de 100',
    'score.keyTitle': 'Cómo leer los puntajes',
    'score.keyOverall':
      'Los puntajes de agua, suelo e ingreso, ponderados con tus prioridades y ajustados según qué tan bueno es el clima de este mes para sembrar aquí.',
    'score.keyParts':
      'Cómo le va a cada cultivo por sí solo. Más alto es mejor: menos agua, suelo más sano, más ingreso.',
    'score.keyParts.title': 'Agua, suelo, ingreso',
    'score.keyFollow': 'Qué tan bien sigue el próximo cultivo a este en la rotación.',
    'score.scale': 'Todos los puntajes van de 0 a 100.',
  },
}

const STORE_KEY = 'field-shift-lang'
const LangContext = createContext(null)

function savedLang() {
  try {
    return localStorage.getItem(STORE_KEY) === 'es' ? 'es' : 'en'
  } catch {
    return 'en'
  }
}

function build(lang, setLang) {
  const d = DICT[lang]
  const t = (key, vars = {}) =>
    String(d[key] ?? DICT.en[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? '').toString())
  // Spanish writes west as O (oeste).
  const west = (s) => (lang === 'es' ? s.replace(/ W\b/g, ' O') : s)
  return {
    lang,
    setLang,
    t,
    months: MONTHS[lang],
    monthsLong: MONTHS_LONG[lang],
    coord: (lat, lon) => west(coordEn(lat, lon)),
    cell: (c) => (c ? west(cellEn(c)) : ''),
  }
}

export function LangProvider({ children }) {
  const [lang, setLang] = useState(savedLang)
  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem(STORE_KEY, lang)
    } catch {
      // private mode or storage off: the choice lasts for this visit
    }
  }, [lang])
  const value = useMemo(() => build(lang, setLang), [lang])
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export const useI18n = () => useContext(LangContext)
