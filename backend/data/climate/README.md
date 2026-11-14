# Climate data (NASA POWER)

Real data downloaded from the NASA POWER API on 2026-11-14. No API key needed.
POWER is listed in the challenge resources: https://power.larc.nasa.gov/
Underlying source reported by the API: MERRA-2 (NASA GMAO reanalysis).

## power_climatology_2001_2025_conus.csv

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

## power_annual_1991_2025_finney_ks.csv

Yearly mean temperature and rain for the demo point (Finney County, Kansas,
lat 37.97, lon -100.87), 1991-2025. Used for the trend per decade.
precip_mm_year = mm/day x days in the year.

Source request:
https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M,PRECTOTCORR&community=AG&longitude=-100.87&latitude=37.97&start=1991&end=2025&format=JSON
(annual values are the keys ending in 13)

## Limits to state

- About 55 km per cell: regional climate, not field level.
- MERRA-2 is a model reanalysis, not a rain gauge. PRISM or CoCoRaHS (both in the challenge resources) can validate it locally.

## power_monthly_2020_2025_conus.csv

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
