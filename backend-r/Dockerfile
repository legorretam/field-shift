FROM rocker/r-ver:4.3.2

RUN apt-get update && apt-get install -y \
    libcurl4-openssl-dev libssl-dev libxml2-dev libsodium-dev

RUN R -e "install.packages(c('plumber', 'dplyr', 'mgcv'), repos='https://cloud.r-project.org/')"

WORKDIR /app
COPY api.R modelo_agro_bundle.rds /app/

CMD ["R", "-e", "pr <- plumber::plumb('api.R'); pr$run(host='0.0.0.0', port=as.integer(Sys.getenv('PORT', 8000)))"]