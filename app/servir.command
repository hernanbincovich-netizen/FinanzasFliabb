#!/bin/bash
# Sirve la app en http://localhost:8080 para habilitar el guardado directo en archivo.
cd "$(dirname "$0")"
( sleep 1; open http://localhost:8080/ 2>/dev/null || xdg-open http://localhost:8080/ 2>/dev/null ) &
python3 -m http.server 8080
