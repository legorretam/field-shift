# Field Shift

NASA Space Apps Challenge 2026, reto "Field Shift: Adapting Farms with NASA Data".
Una web para agricultores de Estados Unidos: marcan su parcela, dice qué siembra y qué le importa, y comparan 3 rotaciones explicadas con datos de NASA (clima, agua subterránea) y USDA (suelo, cultivos).

## Estructura

```
field-shift/
  frontend/   React + Vite. Lo que ve el usuario. (Marcelo)
  backend/    Python + FastAPI (versión anterior) y los CSV de NASA POWER en backend/data/climate/.
  backend-r/  plumber.R: la API de R que corre en Render (https://api-agro-r.onrender.com). (equipo backend)
  contract/   El formato JSON acordado entre los dos. NO se cambia sin avisar.
  REFERENCES.md  Todo recurso externo que usemos (obligatorio para la entrega).
```

Regla de oro: cada quien toca solo su carpeta.

## Correr el frontend (en tu Mac)

Necesitas Node.js 18 o más nuevo (`node -v` para ver).

```bash
cd frontend
npm install        # solo la primera vez
npm run dev        # abre http://localhost:5173
```

Sin configurar nada, habla con el modelo de R en Render. Para trabajar sin servidor, crea `frontend/.env.local` con `VITE_API_URL=sample` (se ve la etiqueta "Sample data").

## Correr el backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # en Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload        # http://localhost:8000/docs
```

## Conectar los dos

El frontend ya apunta a `https://api-agro-r.onrender.com` por defecto (ver `frontend/src/api.js`).
Para usar otro servidor, pon su URL en `VITE_API_URL` (en `.env.local` o en Vercel).

## El contrato (modelo de R)

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

## Publicar

- **Frontend en Vercel:** New Project → importa el repo → Root Directory: `frontend`. No necesita variables: ya usa la URL de Render.
- **Backend en Render:** New → Web Service → el repo → Root Directory: `backend` → Build: `pip install -r requirements.txt` → Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`.
- Render gratis se duerme: abre https://api-agro-r.onrender.com/ un minuto antes de cualquier demo. La app también lo despierta sola al abrirse.

## Rutina con GitHub Desktop

1. **Fetch / Pull** antes de empezar.
2. Trabaja.
3. Escribe un resumen corto → **Commit to main** → **Push origin**. Cada hora, mínimo.
