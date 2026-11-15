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
function() {
  list(
    status = "ok",
    mensaje = "API Agronómica funcionando correctamente"
  )
}

#* Ruta principal que recibe coordenadas, clima y las 3 barras de prioridad
#* @post /api/recomendar
#* @serializer unboxedJSON
function(lat = 41.5, lon = -93.125, mes = 5,
         temp_actual = 18.5, precip_actual = 95,
         peso_agua = 50, peso_suelo = 30, peso_ingreso = 20) {
  
  # Ejecutar el motor de decisión silenciosamente (sin llenar la consola de texto)
  resultado <- NULL
  capture.output({
    resultado <- plan_completo_celda(
      lat           = as.numeric(lat),
      lon           = as.numeric(lon),
      mes           = as.integer(mes),
      temp_actual   = as.numeric(temp_actual),
      precip_actual = as.numeric(precip_actual),
      peso_agua     = as.numeric(peso_agua),
      peso_suelo    = as.numeric(peso_suelo),
      peso_ingreso  = as.numeric(peso_ingreso)
    )
  })
  
  # Devolver los resultados estructurados en JSON para el frontend
  list(
    status          = "ok",
    rotaciones      = resultado$rotaciones,
    extras_perennes = resultado$extras_perennes
  )
}