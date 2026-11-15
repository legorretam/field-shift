import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Polygon, Polyline, Rectangle, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { placeName, searchPlace } from '../api.js'
import { GRID, cellBounds, formatCell, sameCell, snapToCell } from '../lib.js'
import { ArrowIcon, SearchIcon } from './Icons.jsx'

// NASA GIBS tiles: Blue Marble base, MODIS 8-day NDVI overlay, reference labels.
const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best'
const BASE = `${GIBS}/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg`
const ndviDate = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)
const NDVI = `${GIBS}/MODIS_Terra_NDVI_8Day/default/${ndviDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`
const LABELS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'

// The 48 contiguous states only. Phones start zoomed out, with the US above the bottom sheet.
const NARROW = typeof window !== 'undefined' && window.innerWidth < 700
const US_VIEW = NARROW ? { center: [30.5, -96.5], zoom: 3 } : { center: [38.6, -94.5], zoom: 5 }
const US_BOUNDS = [
  [22, -128],
  [51.5, -63],
]
const inContiguousUS = (lat, lon) => lat >= 24.3 && lat <= 49.5 && lon >= -125 && lon <= -66.9
const OUTSIDE_MSG = 'Field Shift covers farms in the 48 contiguous states. Pick a point inside them.'

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
function GridLines() {
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
      pathOptions={{ color: '#f8f9f5', weight: 0.7, opacity: 0.38 }}
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

function FlyTo({ target }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lon], Math.max(map.getZoom(), 7), { duration: 1.2 })
  }, [map, target])
  return null
}

export default function FieldMap({ point, onPick, onContinue }) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchMsg, setSearchMsg] = useState('')
  const [flyTarget, setFlyTarget] = useState(null)
  const [showNdvi, setShowNdvi] = useState(true)
  const [hoverCell, setHoverCell] = useState(null)
  const states = useLower48()
  // Everything outside the lower 48 sits under a dark veil: a world-sized polygon with the states cut out.
  const veil = useMemo(() => (states ? [WORLD_RING, ...states] : null), [states])

  // lat and lon are always a grid cell center, so the backend can look the cell up directly.
  async function onCellPick(cell, zoom) {
    const { lat, lon } = cell
    setSearchMsg('')
    if (!inContiguousUS(lat, lon)) {
      onPick(null)
      setSearchMsg(OUTSIDE_MSG)
      return
    }
    // From far out, fly in so the chosen square and its neighbours are visible.
    if (zoom < GRID_MIN_ZOOM) setFlyTarget(cell)
    onPick({ lat, lon, label: null })
    const place = await placeName(lat, lon)
    if (place && !place.inUS) {
      onPick(null)
      setSearchMsg(OUTSIDE_MSG)
    } else {
      // If the name lookup fails, the field still works; it is just named by its coordinates.
      onPick({ lat, lon, label: place?.label || `Grid square at ${formatCell({ lat, lon })}` })
    }
  }

  async function onSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setSearchMsg('')
    try {
      const hit = await searchPlace(query)
      if (!hit) setSearchMsg(`No place called "${query}" in the lower 48. Try a nearby town or county.`)
      else {
        const cell = snapToCell(hit.lat, hit.lon)
        if (!inContiguousUS(cell.lat, cell.lon)) setSearchMsg(OUTSIDE_MSG)
        else {
          onPick({ ...cell, label: hit.label })
          setFlyTarget(cell)
        }
      }
    } catch (err) {
      setSearchMsg(err.message)
    } finally {
      setSearching(false)
    }
  }

  return (
    <section className="map-screen">
      <MapContainer
        className="map"
        center={US_VIEW.center}
        zoom={US_VIEW.zoom}
        minZoom={3}
        maxZoom={10}
        maxBounds={US_BOUNDS}
        maxBoundsViscosity={0.8}
        zoomControl={false}
      >
        <TileLayer url={BASE} maxNativeZoom={8} attribution="Imagery: NASA GIBS Blue Marble" />
        {showNdvi && (
          <TileLayer url={NDVI} className="overlay-tiles" maxZoom={10} maxNativeZoom={9} opacity={0.72} attribution="MODIS NDVI: NASA GIBS" />
        )}
        <TileLayer url={LABELS} className="overlay-tiles" maxZoom={10} attribution="Labels and borders: Esri" />
        {veil && (
          <>
            <Polygon
              positions={veil}
              interactive={false}
              pathOptions={{ stroke: false, fillColor: '#0b1a26', fillOpacity: 0.78, fillRule: 'evenodd' }}
            />
            <Polyline
              positions={states}
              interactive={false}
              pathOptions={{ color: '#f8f9f5', weight: 0.8, opacity: 0.5 }}
            />
          </>
        )}
        <GridLines />
        <GridInteractions onPick={onCellPick} onHover={setHoverCell} />
        <FlyTo target={flyTarget} />
        {hoverCell && !sameCell(hoverCell, point) && inContiguousUS(hoverCell.lat, hoverCell.lon) && (
          <Rectangle
            bounds={cellBounds(hoverCell)}
            interactive={false}
            pathOptions={{ color: '#f8f9f5', weight: 1.2, opacity: 0.9, fillColor: '#f8f9f5', fillOpacity: 0.12 }}
          />
        )}
        {point && (
          <>
            <Rectangle
              bounds={cellBounds(point)}
              interactive={false}
              pathOptions={{ className: 'cell-outline', color: '#f8f9f5', weight: 2, fillColor: '#d9a43c', fillOpacity: 0.45 }}
            />
            <CircleMarker
              center={[point.lat, point.lon]}
              radius={5}
              interactive={false}
              pathOptions={{ color: '#f8f9f5', weight: 2, fillColor: '#d9a43c', fillOpacity: 1 }}
            />
          </>
        )}
      </MapContainer>

      <aside className={`map-panel screen${point ? ' has-point' : ''}`}>
        <h1 className="display">Every field has a year.</h1>
        <p className="lede">
          Pick the grid square that holds your field. We read two decades of NASA climate for it and
          score the crops you could plant there next.
        </p>

        <form className="search" onSubmit={onSearch} role="search">
          <label className="sr-only" htmlFor="place">Town or county</label>
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
            {searching ? 'Finding…' : 'Find'}
          </button>
        </form>
        {searchMsg && <p className="note note-warn" role="alert">{searchMsg}</p>}

        <label className="toggle">
          <input type="checkbox" checked={showNdvi} onChange={(e) => setShowNdvi(e.target.checked)} />
          <span>Vegetation layer, MODIS NDVI</span>
        </label>

        <div className="picked" aria-live="polite">
          {point ? (
            <>
              <p className="picked-name" key={`${point.lat},${point.lon},${point.label}`}>
                {point.label || 'Locating…'}
              </p>
              <p className="picked-coord">Grid square centered at {formatCell(point)}</p>
              <div className="cell-note">
                <span className="cell-icon" aria-hidden="true" />
                <p className="note">
                  Field Shift works on NASA POWER’s grid: squares 0.5° tall and 0.625° wide, about
                  55 km across. Results describe the whole square, not a single field.
                </p>
              </div>
              <button className="btn btn-primary btn-lg" onClick={onContinue}>
                Use this field
                <ArrowIcon className="arrow" />
              </button>
            </>
          ) : (
            <p className="picked-empty">
              <span className="pulse-dot" aria-hidden="true" />
              Click the map to pick a grid square. Zoom in to see the grid.
            </p>
          )}
        </div>
      </aside>

      {showNdvi && (
        <div className="ndvi-key" aria-hidden="true">
          Vegetation, last 8 days
          <div className="ndvi-ramp" />
          <div className="ndvi-ends">
            <span>Bare</span>
            <span>Dense</span>
          </div>
        </div>
      )}
    </section>
  )
}
