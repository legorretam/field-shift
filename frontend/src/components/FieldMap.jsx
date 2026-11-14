import { useEffect, useState } from 'react'
import { CircleMarker, MapContainer, Rectangle, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { placeName, searchPlace } from '../api.js'
import { formatCoord } from '../lib.js'
import { ArrowIcon, SearchIcon } from './Icons.jsx'

// NASA GIBS tiles: Blue Marble base, MODIS 8-day NDVI overlay, reference labels.
const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best'
const BASE = `${GIBS}/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg`
const ndviDate = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)
const NDVI = `${GIBS}/MODIS_Terra_NDVI_8Day/default/${ndviDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`
const LABELS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'

// The 48 contiguous states only.
const US_VIEW = { center: [38.6, -94.5], zoom: 5 }
const US_BOUNDS = [
  [22, -128],
  [51.5, -63],
]
const inContiguousUS = (lat, lon) => lat >= 24.3 && lat <= 49.5 && lon >= -125 && lon <= -66.9
const OUTSIDE_MSG = 'Field Shift covers farms in the 48 contiguous states. Pick a point inside them.'

// One NASA POWER cell is 0.5° latitude by 0.625° longitude.
const cellAround = (lat, lon) => [
  [lat - 0.25, lon - 0.3125],
  [lat + 0.25, lon + 0.3125],
]

function ClickToPick({ onClick }) {
  useMapEvents({
    click: (e) => onClick(+e.latlng.lat.toFixed(4), +e.latlng.lng.toFixed(4)),
  })
  return null
}

function FlyTo({ target }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lon], 8, { duration: 1.4 })
  }, [map, target])
  return null
}

export default function FieldMap({ point, onPick, onContinue }) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchMsg, setSearchMsg] = useState('')
  const [flyTarget, setFlyTarget] = useState(null)
  const [showNdvi, setShowNdvi] = useState(true)

  async function onMapClick(lat, lon) {
    setSearchMsg('')
    if (!inContiguousUS(lat, lon)) {
      onPick(null)
      setSearchMsg(OUTSIDE_MSG)
      return
    }
    onPick({ lat, lon, label: null })
    const place = await placeName(lat, lon)
    if (place && !place.inUS) {
      onPick(null)
      setSearchMsg(OUTSIDE_MSG)
    } else {
      // If the name lookup fails, the field still works; it is just named by its coordinates.
      onPick({ lat, lon, label: place?.label || `Field at ${formatCoord(lat, lon)}` })
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
      else if (!inContiguousUS(hit.lat, hit.lon)) setSearchMsg(OUTSIDE_MSG)
      else {
        onPick(hit)
        setFlyTarget(hit)
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
        minZoom={4}
        maxZoom={10}
        maxBounds={US_BOUNDS}
        maxBoundsViscosity={0.8}
        zoomControl={false}
      >
        <TileLayer url={BASE} maxNativeZoom={8} attribution="Imagery: NASA GIBS Blue Marble" />
        {showNdvi && (
          <TileLayer url={NDVI} maxNativeZoom={9} opacity={0.72} attribution="MODIS NDVI: NASA GIBS" />
        )}
        <TileLayer url={LABELS} attribution="Labels and borders: Esri" />
        <ClickToPick onClick={onMapClick} />
        <FlyTo target={flyTarget} />
        {point && (
          <>
            <Rectangle
              bounds={cellAround(point.lat, point.lon)}
              pathOptions={{ className: 'cell-outline', color: '#f8f9f5', weight: 1.5, fillColor: '#f8f9f5', fillOpacity: 0.1 }}
            />
            <CircleMarker
              center={[point.lat, point.lon]}
              radius={8}
              pathOptions={{ color: '#f8f9f5', weight: 3, fillColor: '#d9a43c', fillOpacity: 1 }}
            />
          </>
        )}
      </MapContainer>

      <aside className="map-panel screen">
        <h1 className="display">Every field has a year.</h1>
        <p className="lede">
          Pick a field in the lower 48. We line up two decades of NASA and USDA data against the
          rotations you could grow there.
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
              <p className="picked-coord">{formatCoord(point.lat, point.lon)}</p>
              <div className="cell-note">
                <span className="cell-icon" aria-hidden="true" />
                <p className="note">
                  The dashed square is one NASA POWER cell, about 55 km across. Its climate is an
                  average for that area, not a reading from your field.
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
              Click anywhere on the map to drop your field.
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
