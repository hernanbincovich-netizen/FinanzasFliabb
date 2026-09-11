@echo off
REM Sirve la app en http://localhost:8080 para habilitar el guardado directo en archivo.
cd /d "%~dp0"
where py >nul 2>nul && (start "" http://localhost:8080/ & py -m http.server 8080 & goto :eof)
where python >nul 2>nul && (start "" http://localhost:8080/ & python -m http.server 8080 & goto :eof)
echo No se encontro Python. Instalalo desde https://www.python.org/ o abri index.html directamente con Chrome/Edge.
pause
