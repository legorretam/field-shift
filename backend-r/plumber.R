library(plumber)
library(dplyr)
library(mgcv)

# Cargar los modelos entrenados y las funciones desde el bundle
bundle <- readRDS("modelo_agro_bundle.rds")
list2env(bundle, envir = .GlobalEnv)

#* Permitir que tu página en Vercel se conecte sin bloqueos de seguridad (CORS)
#* @filter cors
function(req, res) {
  res$setHeader("Access-Control-Allow-Origin", "*")
  res$setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res$setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

  if (req$REQUEST_METHOD == "OPTIONS") {
    res$status <- 200
    return(list())
  }
  plumber::forward()
}

#* Ruta de prueba para comprobar que el servidor está encendido
#* @get /
#* @serializer unboxedJSON
function() {
  list(
    status = "ok",
    mensaje = "API Agronómica funcionando correctamente"
  )
}

#* Ruta principal que recibe coordenadas, clima y las 3 barras de prioridad
#* @post /api/recomendar
#* @serializer unboxedJSON
function(res, lat = 41.5, lon = -93.125, mes = 5,
         temp_actual = 18.5, precip_actual = 95,
         peso_agua = 50, peso_suelo = 30, peso_ingreso = 20) {

  # CAMBIO 15 nov: si el modelo no tiene datos para ese punto (mar, ciudad, fuera de EE.UU.)
  # antes tronaba con un 500 sin explicación. Ahora contesta un error claro que el
  # frontend muestra como "No crop data for this square".
  resultado <- NULL
  error_modelo <- NULL
  capture.output({
    resultado <- tryCatch(
      plan_completo_celda(
        lat           = as.numeric(lat),
        lon           = as.numeric(lon),
        mes           = as.integer(mes),
        temp_actual   = as.numeric(temp_actual),
        precip_actual = as.numeric(precip_actual),
        peso_agua     = as.numeric(peso_agua),
        peso_suelo    = as.numeric(peso_suelo),
        peso_ingreso  = as.numeric(peso_ingreso)
      ),
      error = function(e) {
        error_modelo <<- conditionMessage(e)
        NULL
      }
    )
  })

  if (is.null(resultado) || is.null(resultado$rotaciones) || NROW(resultado$rotaciones) == 0) {
    res$status <- 422
    return(list(
      status  = "error",
      mensaje = "Ubicación fuera de cobertura del modelo (solo tierras agrícolas de EE.UU. continental)",
      detalle = if (is.null(error_modelo)) "sin rotaciones" else error_modelo
    ))
  }

  # Devolver los resultados estructurados en JSON para el frontend
  list(
    status          = "ok",
    rotaciones      = resultado$rotaciones,
    extras_perennes = resultado$extras_perennes
  )
}
