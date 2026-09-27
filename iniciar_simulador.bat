@echo off
title Laboratorio Virtual de Dinamica Submarina
cd /d "%~dp0"

echo =====================================================================
echo   INICIANDO LABORATORIO VIRTUAL DE FISICA E INGENIERIA SUBMARINA
echo =====================================================================
echo.

:: 1. Prioridad: Node.js con servidor nativo de puerto dinamico
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Node.js detectado. Iniciando servidor HTTP local y abriendo navegador...
    node server.js
    goto end
)

:: 2. Alternativa: Python
where python >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Python detectado. Iniciando servidor en puerto 3000...
    start "" http://localhost:3000/index.html
    python -m http.server 3000
    goto end
)

where py >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Python (py) detectado. Iniciando servidor en puerto 3000...
    start "" http://localhost:3000/index.html
    py -m http.server 3000
    goto end
)

:: 3. Si no hay Node ni Python
echo.
echo [AVISO] No se detecto Node.js ni Python en el sistema.
echo Para ejecutar aplicaciones con modulos ES6 de Three.js se requiere un servidor HTTP local.
echo.
echo Opciones:
echo 1. Instala Node.js o Python.
echo 2. O en VS Code abre la carpeta y haz clic en "Open with Live Server" sobre index.html.
echo.
pause

:end
