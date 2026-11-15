import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleMarker, MapContainer, Polygon, Polyline, Rectangle, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { placeName, searchPlace } from '../api.js'
import { GRID, cellBounds, sameCell, snapToCell } from '../lib.js'
import { useI18n } from '../i18n.jsx'
import { ArrowIcon, PanelIcon, SearchIcon } from './Icons.jsx'

// NASA GIBS tiles: Blue Marble base, MODIS 8-day NDVI overlay, reference labels.
const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best'
const BASE = `${GIBS}/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg`
const ndviDate = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)
const NDVI = `${GIBS}/MODIS_Terra_NDVI_8Day/default/${ndviDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`
const LABELS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
// The graphic map: Esri's light gray canvas, base and labels as separate layers.
const ESRI_CANVAS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas'
const GRAY_BASE = `${ESRI_CANVAS}/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`
const GRAY_LABELS = `${ESRI_CANVAS}/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`

// Line and fill colors for each map style. Satellite draws in paper over dark imagery;
// the graphic map draws in ink over light gray.
const INK = '#172117'
const PAPER = '#f8f9f5'
const STYLE = {
  satellite: {
    veil: { fillColor: '#0b1a26', fillOpacity: 0.78 },
    states: { color: PAPER, weight: 0.8, opacity: 0.5 },
    grid: { color: PAPER, weight: 0.7, opacity: 0.38 },
    hover: { color: PAPER, weight: 1.2, opacity: 0.9, fillColor: PAPER, fillOpacity: 0.12 },
    line: PAPER,
  },
  graphic: {
    veil: { fillColor: '#eef0e9', fillOpacity: 0.86 },
    states: { color: INK, weight: 0.8, opacity: 0.32 },
    grid: { color: INK, weight: 0.6, opacity: 0.2 },
    hover: { color: INK, weight: 1.2, opacity: 0.75, fillColor: INK, fillOpacity: 0.06 },
    line: INK,
  },
}

const MAP_STYLE_KEY = 'field-shift-map'
function savedMapStyle() {
  try {
    return localStorage.getItem(MAP_STYLE_KEY) === 'graphic' ? 'graphic' : 'satellite'
  } catch {
    return 'satellite'
  }
}

// The 48 contiguous states only. The first view fits them into the part of the map the
// panel leaves free: to its right on wide screens, above the bottom sheet on phones.
// Read at the moment it is needed, so a rotated phone or resized window gets the right answer.
const isNarrow = () => typeof window !== 'undefined' && window.innerWidth <= 900
const LOWER48 = [
  [24.3, -125],
  [49.5, -66.9],
]
const firstView = () =>
  isNarrow()
    ? { paddingTopLeft: [16, 16], paddingBottomRight: [16, 380] }
    : { paddingTopLeft: [Math.min(440, window.innerWidth - 56) + 56, 28], paddingBottomRight: [28, 28] }
// How far the map can be dragged. Wide on purpose: the West Coast has to be able to
// slide out from under the panel.
const US_BOUNDS = [
  [-20, -170],
  [66, -40],
]
const inContiguousUS = (lat, lon) => lat >= 24.3 && lat <= 49.5 && lon >= -125 && lon <= -66.9

// State outlines (US Census data, public domain) for the lower-48 mask.
const US_STATES_URL = 'https://cdn.jsdelivr.net/gh/PublicaMundi/MappingAPI@master/data/geojson/us-states.json'
const NOT_LOWER_48 = new Set(['Alaska', 'Hawaii', 'Puerto Rico'])
const WORLD_RING = [
  [85, -180],
  [85, 180],
  [-85, 180],
  [-85, -180],
]

// Fetches the 48 states once and returns their outer rings as [lat, lon] lists.
// If the file can't load, the map simply shows without the mask.
function useLower48() {
  const [rings, setRings] = useState(null)
  useEffect(() => {
    let alive = true
    fetch(US_STATES_URL)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((gj) => {
        const out = []
        for (const f of gj.features) {
          if (NOT_LOWER_48.has(f.properties?.name)) continue
          const g = f.geometry
          const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates
          for (const poly of polys) out.push(poly[0].map(([lon, lat]) => [lat, lon]))
        }
        if (alive) setRings(out)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  return rings
}

// The grid only draws once you are close enough for the squares to read.
const GRID_MIN_ZOOM = 6
// Outer edges of the grid box that the backend's climate file covers.
const GRID_EDGES = { south: 23.75, north: 50.25, west: -125.3125, east: -64.6875 }

// Clicks pick a whole grid cell; on desktop, the cell under the cursor is outlined first.
function GridInteractions({ onPick, onHover }) {
  const map = useMapEvents({
    click: (e) => onPick(snapToCell(e.latlng.lat, e.latlng.lng), map.getZoom()),
    mousemove: (e) => onHover(snapToCell(e.latlng.lat, e.latlng.lng)),
    mouseout: () => onHover(null),
  })
  return null
}

// Grid lines for the part of the map in view, redrawn after every pan or zoom.
function GridLines({ look }) {
  const [lines, setLines] = useState([])
  const map = useMapEvents({
    moveend: () => setLines(linesFor(map)),
    zoomend: () => setLines(linesFor(map)),
  })
  useEffect(() => setLines(linesFor(map)), [map])
  if (!lines.length) return null
  return (
    <Polyline
      positions={lines}
      interactive={false}
      pathOptions={look}
    />
  )
}

function linesFor(map) {
  if (map.getZoom() < GRID_MIN_ZOOM) return []
  const b = map.getBounds()
  const s = Math.max(b.getSouth(), GRID_EDGES.south)
  const n = Math.min(b.getNorth(), GRID_EDGES.north)
  const w = Math.max(b.getWest(), GRID_EDGES.west)
  const e = Math.min(b.getEast(), GRID_EDGES.east)
  if (s >= n || w >= e) return []
  const out = []
  for (let k = Math.ceil((s - GRID_EDGES.south) / GRID.dLat); ; k++) {
    const lat = GRID_EDGES.south + k * GRID.dLat
    if (lat > n) break
    out.push([
      [lat, w],
      [lat, e],
    ])
  }
  for (let k = Math.ceil((w - GRID_EDGES.west) / GRID.dLon); ; k++) {
    const lon = GRID_EDGES.west + k * GRID.dLon
    if (lon > e) break
    out.push([
      [s, lon],
      [n, lon],
    ])
  }
  return out
}

// Flies to a picked place and centers it in the part of the map the panel leaves free.
function FlyTo({ target, inset }) {
  const map = useMap()
  useEffect(() => {
    if (!target) return
    const zoom = Math.max(map.getZoom(), 7)
    const { left = 0, bottom = 0 } = inset() || {}
    const p = map.project([target.lat, target.lon], zoom).subtract([left / 2, -bottom / 2])
    map.flyTo(map.unproject(p, zoom), zoom, { duration: 1.2 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, target])
  return null
}

export default function FieldMap({ point, onPick, onContinue }) {
  const { t, cell: cellText } = useI18n()
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  // Kept as a message key so it follows the language toggle.
  const [searchMsg, setSearchMsg] = useState(null)
  const [mapStyle, setMapStyle] = useState(savedMapStyle)
  // The panel folds away so every part of the map can be clicked, California included.
  const [panelOpen, setPanelOpen] = useState(true)
  const panelRef = useRef(null)
  const sectionRef = useRef(null)
  // The strip of map the panel covers, in pixels, so a picked place is never hidden under it.
  const inset = () => {
    if (!panelOpen) return null
    const panel = panelRef.current?.getBoundingClientRect()
    const box = sectionRef.current?.getBoundingClientRect()
    if (!panel || !box) return null
    return isNarrow() ? { bottom: box.bottom - panel.top } : { left: panel.right - box.left }
  }
  const look = STYLE[mapStyle]
  const graphic = mapStyle === 'graphic'
  useEffect(() => {
    try {
      localStorage.setItem(MAP_STYLE_KEY, mapStyle)
    } catch {
      // storage off: the choice lasts for this visit
    }
  }, [mapStyle])
  const [flyTarget, setFlyTarget] = useState(null)
  const [showNdvi, setShowNdvi] = useState(true)
  const [hoverCell, setHoverCell] = useState(null)
  const states = useLower48()
  // Everything outside the lower 48 sits under a dark veil: a world-sized polygon with the states cut out.
  const veil = useMemo(() => (states ? [WORLD_RING, ...states] : null), [states])

  // lat and lon are always a grid cell center, so the backend can look the cell up directly.
  async function onCellPick(cell, zoom) {
    const { lat, lon } = cell
    setSearchMsg(null)
    if (!inContiguousUS(lat, lon)) {
      onPick(null)
      setSearchMsg({ key: 'map.outside' })
      return
    }
    // From far out, fly in so the chosen square and its neighbours are visible.
    if (zoom < GRID_MIN_ZOOM) setFlyTarget(cell)
    onPick({ lat, lon, label: null, located: false })
    const place = await placeName(lat, lon)
    if (place && !place.inUS) {
      onPick(null)
      setSearchMsg({ key: 'map.outside' })
    } else {
      // If the name lookup fails, the field still works; it is just named by its coordinates.
      onPick({ lat, lon, label: place?.label || null, located: true })
    }
  }

  async function onSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setSearchMsg(null)
    try {
      const hit = await searchPlace(query)
      if (!hit) setSearchMsg({ key: 'map.noPlace', vars: { q: query } })
      else {
        const cell = snapToCell(hit.lat, hit.lon)
        if (!inContiguousUS(cell.lat, cell.lon)) setSearchMsg({ key: 'map.outside' })
        else {
          onPick({ ...cell, label: hit.label, located: true })
          setFlyTarget(cell)
        }
      }
    } catch {
      setSearchMsg({ key: 'map.searchDown' })
    } finally {
      setSearching(false)
    }
  }

  // Coming back to this step keeps the picked square in view; otherwise show the lower 48.
  const startView = point ? { center: [point.lat, point.lon], zoom: 7 } : { bounds: LOWER48, boundsOptions: firstView() }

  return (
    <section ref={sectionRef} className={`map-screen${graphic ? ' is-graphic' : ''}`}>
      <MapContainer
        className="map"
        {...startView}
        zoomSnap={0.5}
        minZoom={3}
        maxZoom={10}
        maxBounds={US_BOUNDS}
        maxBoundsViscosity={0.8}
        zoomControl={false}
      >
        {graphic ? (
          <>
            <TileLayer key="gray-base" url={GRAY_BASE} maxNativeZoom={16} attribution="Base map: Esri, HERE, Garmin" />
            <TileLayer key="gray-labels" url={GRAY_LABELS} className="overlay-tiles" maxZoom={10} attribution="Labels: Esri" />
          </>
        ) : (
          <>
            <TileLayer key="blue-marble" url={BASE} maxNativeZoom={8} attribution="Imagery: NASA GIBS Blue Marble" />
            {showNdvi && (
              <TileLayer key="ndvi" url={NDVI} className="overlay-tiles" maxZoom={10} maxNativeZoom={9} opacity={0.72} attribution="MODIS NDVI: NASA GIBS" />
            )}
            <TileLayer key="labels" url={LABELS} className="overlay-tiles" maxZoom={10} attribution="Labels and borders: Esri" />
          </>
        )}
        {veil && (
          <>
            <Polygon
              positions={veil}
              interactive={false}
              pathOptions={{ stroke: false, fillRule: 'evenodd', ...look.veil }}
            />
            <Polyline positions={states} interactive={false} pathOptions={look.states} />
          </>
        )}
        <GridLines look={look.grid} />
        <GridInteractions onPick={onCellPick} onHover={setHoverCell} />
        <FlyTo target={flyTarget} inset={inset} />
        {hoverCell && !sameCell(hoverCell, point) && inContiguousUS(hoverCell.lat, hoverCell.lon) && (
          <Rectangle
            bounds={cellBounds(hoverCell)}
            interactive={false}
            pathOptions={look.hover}
          />
        )}
        {point && (
          <>
            <Rectangle
              bounds={cellBounds(point)}
              interactive={false}
              pathOptions={{ className: 'cell-outline', color: look.line, weight: 2, fillColor: '#d9a43c', fillOpacity: 0.45 }}
            />
            <CircleMarker
              center={[point.lat, point.lon]}
              radius={5}
              interactive={false}
              pathOptions={{ color: look.line, weight: 2, fillColor: '#d9a43c', fillOpacity: 1 }}
            />
          </>
        )}
      </MapContainer>

      {!panelOpen && (
        <div className="map-dock">
          <button type="button" className="btn btn-quiet dock-show" onClick={() => setPanelOpen(true)} aria-expanded="false" aria-controls="map-panel">
            <PanelIcon open={false} />
            {t('map.show')}
          </button>
          {point && (
            <>
              <span className="dock-name">
                {point.label || (point.located ? t('map.cellAt', { c: cellText(point) }) : t('map.locating'))}
              </span>
              <button className="btn btn-primary" onClick={onContinue}>
                {t('map.use')}
                <ArrowIcon className="arrow" />
              </button>
            </>
          )}
        </div>
      )}

      <aside
        id="map-panel"
        ref={panelRef}
        hidden={!panelOpen}
        className={`map-panel screen${point ? ' has-point' : ''}`}
      >
        <button
          type="button"
          className="panel-hide"
          onClick={() => setPanelOpen(false)}
          aria-expanded="true"
          aria-controls="map-panel"
          aria-label={t('map.hide')}
          title={t('map.hide')}
        >
          <PanelIcon />
        </button>
        <h1 className="display">{t('map.title')}</h1>
        <p className="lede">{t('map.lede')}</p>

        <form className="search" onSubmit={onSearch} role="search">
          <label className="sr-only" htmlFor="place">{t('map.searchLabel')}</label>
          <SearchIcon className="search-icon" />
          <input
            id="place"
            type="search"
            placeholder="Garden City, Kansas"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn btn-quiet" type="submit" disabled={searching}>
            {searching ? t('map.finding') : t('map.find')}
          </button>
        </form>
        {searchMsg && (
          <p className="note note-warn" role="alert">
            {t(searchMsg.key, searchMsg.vars)}
          </p>
        )}

        <div className="map-controls">
          <div className="seg-toggle" role="group" aria-label={t('map.style')}>
            {['satellite', 'graphic'].map((m) => (
              <button key={m} type="button" aria-pressed={mapStyle === m} onClick={() => setMapStyle(m)}>
                {t(`map.${m}`)}
              </button>
            ))}
          </div>
          {!graphic && (
            <label className="toggle">
              <input type="checkbox" checked={showNdvi} onChange={(e) => setShowNdvi(e.target.checked)} />
              <span>{t('map.ndvi')}</span>
            </label>
          )}
        </div>

        <div className="picked" aria-live="polite">
          {point ? (
            <>
              <p className="picked-name" key={`${point.lat},${point.lon},${point.label}`}>
                {point.label || (point.located ? t('map.cellAt', { c: cellText(point) }) : t('map.locating'))}
              </p>
              <p className="picked-coord">{t('map.cellCentered', { c: cellText(point) })}</p>
              <div className="cell-note">
                <span className="cell-icon" aria-hidden="true" />
                <p className="note">{t('map.cellNote')}</p>
              </div>
              <button className="btn btn-primary btn-lg" onClick={onContinue}>
                {t('map.use')}
                <ArrowIcon className="arrow" />
              </button>
            </>
          ) : (
            <p className="picked-empty">
              <span className="pulse-dot" aria-hidden="true" />
              {t('map.empty')}
            </p>
          )}
        </div>
      </aside>

      {showNdvi && !graphic && (
        <div className="ndvi-key" aria-hidden="true">
          {t('map.ndviKey')}
          <div className="ndvi-ramp" />
          <div className="ndvi-ends">
            <span>{t('map.ndviBare')}</span>
            <span>{t('map.ndviDense')}</span>
          </div>
        </div>
      )}
    </section>
  )
}
