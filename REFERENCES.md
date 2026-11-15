# References

Every external resource used in the project. Add new ones as you use them (required for submission).
The website lists the same sources under "Data sources".

## Data

### NASA
- **NDVI, NDMI and bare soil:** NASA MODIS Terra Surface Reflectance 8-Day L3 Global 500 m (MOD09A1 v061). NASA LP DAAC.
  Product page: https://lpdaac.usgs.gov/products/mod09a1v061/
  Accessed through Microsoft Planetary Computer: https://planetarycomputer.microsoft.com/dataset/modis-09A1-061
- **Rain, temperature and soil moisture:** NASA POWER (Prediction Of Worldwide Energy Resources), MERRA-2. NASA Langley Research Center.
  Portal and API: https://power.larc.nasa.gov/
  Methodology: https://power.larc.nasa.gov/docs/methodology/
  The exact requests for the climate files in `backend/data/climate/` are in the main README, section "Climate data (NASA POWER)".
- **Map imagery:** NASA GIBS (Global Imagery Browse Services), Blue Marble and MODIS Terra NDVI 8-day tiles: https://gibs.earthdata.nasa.gov

### Soil, land and crops
- **Soil properties and erosion:** USDA-NRCS Soil Survey Geographic Database (SSURGO).
  https://www.nrcs.usda.gov/resources/data-and-reports/soil-survey-geographic-database-ssurgo
  Accessed through Soil Data Access: https://sdmdataaccess.nrcs.usda.gov/
- **Crop grown in each grid square:** USDA-NASS Cropland Data Layer (CDL).
  https://www.nass.usda.gov/Research_and_Science/Cropland/SARS1a.php
  Viewers: CroplandCROS https://croplandcros.scinet.usda.gov/ and CropScape https://nassgeodata.gmu.edu/CropScape/
  Legend and codes: https://www.nass.usda.gov/Research_and_Science/Cropland/docs/cdl_legend_colors.html
- **Elevation:** Copernicus DEM GLO-90. ESA.
  https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/DEM.html
  Accessed through Microsoft Planetary Computer: https://planetarycomputer.microsoft.com/dataset/cop-dem-glo-90

### Crop requirements
- USDA-NRCS. (2024). The PLANTS Database. National Plant Data Team, Greensboro, NC. https://plants.usda.gov/
- USDA-NRCS. (2024). National Soil Survey Handbook, Title 430-VI. U.S. Department of Agriculture. https://www.nrcs.usda.gov/resources/data-and-reports/national-soil-survey-handbook
- FAO. (2024). Ecocrop: Crop Ecological Requirements Database. Food and Agriculture Organization of the United Nations. https://gaez.fao.org/pages/ecocrop

### Still to cite
- Rotation rules and planting seasons (`Rotaciones_Estaciones_EEUU.csv` and the rules in `analysis/codigo_NASA_UNAQ.Rmd`): source to confirm.
- Base water, soil and income ratings per crop (in `analysis/codigo_NASA_UNAQ.Rmd`): source to confirm, or state they are team estimates.

## Crop model
- R Core Team. R: A Language and Environment for Statistical Computing. R Foundation for Statistical Computing, Vienna, Austria. https://www.r-project.org/
- Wood, S. N. (2017). Generalized Additive Models: An Introduction with R (2nd ed.). Chapman and Hall/CRC. Package `mgcv`: https://cran.r-project.org/package=mgcv
- R packages `dplyr`, `tidyr`, `sf` and `ggplot2` (analysis) and `plumber` (API): https://cran.r-project.org/
- Docker image `rocker/r-ver`: https://rocker-project.org/
- Render, hosting for the model API: https://render.com/

## Services
- Photon by Komoot (OpenStreetMap data), place search: https://photon.komoot.io
- Open-Meteo Geocoding API, fallback place search: https://open-meteo.com/en/docs/geocoding-api
- BigDataCloud free client-side reverse geocoding, county names: https://www.bigdatacloud.com
- Map labels and state borders: Esri World Boundaries and Places
- Graphic map style: Esri Light Gray Canvas (World_Light_Gray_Base and World_Light_Gray_Reference)
- US state outlines for the lower-48 mask: US Census data via PublicaMundi MappingAPI on jsDelivr, https://github.com/PublicaMundi/MappingAPI

## Code libraries
- React: https://react.dev
- Vite: https://vite.dev
- Leaflet and React Leaflet: https://leafletjs.com, https://react-leaflet.js.org
- FastAPI and HTTPX (earlier Python backend in `backend/`): https://fastapi.tiangolo.com, https://www.python-httpx.org

## Fonts
- Geologica and Newsreader, via Google Fonts: https://fonts.google.com

## AI tools
- Claude (Anthropic) assisted with code, design and writing.
