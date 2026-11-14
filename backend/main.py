"""Field Shift API.

Correr local:  uvicorn main:app --reload
Docs:          http://localhost:8000/docs

El formato de las respuestas es el del contrato (data/sample-response.json).
Hoy: el clima ya viene de NASA POWER en vivo; las estrategias todavía son las de ejemplo.
TODO equipo backend, en este orden:
  1. Generar las 3 estrategias a partir del clima + data/crops.json.
  2. "soil": USDA Soil Data Access (sin llave). Consulta SQL por punto,
     https://sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest
  3. "groundwater": tendencia GRACE-FO (Earthdata; se puede precalcular por región y guardar en data/).
  4. "cropland_history": CropScape GetCDLValue (pide coordenadas en Albers, EPSG:5070).
Los tres campos son opcionales: si no vienen, el frontend no los muestra.
Ver la forma exacta en data/sample-response.json.
"""

import calendar
import json
import re
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

DATA = Path(__file__).resolve().parent / "data"
SAMPLE = json.loads((DATA / "sample-response.json").read_text(encoding="utf-8"))
CROPS = json.loads((DATA / "crops.json").read_text(encoding="utf-8"))

POWER_URL = "https://power.larc.nasa.gov/api/temporal/climatology/point"
POWER_MONTHLY_URL = "https://power.larc.nasa.gov/api/temporal/monthly/point"
# OJO: en POWER, T2M_MAX y T2M_MIN son los extremos récord del mes, no el promedio diario.
# Por eso usamos T2M (media) y T2M_RANGE (amplitud diaria media): máx/mín medias = T2M ± RANGE/2.
POWER_PARAMS = "T2M,T2M_RANGE,PRECTOTCORR,GWETROOT,FROST_DAYS"
TREND_START, TREND_END = 1991, 2025
MONTH_KEYS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

app = FastAPI(title="Field Shift API")

# Permite que el frontend (Vercel o localhost) llame a esta API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Priorities(BaseModel):
    water: float = 0.34
    soil: float = 0.33
    income: float = 0.33


class AnalyzeRequest(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    current_rotation: list[str] = []
    priorities: Priorities = Priorities()


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/crops")
def crops():
    return CROPS


# Caja aproximada de los 48 estados contiguos (sin Alaska ni Hawái).
def in_us(lat: float, lon: float) -> bool:
    return 24.3 <= lat <= 49.5 and -125 <= lon <= -66.9


@app.post("/api/analyze")
def analyze(req: AnalyzeRequest):
    if not in_us(req.lat, req.lon):
        raise HTTPException(status_code=422, detail="Field Shift covers farms in the 48 contiguous states only.")
    try:
        climate = fetch_power_climate(req.lat, req.lon)
    except Exception as exc:  # NASA POWER caído o lento
        raise HTTPException(status_code=502, detail=f"NASA POWER no respondió: {exc}") from exc

    return {
        "location": {
            "lat": req.lat,
            "lon": req.lon,
            "label": None,
            "grid_note": "NASA POWER (MERRA-2) cell, about 55 km",
        },
        "climate": climate,
        # TODO: reemplazar por estrategias calculadas. Regla: 3 elementos, el primero is_current=True.
        "strategies": SAMPLE["strategies"],
        "sources": SAMPLE["sources"],
    }


def power_get(url: str, lat: float, lon: float, **extra) -> dict:
    res = httpx.get(
        url,
        params={"community": "AG", "latitude": lat, "longitude": lon, "format": "JSON", **extra},
        timeout=40,
    )
    res.raise_for_status()
    return res.json()


def fetch_power_climate(lat: float, lon: float) -> dict:
    """Climatología mensual de NASA POWER (MERRA-2) para un punto, sin API key."""
    body = power_get(POWER_URL, lat, lon, parameters=POWER_PARAMS)
    p = body["properties"]["parameter"]

    monthly = []
    for i, key in enumerate(MONTH_KEYS):
        days = calendar.monthrange(2021, i + 1)[1]
        t_mean, half = p["T2M"][key], p["T2M_RANGE"][key] / 2
        monthly.append(
            {
                "month": i + 1,
                # PRECTOTCORR viene en mm/día: lo pasamos a mm/mes.
                "precip_mm": round(p["PRECTOTCORR"][key] * days, 1),
                "t_mean_c": round(t_mean, 1),
                "t_max_c": round(t_mean + half, 1),  # máxima diaria media
                "t_min_c": round(t_mean - half, 1),  # mínima diaria media
                "frost_days": round(p["FROST_DAYS"][key], 1),
                "soil_moisture_root": round(p["GWETROOT"][key], 2),
            }
        )

    # Reglas simples para arrancar; el equipo puede afinarlas.
    frost = [m["month"] for m in monthly if m["frost_days"] >= 1]
    heat = [m["month"] for m in monthly if m["t_max_c"] >= 32]

    try:
        trend = fetch_power_trend(lat, lon)
    except Exception:  # la tendencia es opcional: sin ella el frontend no la muestra
        trend = None

    return {
        "period": climatology_period(body),
        "monthly": monthly,
        "frost_risk_months": frost,
        "heat_stress_months": heat,
        "bare_field_months": [],
        "trend": trend,
    }


def climatology_period(body: dict) -> str:
    """POWER dice el periodo en el encabezado, p. ej. '(January 2001 - December 2025)'."""
    years = re.findall(r"(?:19|20)\d{2}", body.get("header", {}).get("range", ""))
    return f"{years[0]}-{years[-1]}" if len(years) >= 2 else "2001-2025"


def slope(ys: list[float]) -> float:
    """Pendiente por año de una recta de mínimos cuadrados."""
    n = len(ys)
    mx, my = (n - 1) / 2, sum(ys) / n
    return sum((x - mx) * (y - my) for x, y in enumerate(ys)) / sum((x - mx) ** 2 for x in range(n))


def fetch_power_trend(lat: float, lon: float) -> dict:
    """Tendencia lineal por década con los promedios anuales de POWER (clave AAAA13)."""
    body = power_get(POWER_MONTHLY_URL, lat, lon, parameters="T2M,PRECTOTCORR", start=TREND_START, end=TREND_END)
    p = body["properties"]["parameter"]
    fill = body.get("header", {}).get("fill_value", -999)
    annual = lambda name: [v for k, v in sorted(p[name].items()) if k.endswith("13") and v != fill]
    temp, rain = annual("T2M"), annual("PRECTOTCORR")
    return {
        "period": f"{TREND_START}-{TREND_END}",
        "precip_change_pct_per_decade": round(slope(rain) * 10 / (sum(rain) / len(rain)) * 100, 1),
        "t_mean_change_c_per_decade": round(slope(temp) * 10, 2),
    }
