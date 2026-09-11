@echo off
REM Script para iniciar ambos servidores: API (Node.js) y Frontend (Python HTTP)

echo ========================================
echo Finanzas del Hogar - Dev Server Startup
echo ========================================
echo.

REM Verificar que estamos en la carpeta correcta
if not exist "api\package.json" (
    echo Error: No se encontro api\package.json
    echo Por favor, ejecuta este script desde la carpeta raiz del proyecto (FinanzasFamilia\)
    pause
    exit /b 1
)

if not exist "app\index.html" (
    echo Error: No se encontro app\index.html
    echo Por favor, ejecuta este script desde la carpeta raiz del proyecto (FinanzasFamilia\)
    pause
    exit /b 1
)

echo ✓ Estructura del proyecto verificada
echo.

REM Iniciar servidor API en nueva ventana
echo [1/2] Iniciando API en puerto 3000...
start "Finanzas API" cmd /k "cd api && npm run dev"

REM Esperar un poco para que el servidor API se inicie
timeout /t 2 /nobreak

REM Iniciar servidor Frontend en nueva ventana
echo [2/2] Iniciando Frontend en puerto 8080...
start "Finanzas Frontend" cmd /k "cd app && python -m http.server 8080"

echo.
echo ========================================
echo Servidores iniciados:
echo   - API:      http://localhost:3000
echo   - Frontend: http://localhost:8080
echo ========================================
echo.
echo Abre http://localhost:8080 en tu navegador
echo.
echo Las ventanas de ambos servidores permanecerán abiertas.
echo Cierra cualquiera de ellas para detener los servidores.
echo.
pause
