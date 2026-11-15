# Analysis

The R code and data the team used to build the Field Shift crop model. The website does not read
anything in this folder: it is here so anyone can see and rerun the work.

## Code

| File | What it does |
| --- | --- |
| `codigo_NASA_UNAQ.Rmd` | Builds the crop model from the data below and saves it as `modelo_agro_bundle.rds`. |

The model the website uses, and the API that serves it, are in [`../backend-r`](../backend-r):
`api.R` and `plumber.R` (the API), `Dockerfile` (how it runs on Render), `modelo_agro_bundle.rds`
(the trained model) and `llamar_archivo_rds.Rmd` (a short example of calling the model from R).

## Data (`data/`)

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

## Rerunning the model

Install R with the packages `sf`, `dplyr`, `tidyr`, `mgcv` and `ggplot2`. The notebook reads the
CSV files by name from its working directory, so set the working directory to `data/` (or copy the
notebook there) and knit `codigo_NASA_UNAQ.Rmd`.
