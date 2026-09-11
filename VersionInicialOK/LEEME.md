# Finanzas del Hogar — app local

App 100% local. No hay servidor en la nube ni se envía nada a internet
(sólo se descargan las tipografías de Google Fonts; si estás sin conexión,
usa la tipografía del sistema y funciona igual).

## Cómo abrirla

### Opción A — doble clic (lo más simple)
Abrí `index.html` con **Chrome** o **Edge**.

- Los datos se guardan en el **almacenamiento del navegador** (IndexedDB).
  Persisten entre reinicios; se pierden sólo si borrás los datos de navegación
  de este sitio.
- Para respaldo y para llevar los datos a otra PC: botón **💾 → “Descargar copia (.sqlite)”**
  y, en la otra máquina, **💾 → “Importar archivo…”**.

### Opción B — servidor local (habilita el guardado directo en un archivo)
Si abrís la app desde `http://localhost`, además podés elegir un archivo
`finanzas.sqlite` en tu disco y la app lo **guarda sola con cada cambio**
(no hace falta descargar copias).

- **Windows:** doble clic en `servir.bat`
- **Mac / Linux:** `./servir.command` (o `python3 -m http.server 8080` dentro de esta carpeta)

Después entrá a `http://localhost:8080/` (Windows) o `http://localhost:8080/`
y, en el arranque, elegí dónde crear `finanzas.sqlite`.

## Primer arranque

Te pregunta cómo empezar:

| Opción | Qué hace |
|---|---|
| **Empezar con datos de ejemplo** | Carga datos de muestra para ver la app "en uso". |
| **Empezar de cero** | Base vacía. |
| **Abrir una base existente** | Elegís un `.sqlite` que ya tenías. |

## Qué hay adentro

- **Dashboard** — ingresos, gastos, ahorro del mes y acumulado, evolución.
- **Carga** — alta y edición de conceptos (un total por concepto y mes).
- **Presupuesto** — efectivo del hogar, objetivo 5% de ingresos, semáforo por billetera.
- **Cuentas y perfiles** — cuentas del hogar con propósito, saldo y moneda (ARS / USD / BTC).
- **Cotizaciones** — valor del dólar y del Bitcoin; el resto del sistema los usa.
- **Metas de ahorro** — objetivo + fechas; calcula cuánto apartar por mes.
- **Mes en curso** — estado pagado/pendiente de cada concepto y **cierre de mes**
  (congela el ahorro, copia los recurrentes al mes siguiente).

## Meses anteriores

- Con las flechas **‹ ›** de arriba te movés a cualquier mes.
- Si el mes no existe todavía, aparece un botón **"Crear …"** — lo creás y queda
  como cualquier otro mes: cargás conceptos, marcás pagos y lo cerrás.
- Un mes ya cerrado se puede **reabrir** (desde Carga o Mes en curso) para corregirlo.
- El **ahorro acumulado** se recalcula solo cuando cargás historia vieja o corregís un mes.
- En "Mes en curso" tenés **"Traer recurrentes"** para copiar los conceptos fijos a ese mes,
  y **"Eliminar período"** si creaste uno por error y está vacío.

## Notas

- Para montos con decimales usá la **coma** (`0,045`). El punto es separador de miles.
- El modelo de datos está documentado en `../modelo-datos.md`.
- El motor es SQLite (sql.js / WebAssembly) corriendo dentro del navegador;
  la base es un archivo `.sqlite` estándar que podés abrir con cualquier
  herramienta de SQLite.
