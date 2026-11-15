// Where the data behind Field Shift comes from, grouped by what it describes.
// Names and links stay as published; the "used for" line follows the language toggle.
import { useEffect, useRef } from 'react'
import { useI18n } from '../i18n.jsx'

const GROUPS = [
  {
    key: 'nasa',
    items: [
      {
        name: 'MODIS Terra Surface Reflectance 8-Day (MOD09A1 v061)',
        by: 'NASA LP DAAC',
        url: 'https://lpdaac.usgs.gov/products/mod09a1v061/',
        use: 'src.mod09',
        via: { name: 'Microsoft Planetary Computer', url: 'https://planetarycomputer.microsoft.com/dataset/modis-09A1-061' },
      },
      {
        name: 'NASA POWER (MERRA-2)',
        by: 'NASA Langley Research Center',
        url: 'https://power.larc.nasa.gov/',
        use: 'src.power',
        via: { name: 'Methodology', nameEs: 'Metodología', url: 'https://power.larc.nasa.gov/docs/methodology/' },
      },
    ],
  },
  {
    key: 'land',
    items: [
      {
        name: 'Soil Survey Geographic Database (SSURGO)',
        by: 'USDA-NRCS',
        url: 'https://www.nrcs.usda.gov/resources/data-and-reports/soil-survey-geographic-database-ssurgo',
        use: 'src.ssurgo',
        via: { name: 'Soil Data Access', url: 'https://sdmdataaccess.nrcs.usda.gov/' },
      },
      {
        name: 'Cropland Data Layer (CDL)',
        by: 'USDA-NASS',
        url: 'https://www.nass.usda.gov/Research_and_Science/Cropland/SARS1a.php',
        use: 'src.cdl',
        via: { name: 'CroplandCROS', url: 'https://croplandcros.scinet.usda.gov/' },
        via2: { name: 'CropScape', url: 'https://nassgeodata.gmu.edu/CropScape/' },
      },
      {
        name: 'Copernicus DEM GLO-90',
        by: 'ESA',
        url: 'https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/DEM.html',
        use: 'src.dem',
        via: { name: 'Microsoft Planetary Computer', url: 'https://planetarycomputer.microsoft.com/dataset/cop-dem-glo-90' },
      },
    ],
  },
  {
    key: 'crops',
    items: [
      { name: 'The PLANTS Database', by: 'USDA-NRCS, 2024', url: 'https://plants.usda.gov/', use: 'src.plants' },
      {
        name: 'National Soil Survey Handbook, Title 430-VI',
        by: 'USDA-NRCS, 2024',
        url: 'https://www.nrcs.usda.gov/resources/data-and-reports/national-soil-survey-handbook',
        use: 'src.nssh',
      },
      { name: 'Ecocrop: Crop Ecological Requirements Database', by: 'FAO, 2024', url: 'https://gaez.fao.org/pages/ecocrop', use: 'src.ecocrop' },
    ],
  },
]

export default function Sources({ open, onClose }) {
  const { t, lang } = useI18n()
  const ref = useRef(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  const link = (l) => (
    <a href={l.url} target="_blank" rel="noreferrer">
      {lang === 'es' && l.nameEs ? l.nameEs : l.name}
    </a>
  )

  return (
    <dialog
      ref={ref}
      className="sources-dialog"
      aria-labelledby="sources-title"
      onClose={onClose}
      // A click on the dimmed backdrop lands on the dialog element itself.
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="sources-sheet">
        <header className="sources-head">
          <div>
            <h2 className="h2" id="sources-title">
              {t('src.title')}
            </h2>
            <p className="note">{t('src.lede')}</p>
          </div>
          <button type="button" className="sources-close" onClick={onClose} aria-label={t('src.close')}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M5 5l10 10M15 5 5 15" />
            </svg>
          </button>
        </header>

        <div className="sources-body">
          {GROUPS.map((g) => (
            <section className="src-group" key={g.key} aria-labelledby={`src-${g.key}`}>
              <h3 className="src-group-title" id={`src-${g.key}`}>
                {t(`src.group.${g.key}`)}
              </h3>
              <ul className="src-list">
                {g.items.map((s) => (
                  <li className="src-item" key={s.name}>
                    <p className="src-name">
                      <a href={s.url} target="_blank" rel="noreferrer">
                        {s.name}
                      </a>
                      <span className="src-by">{s.by}</span>
                    </p>
                    <p className="src-use">{t(s.use)}</p>
                    {s.via && (
                      <p className="src-via">
                        {s.via.name === 'Methodology' ? null : `${t('src.via')} `}
                        {link(s.via)}
                        {s.via2 && (
                          <>
                            {t('src.and')}
                            {link(s.via2)}
                          </>
                        )}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </dialog>
  )
}
