import { useEffect, useState } from 'react'
import { CircleMarker, MapContainer, Rectangle, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { placeName, searchPlace } from '../api.js'
import { formatCoord } from '../lib.js'

// NASA GIBS tiles: Blue Marble base + MODIS 8-day NDVI overlay.
const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best'
const BASE = `${GIBS}/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg`
const ndviDate = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)
const NDVI = `${GIBS}/MODIS_Terra_NDVI_8Day/default/${ndviDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`
const LABELS = 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png'

// One NASA POWER cell is 0.5° latitude by 0.625° longitude.
const cellAround = (lat, lon) => [
  [lat - 0.25, lon - 0.3125],
  [lat + 0.25, lon + 0.3125],
]

// Contiguous US plus Alaska and Hawaii.
const US_VIEW = { center: [39.5, -98.35], zoom: 4 }
const US_BOUNDS = [
  [15, -180],
  [72, -60],
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
    if (target) map.flyTo([target.lat, target.lon], 7, { duration: 1.2 })
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
    onPick({ lat, lon, label: null })
    const place = await placeName(lat, lon)
    if (place && !place.inUS) {
      onPick(null)
      setSearchMsg('Field Shift covers farms in the United States. Pick a point inside the US.')
    } else if (place?.label) {
      onPick({ lat, lon, label: place.label })
    }
  }

  async function onSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setSearchMsg('')
    try {
      const hit = await searchPlace(query)
      if (!hit) setSearchMsg(`No US place called "${query}". Try a nearby town or county, or click the map.`)
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
        minZoom={3}
        maxZoom={10}
        maxBounds={US_BOUNDS}
        maxBoundsViscosity={0.8}
        zoomControl={false}
      >
        <TileLayer url={BASE} maxNativeZoom={8} attribution="Imagery: NASA GIBS" />
        {showNdvi && (
          <TileLayer url={NDVI} maxNativeZoom={9} opacity={0.75} attribution="MODIS NDVI: NASA GIBS" />
        )}
        <TileLayer url={LABELS} attribution="&copy; OpenStreetMap contributors &copy; CARTO" />
        <ClickToPick onClick={onMapClick} />
        <FlyTo target={flyTarget} />
        {point && (
          <>
            <Rectangle
              bounds={cellAround(point.lat, point.lon)}
              pathOptions={{ color: '#F4F2E6', weight: 1.5, dashArray: '5 5', fillOpacity: 0.08 }}
            />
            <CircleMarker
              center={[point.lat, point.lon]}
              radius={7}
              pathOptions={{ color: '#F4F2E6', weight: 2.5, fillColor: '#D2A043', fillOpacity: 1 }}
            />
          </>
        )}
      </MapContainer>

      <aside className="panel map-panel">
        <h1 className="display">Where is your field?</h1>
        <p className="lede">
          Click your field on the map or search for a US town or county. We combine NASA climate and
          groundwater data with USDA soil records for that spot.
        </p>

        <form className="search" onSubmit={onSearch} role="search">
          <label className="sr-only" htmlFor="place">US town or county</label>
          <input
            id="place"
            type="search"
            placeholder="Town or county, e.g. Garden City, KS"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn btn-quiet" type="submit" disabled={searching}>
            {searching ? 'Searching…' : 'Search'}
          </button>
        </form>
        {searchMsg && <p className="note note-warn">{searchMsg}</p>}

        <label className="toggle">
          <input type="checkbox" checked={showNdvi} onChange={(e) => setShowNdvi(e.target.checked)} />
          <span>Show vegetation (MODIS NDVI, last 8-day composite)</span>
        </label>

        <div className="picked" aria-live="polite">
          {point ? (
            <>
              <p className="picked-name">{point.label || 'Selected field'}</p>
              <p className="picked-coord">{formatCoord(point.lat, point.lon)}</p>
              <p className="note">
                The dashed square is one NASA POWER cell, about 55 km wide. Climate is averaged over
                that area, not measured in your field.
              </p>
              <button className="btn btn-primary" onClick={onContinue}>
                Use this field
              </button>
            </>
          ) : (
            <p className="note">No field selected yet.</p>
          )}
        </div>
      </aside>
    </section>
  )
}
