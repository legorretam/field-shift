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
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

DATA = Path(__file__).resolve().parent / "data"
SAMPLE = json.loads((DATA / "sample-response.json").read_text(encoding="utf-8"))
CROPS = json.loads((DATA / "crops.json").read_text(encoding="utf-8"))

POWER_URL = "https://power.larc.nasa.gov/api/temporal/climatology/point"
POWER_PARAMS = "T2M_MAX,T2M_MIN,PRECTOTCORR,GWETROOT"
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
            "grid_note": "NASA POWER cell ~55 km",
        },
        "climate": climate,
        # TODO: reemplazar por estrategias calculadas. Regla: 3 elementos, el primero is_current=True.
        "strategies": SAMPLE["strategies"],
        "sources": SAMPLE["sources"],
    }


def fetch_power_climate(lat: float, lon: float) -> dict:
    """Climatología mensual 2001-2020 de NASA POWER para un punto (sin API key)."""
    res = httpx.get(
        POWER_URL,
        params={
            "parameters": POWER_PARAMS,
            "community": "AG",
            "latitude": lat,
            "longitude": lon,
            "format": "JSON",
        },
        timeout=40,
    )
    res.raise_for_status()
    p = res.json()["properties"]["parameter"]

    monthly = []
    for i, key in enumerate(MONTH_KEYS):
        days = calendar.monthrange(2021, i + 1)[1]
        monthly.append(
            {
                "month": i + 1,
                # PRECTOTCORR viene en mm/día: lo pasamos a mm/mes.
                "precip_mm": round(p["PRECTOTCORR"][key] * days, 1),
                "t_max_c": round(p["T2M_MAX"][key], 1),
                "t_min_c": round(p["T2M_MIN"][key], 1),
                "soil_moisture_root": round(p["GWETROOT"][key], 2),
            }
        )

    # Reglas simples para arrancar; el equipo puede afinarlas (p. ej. con datos diarios).
    frost = [m["month"] for m in monthly if m["t_min_c"] <= 3]
    heat = [m["month"] for m in monthly if m["t_max_c"] >= 32]

    return {
        "period": "2001-2020",
        "monthly": monthly,
        "frost_risk_months": frost,
        "heat_stress_months": heat,
        "bare_field_months": [],
        "trend": None,  # TODO: calcular con la API mensual de POWER (temporal/monthly)
    }
