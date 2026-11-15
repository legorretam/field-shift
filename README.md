# Field Shift

<!-- Descripción general del proyecto: pendiente. -->

## Contents

- [Project setup](#project-setup)
- [Analysis: R code and data](#analysis-r-code-and-data)
- [Climate data (NASA POWER)](#climate-data-nasa-power)
- [References](REFERENCES.md)

## Project setup

NASA Space Apps Challenge 2026, reto "Field Shift: Adapting Farms with NASA Data".
Una web para agricultores de Estados Unidos: marcan su parcela, dice qué siembra y qué le importa, y comparan 3 rotaciones explicadas con datos de NASA (clima, agua subterránea) y USDA (suelo, cultivos).

### Estructura

```
field-shift/
  frontend/   React + Vite. Lo que ve el usuario. (Marcelo)
  backend/    Python + FastAPI (versión anterior) y los CSV de NASA POWER en backend/data/climate/.
  backend-r/  plumber.R: la API de R que corre en Render (https://api-agro-r.onrender.com). (equipo backend)
  analysis/   Código de R y datos con los que se construyó el modelo. La página no lo usa.
  contract/   El formato JSON acordado entre los dos. NO se cambia sin avisar.
  REFERENCES.md  Todo recurso externo que usemos (obligatorio para la entrega).
```

Regla de oro: cada quien toca solo su carpeta.

### Correr el frontend (en tu Mac)

Necesitas Node.js 18 o más nuevo (`node -v` para ver).

```bash
cd frontend
npm install        # solo la primera vez
npm run dev        # abre http://localhost:5173
```

Sin configurar nada, habla con el modelo de R en Render. Para trabajar sin servidor, crea `frontend/.env.local` con `VITE_API_URL=sample` (se ve la etiqueta "Sample data").

### Correr el backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # en Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload        # http://localhost:8000/docs
```

### Conectar los dos

El frontend ya apunta a `https://api-agro-r.onrender.com` por defecto (ver `frontend/src/api.js`).
Para usar otro servidor, pon su URL en `VITE_API_URL` (en `.env.local` o en Vercel).

### El contrato (modelo de R)

`POST /api/recomendar` recibe JSON:

```json
{ "lat": 42, "lon": -93.75, "mes": 11, "temp_actual": 3.1, "precip_actual": 40,
  "peso_agua": 50, "peso_suelo": 30, "peso_ingreso": 20 }
```

- `lat`, `lon`: centro de una celda de NASA POWER: `lat = 24 + 0.5·i`, `lon = −125 + 0.625·j`.
- `mes`: 1 a 12. `temp_actual`: temperatura media del mes, °C. `precip_actual`: lluvia total del mes, mm.
  El frontend los llena solo con el promedio 2001-2025 de esa celda (`frontend/public/climate-monthly.json`,
  generado de `backend/data/climate/power_climatology_2001_2025_conus.csv` con `node frontend/scripts/make-climate.mjs`).
- Pesos: cualquier número de 0 a 100; el modelo los normaliza.

Respuesta: ver `contract/recomendar-sample-response.json`. `rotaciones` viene plano (una fila por pareja
cultivo de hoy → siguiente cultivo); el frontend lo agrupa por `Opcion_Hoy` y traduce los textos al inglés
en `frontend/src/model.js`. Si el modelo agrega un cultivo o una razón nueva, agrégala ahí (si no, se
muestra el texto original en español).

Si el punto no tiene datos, el servidor contesta `{ "status": "error", "mensaje": ... }` (con el
`plumber.R` de `backend-r/`) o un 500 (versión anterior). El frontend muestra "No crop data for this square"
en los dos casos.

### Publicar

- **Frontend en Vercel:** New Project → importa el repo → Root Directory: `frontend`. No necesita variables: ya usa la URL de Render.
- **Backend en Render:** New → Web Service → el repo → Root Directory: `backend` → Build: `pip install -r requirements.txt` → Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`.
- Render gratis se duerme: abre https://api-agro-r.onrender.com/ un minuto antes de cualquier demo. La app también lo despierta sola al abrirse.

### Rutina con GitHub Desktop

1. **Fetch / Pull** antes de empezar.
2. Trabaja.
3. Escribe un resumen corto → **Commit to main** → **Push origin**. Cada hora, mínimo.

## Analysis: R code and data

The R code and data the team used to build the Field Shift crop model. The website does not read
anything in this folder: it is here so anyone can see and rerun the work.

### Code

| File | What it does |
| --- | --- |
| `analysis/codigo_NASA_UNAQ.Rmd` | Builds the crop model from the data below and saves it as `modelo_agro_bundle.rds`. |

The model the website uses, and the API that serves it, are in [`backend-r`](backend-r):
`api.R` and `plumber.R` (the API), `Dockerfile` (how it runs on Render), `modelo_agro_bundle.rds`
(the trained model) and `llamar_archivo_rds.Rmd` (a short example of calling the model from R).

### Data (`analysis/data/`)

All files cover the 48 contiguous states on the NASA POWER grid (cells 0.5° by 0.625°, about 55 km).
They are separated by semicolons (`;`).

| File | Contents |
| --- | --- |
| `power_monthly_2020_2025_conus.csv` | NASA POWER monthly mean temperature and rain per cell, 2020 to 2025 |
| `power_climatology_2001_2025_conus.csv` | NASA POWER monthly averages per cell, 2001 to 2025 |
| `Lower48_Planta_NDVI_NDMI_55km.csv` | Monthly NDVI, NDMI and bare-soil share per cell |
| `Lower48_Propiedades_Suelo_55km.csv` | Soil properties per cell: texture, organic matter, water capacity, pH, slope and more |
| `Cultivos_1_15_Asignados.csv` | The crop assigned to each cell |
| `Requerimientos_Cultivos_EEUU.csv` | Soil requirements for each crop |
| `Rotaciones_Estaciones_EEUU.csv` | Which crops go before and after each one, and when they are planted and harvested |
| `Parametros_Calibracion_por_Celda.csv` | Per-cell calibration of the model against NDVI and NDMI |

### Rerunning the model

Install R with the packages `sf`, `dplyr`, `tidyr`, `mgcv` and `ggplot2`. The notebook reads the
CSV files by name from its working directory, so set the working directory to `analysis/data/` (or copy the
notebook there) and knit `analysis/codigo_NASA_UNAQ.Rmd`.

## Climate data (NASA POWER)

Real data downloaded from the NASA POWER API on 2026-11-14. No API key needed.
POWER is listed in the challenge resources: https://power.larc.nasa.gov/
Underlying source reported by the API: MERRA-2 (NASA GMAO reanalysis).

### `backend/data/climate/power_climatology_2001_2025_conus.csv`

Monthly and annual averages for 2001-2025 on the POWER native grid
(0.5 deg latitude x 0.625 deg longitude, about 55 km) over the box
lat 24 to 50, lon -125 to -65. 5,141 cells, one row per cell.
The box also includes ocean and parts of Canada and Mexico: filter by state if needed.

| Column | Meaning | POWER parameter |
| --- | --- | --- |
| lat, lon | Cell center, degrees | |
| elevation_m | Average elevation of the cell | |
| t_mean_c_jan ... t_mean_c_dec, t_mean_c_ann | Mean air temperature at 2 m, deg C | T2M |
| precip_mm_jan ... precip_mm_dec | Rain per month, mm. POWER gives mm/day; we multiplied by days in the month (Feb = 28.25) | PRECTOTCORR |
| precip_mm_ann | Sum of the 12 months, mm | PRECTOTCORR |

How it was downloaded: 36 requests (2 parameters x 18 tiles of up to 10 x 10 degrees) to

    https://power.larc.nasa.gov/api/temporal/climatology/regional?parameters={T2M|PRECTOTCORR}&community=AG&latitude-min={24|34|44}&latitude-max={34|44|50}&longitude-min={-125..-75 step 10}&longitude-max={min+10}&format=JSON

Example tile (open it in a browser to check):
https://power.larc.nasa.gov/api/temporal/climatology/regional?parameters=T2M&community=AG&latitude-min=34&latitude-max=44&longitude-min=-105&longitude-max=-95&format=JSON

### `backend/data/climate/power_annual_1991_2025_finney_ks.csv`

Yearly mean temperature and rain for the demo point (Finney County, Kansas,
lat 37.97, lon -100.87), 1991-2025. Used for the trend per decade.
precip_mm_year = mm/day x days in the year.

Source request:
https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M,PRECTOTCORR&community=AG&longitude=-100.87&latitude=37.97&start=1991&end=2025&format=JSON
(annual values are the keys ending in 13)

### Limits to state

- About 55 km per cell: regional climate, not field level.
- MERRA-2 is a model reanalysis, not a rain gauge. PRISM or CoCoRaHS (both in the challenge resources) can validate it locally.

### `backend/data/climate/power_monthly_2020_2025_conus.csv`

Monthly values, NOT averaged across years: one row per cell per month,
January 2020 to December 2025. Same grid and box as the climatology file
(5,141 cells x 72 months = 370,152 rows, about 15 MB).

| Column | Meaning | POWER parameter |
| --- | --- | --- |
| lat, lon, elevation_m | Cell center and elevation | |
| year, month | The month this row describes | |
| t_mean_c | Mean air temperature at 2 m that month, deg C | T2M |
| precip_mm_per_day | Average daily rain that month, as POWER gives it | PRECTOTCORR |
| precip_mm | Total rain that month = mm/day x days in that month (leap years counted) | PRECTOTCORR |

How it was downloaded: 36 requests (2 parameters x 18 tiles) to

    https://power.larc.nasa.gov/api/temporal/monthly/regional?parameters={T2M|PRECTOTCORR}&community=AG&latitude-min=..&latitude-max=..&longitude-min=..&longitude-max=..&start=2020&end=2025&format=JSON

Example tile:
https://power.larc.nasa.gov/api/temporal/monthly/regional?parameters=T2M&community=AG&latitude-min=34&latitude-max=44&longitude-min=-105&longitude-max=-95&start=2020&end=2025&format=JSON

POWER also returns a yearly value per cell (keys ending in 13); it is left out here.
Check done: for the Kansas demo cell, the 12 months of 2022 add up to 282 mm,
matching the 2022 annual value in power_annual_1991_2025_finney_ks.csv (0.77 mm/day).
