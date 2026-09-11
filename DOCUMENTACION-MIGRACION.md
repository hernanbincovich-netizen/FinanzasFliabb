# Finanzas del Hogar — Documentación de migración a la nube

Este documento describe, con el máximo detalle posible, el funcionamiento de la app actual ("Finanzas del Hogar", versión local en `VersionInicialOK/index.html`) y las decisiones tomadas para migrarla a la arquitectura cloud (React/Vite + Vercel + Node/Express + Supabase). Está escrito para que ClaudeCode pueda usarlo como especificación de desarrollo, sin necesidad de releer el código viejo línea por línea.

Fecha de análisis: 11/09/2026. Analizado a partir del código fuente completo (`index.html`, `css/styles.css`, todos los `js/*.js` y `js/screens/*.js`) y de la base de datos real `finanzas.sqlite`.

---

## 1. Qué es la app actual (arquitectura de hoy)

Es una **single-page app 100% estática y local**, sin build, sin framework y sin backend:

- **HTML plano** (`index.html`) que carga, en orden, una cadena de `<script>` clásicos (no hay módulos ES ni bundler). Todo el código vive en un único namespace global `window.App`, poblado por IIFEs (`(function(App){ ... })(window.App = window.App || {})`) en cada archivo.
- **Motor de base de datos: SQLite real corriendo dentro del navegador**, vía [sql.js](https://github.com/sql-js/sql.js) (SQLite compilado a WebAssembly). El binario `.wasm` está embebido en base64 (`vendor/sql-wasm-base64.js`) precisamente para que la app funcione abriendo el `index.html` con doble clic (protocolo `file://`), sin servidor.
- **No hay red**: la única conexión saliente es a Google Fonts (con fallback a fuente de sistema si no hay conexión). No hay APIs externas, no hay cotizaciones automáticas, no hay servidor propio.
- **No hay autenticación ni multiusuario real**: es una app para "quien tenga el archivo o el navegador abierto". Los "integrantes" (Hernan, Xime) son simplemente filas de una tabla usadas para etiquetar a quién pertenece un concepto — no son cuentas de usuario, no hay login, no hay permisos.

### 1.1 Persistencia (cómo no se pierden los datos hoy)

Hay tres mecanismos combinados, en `js/db.js`:

1. **IndexedDB (respaldo automático permanente).** Después de cada mutación se llama a `markDirty()`, que dispara (con debounce de 400ms) `persistNow()`: exporta la base entera (`db.export()`, un `Uint8Array` con el archivo `.sqlite` completo) y la guarda como blob en IndexedDB (`finanzas-hogar` → object store `kv`, clave `snapshot`). Esto es lo que hace que los datos "persistan solos" en el navegador.
2. **File System Access API (opcional, solo Chrome/Edge).** El usuario puede elegir un archivo `finanzas.sqlite` en su disco (`showSaveFilePicker` / `showOpenFilePicker`). A partir de ahí, cada `persistNow()` también reescribe ese archivo completo en disco (`writeHandle()`). El handle del archivo se guarda en IndexedDB para poder "reconectar" en la siguiente sesión (requiere que el usuario confirme el permiso de nuevo, por seguridad del navegador).
3. **Export/import manual.** Botón "Descargar copia (.sqlite)" (descarga un blob) y "Importar archivo…" (input file que reemplaza la base activa por el `.sqlite` elegido).

Al arrancar (`js/main.js` → `run()` → `db.boot()`):
1. Intenta abrir primero el snapshot de IndexedDB (para que la app abra al instante).
2. Si el navegador soporta File System Access API y hay un handle guardado con permiso concedido, reabre ese archivo como fuente autoritativa (pisa lo anterior).
3. Si el permiso quedó en estado "prompt", muestra una pantalla de "reconectar archivo" antes de continuar.
4. Si no hay nada guardado, muestra el onboarding (ver 1.2).

**Consecuencia clave para la migración:** este esquema no tiene ningún concepto de sincronización ni resolución de conflictos. Si el mismo archivo se abriera en dos navegadores/dispositivos a la vez, cada uno mantiene su propia copia en memoria y sobreescribe el archivo en cada cambio: la última escritura gana y no hay merge. Es la razón central por la que hoy **dos personas no pueden usar la app en simultáneo de forma segura**, y es exactamente lo que la arquitectura cloud (base de datos centralizada en Supabase) resuelve.

### 1.2 Primer arranque / onboarding

Si no hay ninguna base disponible, `main.js` muestra un overlay con tres opciones:

- **Empezar con datos de ejemplo** → `db.createNew(withSeed=true)` → ejecuta `SCHEMA_SQL` y luego `App.seedDemo()` (datos ficticios de demostración, ver `js/seed.js`).
- **Empezar de cero** → `db.createNew(false)` → ejecuta `SCHEMA_SQL` y `App.bootstrapMinimo()` (settings default, integrantes "Hernan"/"Xime", categorías base, el período del mes actual).
- **Abrir una base existente** → importa un `.sqlite` ya existente.

Importante: **`seedDemo()` no es la base real**; es solo un dataset de muestra para mostrar la app "en uso". Los datos reales del usuario están en `finanzas.sqlite` (ver sección 6).

---

## 2. Modelo de datos actual (SQLite)

Este es el DDL completo tal como se ejecuta en `js/schema.js` (se ejecuta una única vez, al crear una base nueva; hay una migración idempotente en `db.js` que agrega `movimientos.fecha_vencimiento` si la base es vieja):

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE settings (
  clave TEXT PRIMARY KEY,
  valor TEXT
);

CREATE TABLE integrantes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  orden INTEGER DEFAULT 0
);

CREATE TABLE periodos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anio INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  estado TEXT NOT NULL DEFAULT 'abierto',           -- abierto | cerrado
  fecha_cierre TEXT,
  ingresos_mes REAL,
  gastos_mes REAL,
  ahorro_mes REAL,
  ahorro_acumulado REAL,
  cotiz_usd_ars_cierre REAL,
  cotiz_btc_usd_cierre REAL,
  UNIQUE(anio, mes)
);

CREATE TABLE categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL DEFAULT 'ambos',               -- gasto | ingreso | ambos
  color TEXT,
  orden INTEGER DEFAULT 0
);

CREATE TABLE cuentas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,                               -- caja_ahorro | cuenta_sueldo | billetera_efectivo | billetera_cripto | inversion | tarjeta_credito | otro
  titular_id INTEGER REFERENCES integrantes(id),
  proposito TEXT NOT NULL DEFAULT 'otro',           -- gastos_mes | efectivo_mes | ahorro_metas | fondo_emergencia | ahorro_largo_plazo | otro
  moneda TEXT NOT NULL DEFAULT 'ARS',               -- ARS | USD | BTC
  activa INTEGER NOT NULL DEFAULT 1,
  orden INTEGER DEFAULT 0
);

CREATE TABLE saldos_cuenta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cuenta_id INTEGER NOT NULL REFERENCES cuentas(id) ON DELETE CASCADE,
  periodo_id INTEGER REFERENCES periodos(id) ON DELETE SET NULL,
  fecha TEXT NOT NULL,
  saldo REAL NOT NULL DEFAULT 0,                    -- en la moneda de la cuenta
  nota TEXT
);

CREATE TABLE conceptos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,                               -- ingreso | gasto
  categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
  cuenta_id INTEGER REFERENCES cuentas(id) ON DELETE SET NULL,
  integrante_id INTEGER REFERENCES integrantes(id) ON DELETE SET NULL,
  moneda TEXT NOT NULL DEFAULT 'ARS',
  es_agrupado INTEGER NOT NULL DEFAULT 0,
  es_recurrente INTEGER NOT NULL DEFAULT 0,
  monto_referencia REAL,
  activo INTEGER NOT NULL DEFAULT 1,
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE movimientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  periodo_id INTEGER NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  concepto_id INTEGER NOT NULL REFERENCES conceptos(id) ON DELETE CASCADE,
  monto REAL NOT NULL DEFAULT 0,                    -- en 'moneda'
  moneda TEXT NOT NULL DEFAULT 'ARS',
  estado TEXT NOT NULL DEFAULT 'pendiente',         -- pendiente | pagado
  cuenta_id INTEGER REFERENCES cuentas(id) ON DELETE SET NULL,
  fecha_vencimiento TEXT,                           -- solo gastos, opcional
  monto_ars REAL,                                   -- NULL hasta el cierre del mes
  vino_de_recurrente INTEGER NOT NULL DEFAULT 0,
  nota TEXT,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(periodo_id, concepto_id)
);

CREATE TABLE presupuesto_efectivo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  periodo_id INTEGER NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  cuenta_id INTEGER NOT NULL REFERENCES cuentas(id) ON DELETE CASCADE,
  asignado REAL NOT NULL DEFAULT 0,                 -- en ARS
  UNIQUE(periodo_id, cuenta_id)
);

CREATE TABLE cotizaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  par TEXT NOT NULL,                                -- USD_ARS | BTC_USD
  valor REAL NOT NULL,
  fecha TEXT NOT NULL,
  periodo_id INTEGER REFERENCES periodos(id) ON DELETE SET NULL
);

CREATE TABLE metas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  moneda TEXT NOT NULL DEFAULT 'ARS',
  monto_objetivo REAL NOT NULL,
  monto_inicial REAL NOT NULL DEFAULT 0,            -- ya ahorrado al crearla
  fecha_inicio TEXT NOT NULL,                       -- YYYY-MM
  fecha_objetivo TEXT NOT NULL,                     -- YYYY-MM
  cuenta_id INTEGER REFERENCES cuentas(id) ON DELETE SET NULL,
  estado TEXT NOT NULL DEFAULT 'activa',            -- activa | cumplida | pausada | cancelada
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE meta_aportes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meta_id INTEGER NOT NULL REFERENCES metas(id) ON DELETE CASCADE,
  periodo_id INTEGER REFERENCES periodos(id) ON DELETE SET NULL,
  monto REAL NOT NULL,
  moneda TEXT NOT NULL DEFAULT 'ARS',
  fecha TEXT NOT NULL,
  nota TEXT
);

CREATE INDEX ix_mov_periodo ON movimientos(periodo_id);
CREATE INDEX ix_saldos_cuenta ON saldos_cuenta(cuenta_id, fecha);
CREATE INDEX ix_cotiz_par ON cotizaciones(par, fecha);
CREATE INDEX ix_aportes_meta ON meta_aportes(meta_id);
```

### 2.1 Cómo leer este modelo (relaciones clave)

- **`periodos`** = un mes calendario (año+mes) del hogar. Tiene estado `abierto`/`cerrado`. Cuando está `cerrado`, los campos `ingresos_mes/gastos_mes/ahorro_mes/ahorro_acumulado/cotiz_*_cierre` quedan **congelados** (snapshot histórico); mientras está `abierto`, esos totales se calculan en vivo a partir de `movimientos`.
- **`conceptos`** = la "plantilla" de un ítem recurrente o puntual (ej. "Sueldo Hernan", "Alquiler", "Gimnasio"). Vive independiente del mes. Guarda `categoria_id`, `cuenta_id` "default", `integrante_id` (a quién corresponde, informativo), si es `es_recurrente` (se recrea cada mes solo) y `es_agrupado` (engloba varios gastos reales sin desglose, ej. "Tarjeta").
- **`movimientos`** = la instancia de un `concepto` **en un `periodo` concreto**: el monto real de ese mes, moneda, estado `pendiente`/`pagado`, cuenta usada, vencimiento, y `monto_ars` (que solo se completa al cerrar el mes, congelando la conversión). Restricción `UNIQUE(periodo_id, concepto_id)`: un concepto aparece **una sola vez por mes** (no hay múltiples transacciones sueltas dentro de un mismo concepto — es carga por total, no por movimiento bancario individual).
- **`cuentas`** = cuentas bancarias, billeteras de efectivo, cripto, tarjetas, inversiones. Tienen `titular_id` (o compartida), `proposito` (para qué sirve: gastos del mes, efectivo del mes, ahorro/metas, fondo de emergencia, largo plazo, otro) y `moneda` propia (ARS/USD/BTC).
- **`saldos_cuenta`** = historial de saldos cargados a mano para cada cuenta (no hay integración bancaria; el usuario actualiza el saldo manualmente cuando quiere). El saldo "actual" de una cuenta es el último registro por fecha.
- **`cotizaciones`** = historial de tipos de cambio cargados a mano (USD→ARS y BTC→USD). La "vigente" es la última por fecha. **No hay integración con ninguna API de cotizaciones** — se preserva así en la versión cloud (decisión tomada, ver sección 8).
- **`presupuesto_efectivo`** = cuánto se asignó (en ARS) a cada billetera de efectivo, por período.
- **`metas` / `meta_aportes`** = objetivos de ahorro del hogar con fecha de inicio/objetivo (formato `YYYY-MM`), y los aportes registrados a lo largo del tiempo.
- **`settings`** = tabla clave/valor genérica. Usada hoy para `moneda_base`, `pct_efectivo_objetivo` (5% por defecto) y `periodo_actual_id` (qué período se considera "el actual").

### 2.2 Datos reales actuales (snapshot al momento del análisis)

Extraído directamente de `finanzas.sqlite` (no es el dataset de ejemplo de `seed.js`, es la base real del usuario):

| Tabla | Filas |
|---|---|
| periodos | 2 (agosto y septiembre 2026, **ambos "abierto"**, ninguno cerrado aún) |
| conceptos | 88 |
| movimientos | 78 |
| cuentas | 17 |
| integrantes | 2 (Hernan, Xime) |
| saldos_cuenta | 21 |
| categorias | 11 |
| cotizaciones | 2 |
| metas | 0 |
| meta_aportes | 0 |
| presupuesto_efectivo | 0 |

Esto confirma lo que indicaste: hay 2 meses reales cargados, ningún mes cerrado todavía, y las funciones de metas/presupuesto de efectivo están definidas pero sin uso real todavía en esta base.

---

## 3. Reglas de negocio (toda la lógica que hay que replicar)

Todo vive en `js/calc.js` (consultas + cálculos derivados) y `js/acciones.js` (mutaciones que tocan varias tablas a la vez). Es importante preservar exactamente estas reglas, porque son el verdadero "know-how" de la app:

### 3.1 Conversión de moneda

- `calc.aArs(monto, moneda)`: convierte cualquier monto a ARS usando la cotización **vigente** (la última cargada por fecha), no una cotización histórica por movimiento. Si `moneda === 'USD'` multiplica por `usdArs()`; si `'BTC'`, por `btcArs()` (= `btcUsd() * usdArs()`, es decir BTC→USD→ARS encadenado); si `'ARS'`, no convierte.
- Esto significa que, mientras un mes está **abierto**, los totales en ARS de meses viejos con montos en USD/BTC **se recalculan con la cotización de HOY**, no con la de aquel momento. Solo al **cerrar** el mes se congela la conversión real de ese momento (ver 3.3).

### 3.2 Cálculo de ingresos/gastos/ahorro de un período

- `calc.ingresos(periodoId)` / `calc.gastos(periodoId)`: si el período está `cerrado` y tiene el campo congelado (`ingresos_mes`/`gastos_mes`) no nulo, devuelve ese valor congelado. Si está `abierto` (o no tiene el campo congelado), lo calcula sumando `movimientos` de ese período convertidos a ARS con la cotización vigente.
- `ahorro = ingresos - gastos`.
- `calc.ahorroAcumulado()`: suma el ahorro de **todos** los períodos (usa `ahorroPeriodo`, que aplica la misma regla congelado/en vivo).
- `calc.acumHasta(periodo)`: acumulado cronológico hasta (inclusive) un período dado — usado para mostrar el acumulado en el dashboard al navegar meses hacia atrás.
- `recalcAcumulado()` (en `acciones.js`): recorre TODOS los períodos en orden cronológico y reescribe `ahorro_acumulado` en los que están cerrados. Se llama cada vez que cambia la estructura de períodos (crear, eliminar, reabrir un mes) para mantener consistencia.

### 3.3 Cierre de mes (`cerrarMes`) — la operación más importante del sistema

Cuando el usuario cierra el período que está viendo:

1. Valida que el período exista y esté `abierto`.
2. Toma la cotización USD/ARS y BTC/USD **vigentes en ese momento**.
3. Calcula `ingresos`, `gastos`, `ahorro = ingresos - gastos` del período (en vivo, con la cotización vigente).
4. Determina si es el **último período cronológico** de la base (`esUltimo`).
5. En una transacción:
   - Para cada `movimiento` del período, congela `monto_ars` = conversión a ARS con la cotización de ese momento (esto es lo que hace que, después de cerrado, ya no cambie aunque cambie la cotización vigente más adelante).
   - Actualiza el `periodo`: `estado='cerrado'`, `fecha_cierre=hoy`, `ingresos_mes`, `gastos_mes`, `ahorro_mes`, y las cotizaciones de cierre (`cotiz_usd_ars_cierre`, `cotiz_btc_usd_cierre`).
   - **Si era el último período**: crea automáticamente el mes siguiente (`abierto`), y para cada `concepto` con `es_recurrente=1` y `activo=1` crea un `movimiento` nuevo en `pendiente`, con `monto = monto_referencia` (o el monto del mes que se está cerrando si no hay referencia) y `fecha_vencimiento` corrida un mes (día conservado, recortado al último día del mes destino si no existe — ej. 31 de enero → 28/29 de febrero). También copia las filas de `presupuesto_efectivo` del mes cerrado al nuevo mes (mismo `asignado`).
   - Recalcula el acumulado (`recalcAcumulado`) y refija cuál es el "período actual" (`fijarPeriodoActual`, el `settings.periodo_actual_id`).
6. Si NO era el último (se está cerrando un mes viejo retroactivamente), no crea nada nuevo — solo congela ese mes y recalcula el acumulado.

### 3.4 Reapertura de mes (`reabrirMes`)

Descongela un período cerrado: vuelve `estado='abierto'`, pone en `NULL` todos los campos congelados (`fecha_cierre`, `ingresos_mes`, `gastos_mes`, `ahorro_mes`, `ahorro_acumulado`, cotizaciones de cierre) y también pone en `NULL` el `monto_ars` de todos sus movimientos (vuelven a calcularse en vivo). Luego recalcula el acumulado y refija el período actual. Se puede reabrir para corregir un error y volver a cerrar después.

### 3.5 "Traer recurrentes" (`traerRecurrentes`)

Copia al período todos los `conceptos` con `es_recurrente=1 AND activo=1` que **todavía no tengan** un `movimiento` en ese período, en estado `pendiente`, con el `monto_referencia` del concepto (o 0) y con `fecha_vencimiento` sugerida (corriendo la última fecha de vencimiento conocida de ese concepto la cantidad de meses correspondiente). Se usa manualmente desde "Mes en curso" cuando faltan recurrentes (por ejemplo, si el mes se creó a mano en vez de por cierre automático).

### 3.6 Crear / eliminar período

- `crearPeriodo(anio, mes)`: crea el período si no existe (no falla si ya existe, simplemente no hace nada), y refija el período actual.
- `eliminarPeriodo(periodoId)`: **solo permite borrar un período vacío** (sin movimientos, saldos, aportes de metas ni presupuesto de efectivo cargados) — si tiene datos, lanza error. Se usa para deshacer la creación accidental de un mes.

### 3.7 Conceptos y movimientos (alta, edición, borrado)

- `crearConcepto(d)`: inserta el `concepto` (con su `monto_referencia` solo si `es_recurrente`) y, en la misma transacción, el `movimiento` inicial en el período que se está editando. Requiere que el período exista y esté `abierto` (`periodoEditable()` — si no, lanza error explícito).
- `actualizarMovimiento(id, d)`: actualiza el movimiento (monto, moneda, estado, cuenta, nota, vencimiento). **Importante**: si se cambia la categoría, se actualiza en `conceptos.categoria_id` (no en el movimiento) — la categoría es un atributo del concepto compartido por todos los meses, pasados y futuros, no algo que varíe mes a mes.
- `setEstadoMovimiento(id, estado)`: toggle rápido pagado/pendiente (se usa clickeando el badge de estado en "Mes en curso").
- `borrarMovimiento(id, tambienConcepto)`: borra el movimiento; si `tambienConcepto=true` y el concepto no se usa en ningún otro período, borra también el concepto (esto pasa cuando se borra un concepto no-recurrente desde "Carga" — se asume de un solo uso).
- `crearCategoria(nombre, tipo)`: valida nombre único (case-insensitive), inserta con el siguiente `orden`. A propósito **no** llama a `markDirty()` (que dispara un re-render completo de la pantalla) para no perder lo que el usuario ya venía completando en el formulario abierto — solo persiste y el código que la llamó actualiza el `<select>` a mano. **Este detalle de UX (evitar perder el formulario en progreso al crear una entidad relacionada al vuelo) hay que preservarlo en el frontend nuevo.**

### 3.8 Cuentas y saldos

- `guardarCuenta(id, d)`: alta o edición de una cuenta.
- `actualizarSaldo(cuentaId, saldo, fecha, nota)`: inserta un nuevo registro histórico en `saldos_cuenta` (no actualiza uno existente — cada actualización de saldo queda en el historial). Se asocia al período que se está viendo (o al actual si no hay uno en foco).
- `calc.plataParaMes()` = suma en ARS de saldos de cuentas activas con propósito `gastos_mes` o `efectivo_mes`.
- `calc.plataParaAhorro()` = suma en ARS de cuentas con propósito `ahorro_metas`, `fondo_emergencia` o `ahorro_largo_plazo`.
- `calc.tarjetaAPagar()` = suma en ARS de cuentas con saldo negativo (tarjetas de crédito con deuda).

### 3.9 Presupuesto de efectivo (semáforo)

- Cada cuenta tipo `billetera_efectivo` tiene un monto `asignado` por período (`presupuesto_efectivo`, upsert vía `ON CONFLICT(periodo_id,cuenta_id)`).
- "Gastado" = `asignado - saldo_actual_de_la_billetera_en_ese_período` (si no hay saldo cargado para ese período, gastado = 0).
- Porcentaje = `gastado / asignado * 100`.
- Semáforo (`U.semaforo(pct)`): **verde** si `pct < 70`, **amarillo** si `70 ≤ pct ≤ 90`, **rojo** si `pct > 90`.
- El "objetivo" global de efectivo del hogar = `ingresos_del_mes * pct_efectivo_objetivo` (5% por defecto, en `settings`).

### 3.10 Metas de ahorro

- `metaAcum(meta)` = `monto_inicial + suma(meta_aportes.monto)`.
- `metaMesesRestantes(meta)` = meses entre el mes actual (`hoyYM()`) y `fecha_objetivo` (mínimo 1, para no dividir por cero o negativo).
- `metaAporteMensual(meta)` = `max(0, (monto_objetivo - metaAcum) / metaMesesRestantes)` — es decir, cuánto hay que apartar por mes de acá a la fecha objetivo para llegar. Se recalcula dinámicamente cada vez que se pinta la pantalla (no se guarda).
- El aporte es único por meta (no se distingue entre los dos integrantes — "el aporte es único entre los dos", según la propia descripción de la pantalla).

### 3.11 Formato y parseo de montos (convención es-AR) — `js/format.js`

- Formato de salida: `Intl.NumberFormat('es-AR')`, símbolos `$` (ARS), `US$` (USD), `₿` (BTC, con 4-8 decimales).
- **Parseo de entrada** (`parseMonto`): convención argentina donde el **punto es separador de miles y la coma es el separador decimal** (ej. `"1.234.567,89"` → `1234567.89`; `"45.000"` → `45000`; `"0,045"` → `0.045`). Esto es crítico preservarlo tal cual en los inputs de montos del frontend nuevo, incluyendo el soporte para BTC con muchos decimales.
- Fechas: se guardan como `TEXT` ISO (`YYYY-MM-DD` para movimientos/saldos/cotizaciones, `YYYY-MM` para metas), se muestran en formato `DD/MM/AAAA`.
- `shiftFechaMes(iso, deltaMeses)`: corre una fecha ISO una cantidad de meses conservando el día, recortado al último día del mes destino si no existe (usado para sugerir vencimientos de recurrentes).

---

## 4. Inventario funcional por pantalla

La navegación es por pestañas (sin URLs/routing — todo el estado de "en qué pantalla estoy" vive en memoria, `App.state`). Hay un selector de mes/año arriba (‹ mes actual ›) que aplica a todas las pantallas sensibles a período.

### 4.1 Dashboard
KPIs del mes (ingresos, gastos, ahorro del mes con % sobre ingresos, ahorro acumulado), gráfico de barras de gastos por categoría, gráfico de área de evolución del ahorro acumulado (últimos 12 meses), gráfico de líneas ingresos vs. gastos con tooltip interactivo al pasar el mouse.

### 4.2 Carga (alta y edición de conceptos)
Formulario de alta de concepto (nombre, tipo ingreso/gasto, monto, moneda, categoría —con alta rápida de categoría inline sin perder el formulario—, cuenta, integrante, estado inicial, vencimiento si es gasto, flags agrupado/recurrente). Tabla de conceptos cargados en el mes con edición inline (modal) y borrado. Si el mes está cerrado, la tabla es de solo lectura y aparece botón "Reabrir".

### 4.3 Presupuesto (efectivo)
KPIs de objetivo/asignado/gastado. Por cada billetera de efectivo: semáforo, barra de progreso, saldo cargado ese período, botones "Actualizar saldo" y "Asignar/editar monto".

### 4.4 Cuentas y perfiles
KPIs agregados (plata para el mes, plata para ahorro, tarjeta a pagar — todos con equivalente en USD). Tarjetas de perfil por integrante (billetera de efectivo, cuentas a su nombre). Tabla completa de cuentas con alta, edición y actualización de saldo (con historial).

### 4.5 Cotizaciones
Carga manual de USD/ARS y BTC/USD con fecha. Tabla de "cómo se está aplicando ahora" (qué cuentas/metas en otra moneda se convierten y con qué tipo de cambio). Historial de las últimas cotizaciones cargadas.

### 4.6 Metas de ahorro
Tarjetas por meta (acumulado, % de progreso, cuánto apartar por mes, meses restantes) con acciones registrar aporte / editar / eliminar. Tabla "plan mensual" con el total a apartar ese mes en ARS sumando todas las metas. Formulario de alta de meta nueva.

### 4.7 Mes en curso
KPIs del período (gastos del mes, pagado, pendiente). Selector para saltar a cualquier período ya creado. Botón "Traer recurrentes" (si faltan). Botón "Eliminar período" (solo si está vacío). Botón "Cerrar mes" (con confirmación, texto distinto si es el último período). Tabla de movimientos del mes con toggle pagado/pendiente por click. Si está cerrado: solo lectura + botón "Reabrir".

### 4.8 Navegación de períodos (global, en la topbar)
Flechas ‹ › para moverse mes a mes (límite 2015 hasta hoy+3 años). Si el mes no existe, la mayoría de las pantallas muestran una tarjeta "Crear [mes]" en vez de contenido.

### 4.9 Menú de archivo (💾) — **no aplica al modelo cloud**, se reemplaza por login/sesión
Hoy: elegir dónde guardar, descargar copia, importar archivo. En la versión cloud esto desaparece (los datos viven en Supabase, no en un archivo local); lo único que se conserva conceptualmente es "exportar copia" como feature de respaldo, si se desea.

### 4.10 Tema claro/oscuro
Toggle que alterna `data-theme` en `<html>` entre `dark`/`light`, cayendo al preference del sistema si no se eligió ninguno. Implementado 100% con variables CSS en `css/styles.css`. Se debe preservar en el frontend nuevo.

---

## 5. Arquitectura destino (según la imagen provista)

```
GitHub (código)
   ↓
Vercel (CI/CD automático)
   ├─→ Frontend (React + Vite)
   └─→ Backend (API REST — Node/Express, como Vercel Serverless Functions o alternativamente Railway/Render)
        ↓
   Supabase (PostgreSQL + Auth)
```

Flujo de datos de usuario:
1. Login en el frontend → Supabase Auth.
2. Token JWT (hoy en `localStorage` del lado del cliente).
3. Frontend llama al Backend con el token en el header `Authorization`.
4. Backend valida el token y consulta/actualiza Supabase (Postgres).
5. Respuesta de vuelta al frontend.

Carpetas propuestas:
```
/repo
├── frontend/ (React/Vite) — llamadas a /api/...
├── backend/ (Express) — endpoints REST autenticados
└── .github/workflows/ (deploy automático, si no se delega 100% en la integración nativa de Vercel con GitHub)
```

### 5.1 Decisiones de producto ya tomadas para esta migración (confirmadas con Hernan)

- **Multiusuario**: Hernan y Xime van a tener **cuentas separadas** (Supabase Auth, un usuario real cada uno), pero **ambos ven y editan los mismos datos del hogar** — no hay separación de datos por usuario, es una única base compartida entre los dos. Sin niveles de permiso diferenciados por ahora (ambos con acceso completo).
- **Cotizaciones**: se mantiene la **carga manual** de USD/ARS y BTC/USD, igual que hoy. No se integra ninguna API de cotizaciones en esta primera versión.
- **Datos reales**: se van a migrar los datos reales de `finanzas.sqlite`, pero con un flujo particular (ver sección 7): primero se arma y prueba la app nueva (con estos mismos datos u otros de prueba), y **recién antes de pasar a producción se resetea la base cloud y se recarga la información definitiva**, sin perder nada en el camino.

---

## 6. Modelo de datos destino (Supabase / PostgreSQL) — propuesta

Traducción del esquema SQLite a Postgres, con los ajustes que corresponden a un motor real multiusuario:

### 6.1 Cambios de tipos recomendados (y por qué)

| SQLite | Postgres propuesto | Motivo |
|---|---|---|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `bigint generated always as identity primary key` | Equivalente moderno en Postgres. |
| `INTEGER` (booleano 0/1: `activa`, `activo`, `es_recurrente`, `es_agrupado`) | `boolean` | Postgres tiene tipo booleano nativo; evita ambigüedad. |
| `REAL` (montos: `monto`, `saldo`, `ingresos_mes`, etc.) | `numeric(18,8)` | `REAL`/float acumula error de redondeo; para dinero (y sobre todo para BTC, que necesita hasta 8 decimales) conviene `numeric` de precisión exacta. |
| `TEXT` (fechas ISO `YYYY-MM-DD`) | `date` | Tipo nativo, permite comparar/ordenar sin trucos de texto. |
| `TEXT` (`YYYY-MM` en metas) | mantener como `text` (o `date` con día fijo en 1) | Es un mes, no un día — evaluar con ClaudeCode cuál es más simple de manejar en el front. |
| `TEXT` (timestamps `creado_en`/`actualizado_en`) | `timestamptz default now()` | Tipo nativo con zona horaria. |
| Sin dueño de fila | agregar `created_by uuid references auth.users(id)` en las tablas donde tenga sentido saber quién cargó el dato (`movimientos`, `saldos_cuenta`, `meta_aportes`, `cotizaciones`) | Hoy "integrante" es solo una etiqueta informativa; con Auth real conviene además registrar qué usuario autenticado hizo cada carga, útil para trazabilidad aunque ambos tengan el mismo nivel de acceso. |

### 6.2 Estructura de tablas

Se mantienen las mismas 11 tablas de negocio (se descarta `sqlite_sequence`, que es interna de SQLite). Nombres de tabla y columna **se mantienen en español, iguales a los actuales**, para minimizar el riesgo de traducción y que el mapeo de datos sea 1 a 1.

No hay tabla de "hogares" — se asume **un solo hogar** (el de Hernan y Xime) para toda la base, ya que el alcance definido es 2 usuarios compartiendo los mismos datos, no una plataforma multi-hogar. Si en el futuro se quisiera ofrecer esto a otras familias, se agregaría una tabla `hogares` y una columna `hogar_id` en cada tabla — se deja como nota para no sobre-diseñar ahora.

### 6.3 Seguridad de acceso (Row Level Security en Supabase)

Dado que **ambos usuarios autenticados deben ver y editar exactamente los mismos datos** (no hay separación por usuario), la política de RLS más simple y correcta es:

- Habilitar RLS en todas las tablas.
- Una política por tabla que permite `SELECT`/`INSERT`/`UPDATE`/`DELETE` a cualquier usuario autenticado (`auth.role() = 'authenticated'`), sin filtrar por `created_by` ni por ningún otro campo — porque el requisito es "mismos datos para los dos", no aislamiento.
- Esto es intencionalmente simple: sirve para 2 usuarios de un mismo hogar. Si mañana se agregan más hogares, ahí sí habría que migrar a políticas que filtren por `hogar_id = (select hogar_id from perfiles where user_id = auth.uid())`.

Esto reemplaza por completo el control de acceso "físico" de hoy (quien tenga el archivo `.sqlite` o el navegador).

---

## 7. Plan de migración de datos (según lo decidido)

Flujo acordado: **no** se migra en un solo paso definitivo. Se necesita poder correr la migración más de una vez, de forma segura y repetible:

1. **Fase de desarrollo/prueba**: se migran los datos reales actuales (o un subconjunto/copia de ellos) a la base Supabase de desarrollo, para poder construir y probar la app nueva contra datos reales (no solo datos de ejemplo).
2. **Fase de puesta en producción**: una vez que la app está probada y validada, se **resetea** la base de datos cloud (se vacían todas las tablas de negocio) y se **vuelve a correr la migración desde cero** contra `finanzas.sqlite` en su estado más actualizado a ese momento (por si en el medio se siguió usando la app vieja en paralelo), quedando esa recarga como la definitiva.

Esto implica que el script de migración debe ser:

- **Idempotente y repetible**: correrlo dos veces no debe duplicar datos. Ideas concretas para ClaudeCode:
  - Un script en Node o Python que lee `finanzas.sqlite` con un driver de SQLite (ej. `better-sqlite3` en Node, o `sqlite3` en Python) y hace upsert/insert ordenado por dependencias (`integrantes` → `categorias` → `cuentas` → `periodos` → `conceptos` → `movimientos` → `saldos_cuenta` → `cotizaciones` → `metas` → `meta_aportes` → `presupuesto_efectivo`).
  - Un comando explícito de "reset" que trunca (TRUNCATE ... RESTART IDENTITY CASCADE) las tablas de negocio en Supabase antes de recargar, para poder ejecutar la migración definitiva sin arrastrar datos de prueba.
  - Mapeo de IDs: como Postgres va a generar sus propios IDs autoincrementales (o se pueden preservar los mismos IDs enteros de SQLite, ya que no hay razón técnica para no hacerlo — no son UUIDs hoy). **Recomendación: preservar los mismos IDs enteros** en la migración (usar `INSERT ... OVERRIDING SYSTEM VALUE` o simplemente insertar los IDs explícitos y después ajustar la secuencia con `setval`), así las relaciones (`concepto_id`, `cuenta_id`, etc.) se copian tal cual sin tener que reconstruir un mapeo de IDs viejo→nuevo.
- Un modo "dry-run" que reporte cuántas filas se migrarían por tabla sin escribir nada, útil para verificar antes de la corrida definitiva.

No se pierde nada en el camino porque `finanzas.sqlite` sigue siendo la fuente de verdad hasta el día del corte definitivo — la app vieja puede seguir usándose en paralelo mientras se prueba la nueva, y recién se apaga cuando se hace la recarga final.

---

## 8. Alcance y decisiones fuera de esta primera versión

Para que quede explícito y ClaudeCode no lo dé por sentado:

- **No** se integra ninguna API externa de cotizaciones (USD/BTC): se mantiene carga manual, igual que hoy.
- **No** se rediseña el modelo a multi-hogar/multi-tenant: es una base compartida para 2 usuarios de un mismo hogar.
- **No** se definieron todavía niveles de permiso diferenciados entre Hernan y Xime — ambos con acceso completo por ahora.
- El uso **offline** que tenía la app vieja (funcionar sin conexión, con IndexedDB como única fuente) **se pierde** al pasar a una arquitectura cliente-servidor: la nueva app va a necesitar conexión a internet para leer/escribir datos. Si esto es un problema en la práctica, es un tema a conversar aparte (por ejemplo, cacheo local de solo lectura) — no está resuelto en este documento.
- No se definió aún si se van a revisar las carpetas `api/`, `app/`, `.git`, `MigraVercel` que existen junto a `VersionInicialOK` en la carpeta del proyecto (posible intento de migración anterior) — por ahora este documento parte exclusivamente del análisis de `VersionInicialOK`, sin asumir nada de esas carpetas.

---

## 9. Referencia rápida: superficie de "acciones" (para diseñar los endpoints del backend)

Cada función de `App.acciones` (hoy client-side, tocando sql.js directamente) es candidata directa a un endpoint REST en el backend Express:

| Acción actual | Qué hace | Tablas que toca |
|---|---|---|
| `crearConcepto` | Alta de concepto + su movimiento inicial en el período editable | `conceptos`, `movimientos` |
| `actualizarMovimiento` | Edita un movimiento (y la categoría del concepto si cambió) | `movimientos`, `conceptos` |
| `setEstadoMovimiento` | Toggle pagado/pendiente | `movimientos` |
| `borrarMovimiento` | Borra movimiento (y concepto si quedó huérfano y no es recurrente) | `movimientos`, `conceptos` |
| `crearCategoria` | Alta rápida de categoría | `categorias` |
| `guardarCuenta` | Alta/edición de cuenta | `cuentas` |
| `actualizarSaldo` | Inserta nuevo registro histórico de saldo | `saldos_cuenta` |
| `setCotizacion` | Inserta nueva cotización | `cotizaciones` |
| `guardarMeta` | Alta/edición de meta | `metas` |
| `registrarAporte` | Inserta aporte a una meta | `meta_aportes` |
| `borrarMeta` | Elimina meta (cascada a sus aportes) | `metas`, `meta_aportes` |
| `guardarAsignadoEfectivo` | Upsert de asignación de efectivo por período/cuenta | `presupuesto_efectivo` |
| `cerrarMes` | Congela el mes, crea el siguiente si corresponde, copia recurrentes y presupuesto | `periodos`, `movimientos`, `conceptos` (lectura), `presupuesto_efectivo` |
| `reabrirMes` | Descongela un mes cerrado | `periodos`, `movimientos` |
| `crearPeriodo` / `eliminarPeriodo` | Alta/baja de período (baja solo si está vacío) | `periodos` |
| `traerRecurrentes` | Copia recurrentes faltantes al período | `movimientos` (lectura de `conceptos`) |
| `recalcAcumulado` | Recalcula `ahorro_acumulado` de todos los períodos cerrados | `periodos` (lectura de todos, escritura en cerrados) |

Todas estas operaciones que tocan más de una tabla se ejecutan hoy dentro de una transacción SQL (`db.tx`) — el backend nuevo debe preservar esa atomicidad (transacciones de Postgres) para no dejar datos a medio actualizar, especialmente en `cerrarMes` y `crearConcepto`.

---

## 10. Notas finales para el desarrollo frontend

- Preservar la convención numérica es-AR (punto miles, coma decimal) tanto para mostrar como para parsear inputs — es la función `parseMonto` de `format.js`, reproducida en la sección 3.11.
- Preservar el detalle de UX de "crear categoría sin perder el formulario abierto" (sección 3.7).
- Los gráficos (barras, área, líneas con tooltip) están hechos a mano en SVG — se pueden reconstruir con cualquier librería de charts en React (o mantenerse a mano), no hay lógica de negocio en ellos, son puramente presentación de los datos que ya calcula el backend.
- Tema claro/oscuro con variables CSS — revisar `css/styles.css` al momento de portar estilos si se quiere mantener la identidad visual exacta.
- No hay routing por URL hoy (todo es estado en memoria); en la versión cloud conviene agregar rutas reales (`/dashboard`, `/carga`, etc.) ya que React Router (o el router de Vite que se elija) lo da prácticamente gratis, y mejora la experiencia (recargar la página, compartir un link a una pantalla puntual).
