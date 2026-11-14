# Field Shift

NASA Space Apps Challenge 2026, reto "Field Shift: Adapting Farms with NASA Data".
Una web para agricultores de Estados Unidos: marcan su parcela, dice qué siembra y qué le importa, y comparan 3 rotaciones explicadas con datos de NASA (clima, agua subterránea) y USDA (suelo, cultivos).

## Estructura

```
field-shift/
  frontend/   React + Vite. Lo que ve el usuario. (Marcelo)
  backend/    Python + FastAPI. Datos de NASA y lógica de rotación. (equipo backend)
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

Sin configurar nada, usa los datos de ejemplo de `contract/` (se ve la etiqueta "Sample data").

## Correr el backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # en Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload        # http://localhost:8000/docs
```

## Conectar los dos

En `frontend/`, copia `.env.example` como `.env.local` y pon:

```
VITE_API_URL=http://localhost:8000
```

Reinicia `npm run dev`. La etiqueta "Sample data" desaparece y los datos vienen del backend.

## El contrato

- `GET /api/crops` → lista de `contract/crops.json`
- `POST /api/analyze` → recibe `{ lat, lon, current_rotation, priorities }` y regresa lo de `contract/sample-response.json`

`lat` y `lon` siempre llegan como el **centro de una celda** de la cuadrícula de NASA POWER: `lat = 24 + 0.5·i`, `lon = −125 + 0.625·j` (i, j enteros). Son los mismos valores de las columnas `lat` y `lon` de `backend/data/climate/power_climatology_2001_2025_conus.csv`, así que el backend puede buscar la fila directo.

Reglas: la unidad va en el nombre del campo (`_mm`, `_c`); puntajes de 0 a 100 (más alto es mejor); `strategies` tiene 3 elementos y el primero es la rotación actual; textos en inglés.
Si cambias el contrato, actualiza también las copias en `frontend/src/mock/` y `backend/data/`.

## Publicar

- **Frontend en Vercel:** New Project → importa el repo → Root Directory: `frontend` → en Environment Variables pon `VITE_API_URL` con la URL de Render.
- **Backend en Render:** New → Web Service → el repo → Root Directory: `backend` → Build: `pip install -r requirements.txt` → Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`.
- Render gratis se duerme: abre `/api/health` un minuto antes de cualquier demo.

## Rutina con GitHub Desktop

1. **Fetch / Pull** antes de empezar.
2. Trabaja.
3. Escribe un resumen corto → **Commit to main** → **Push origin**. Cada hora, mínimo.
