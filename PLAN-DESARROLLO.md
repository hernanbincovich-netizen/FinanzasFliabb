# Plan de Desarrollo — Finanzas del Hogar (Cloud)

**Objetivo**: Migrar app funcional local → cloud con arquitectura React/Vite + Vercel Serverless + Supabase.  
**MVP**: Pantalla "Mes en curso" (tabla de movimientos, KPIs, acciones pagado/pendiente, cierre de mes).  
**Estilo de trabajo**: Agile, sprints de 1-2 semanas, testing progresivo (dev + manual owner).

---

## Arquitectura General (Scaffolding)

```
/FinanzasFamilia (repo raíz)
├── frontend/                  (React/Vite)
│   ├── src/
│   │   ├── components/        (componentes reutilizables)
│   │   ├── pages/             (pantallas: Dashboard, MesCurso, Cuentas, etc.)
│   │   ├── hooks/             (useAuth, usePeriodos, useMovimientos)
│   │   ├── api/               (cliente HTTP → backend)
│   │   ├── services/          (lógica de negocio del cliente)
│   │   ├── styles/            (CSS variables, temas claro/oscuro)
│   │   ├── types/             (TypeScript tipos compartidos)
│   │   └── App.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   └── .env.example
│
├── backend/                   (Node/Express, Vercel Serverless)
│   ├── api/
│   │   ├── auth.ts            (login, logout, refresh token)
│   │   ├── periodos.ts        (crear, listar, cerrar, reabrir)
│   │   ├── movimientos.ts     (CRUD, setEstado)
│   │   ├── conceptos.ts       (CRUD)
│   │   ├── cuentas.ts         (CRUD, saldos)
│   │   └── [...otros endpoints]
│   ├── middleware/
│   │   ├── auth.ts            (verificar JWT)
│   │   └── errors.ts          (manejo de errores)
│   ├── db/
│   │   ├── client.ts          (cliente Supabase)
│   │   ├── schema.sql         (DDL Postgres)
│   │   └── migrations/        (si se usa algo como Flyway)
│   ├── utils/
│   │   ├── calc.ts            (lógica de cálculos: ingresos, gastos, etc.)
│   │   ├── format.ts          (parseMonto, formatFecha, conversión monedas)
│   │   └── transactions.ts    (helper para transacciones Postgres)
│   ├── tests/
│   │   ├── unit/              (unit tests de calc.ts, format.ts)
│   │   └── integration/       (tests e2e de endpoints)
│   ├── vercel.json            (configuración Vercel Functions)
│   ├── package.json
│   └── .env.example
│
├── scripts/
│   ├── migrate.js             (SQLite → Postgres, idempotente)
│   ├── reset-db.js            (truncate tablas para reset)
│   └── seed-demo.js           (cargar dataset de ejemplo)
│
├── .github/workflows/         (CI/CD si se desea)
│   └── deploy.yml
│
├── docs/
│   ├── API.md                 (especificación endpoints REST)
│   └── DB-SCHEMA.md           (schema Postgres comentado)
│
└── PLAN-DESARROLLO.md (este archivo)
```

---

## Sprint 0: Setup & Scaffolding (2-3 días)

**Objetivo**: Infraestructura lista, primer deploy vacío, auth funcional.

### 0.1 Repos & Git
- [ ] Crear repo en GitHub (o usar existente `master`)
- [ ] Clonar/resetear localmente
- [ ] Ramas: `main` (producción), `develop` (integración), features por sprint

### 0.2 Supabase
- [ ] Crear proyecto Supabase (o usar existente)
- [ ] Ejecutar `schema.sql` (DDL Postgres — ver sección abajo)
- [ ] Habilitar **Row Level Security** en todas las tablas
  - Política simple: `auth.role() = 'authenticated'` → acceso completo (ambos usuarios = mismo hogar)
- [ ] Configurar Supabase Auth (email/password, no OAuth por ahora)
- [ ] Copiar `SUPABASE_URL` y `SUPABASE_ANON_KEY` a `.env`

### 0.3 Vercel & Backend
- [ ] Conectar repo a Vercel (auto-deploy en push a `main`)
- [ ] Crear carpeta `backend/`, inicializar `package.json`
- [ ] Dependencias: `express`, `@supabase/supabase-js`, `dotenv`, `typescript`, `tsx` (o `ts-node`)
- [ ] Crear `backend/api/index.ts` (handler raíz que Vercel ejecuta)
- [ ] Crear `backend/vercel.json` (configurar que `/api/*` apunte a las functions)
- [ ] Crear `backend/.env.example` con vars necesarias
- [ ] Test: `POST /api/auth/register` y `POST /api/auth/login` funcionales (dummy)

### 0.4 Frontend
- [ ] Crear carpeta `frontend/`, inicializar con Vite
  ```bash
  npm create vite@latest frontend -- --template react-ts
  cd frontend && npm install
  ```
- [ ] Instalar dependencias:
  - `@supabase/supabase-js` (cliente Supabase)
  - `react-router-dom` (routing)
  - `zustand` o `jotai` (state management, alternativa a Redux)
  - Opcionalmente: `date-fns` para manejo de fechas, `recharts` o `visx` para gráficos
- [ ] Crear `frontend/.env.example` con `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- [ ] Crear estructura básica: `src/App.tsx`, `src/pages/`, `src/components/`
- [ ] Test: página de login renderiza sin errores

### 0.5 Script de migración (primer borrador)
- [ ] Crear `scripts/migrate.js` (Node)
  - Lee `finanzas.sqlite` con `better-sqlite3`
  - Conecta a Supabase
  - Inserta tablas en orden de dependencias (integrantes → categorias → cuentas → periodos → conceptos → movimientos → etc.)
  - **Idempotencia**: usa `ON CONFLICT DO UPDATE` o valida "si ya existe, no insertar"
  - Modo `--dry-run` para previsualizaciones
- [ ] Test: `node scripts/migrate.js --dry-run` muestra conteo de filas sin escribir nada

### 0.6 Testing setup
- [ ] Backend: `vitest` o `jest` + test básico de auth
- [ ] Frontend: `vitest` + React Testing Library

**Entregable**: Repo deployado en Vercel (vacío), auth funcional, DB vacía con RLS habilitado.

---

## Sprint 1: Backend + Lógica de Cálculos (1 semana)

**Objetivo**: Endpoints REST completos para "Mes en curso", lógica de negocio replicada.

### 1.1 Auth endpoints
- [ ] `POST /api/auth/register` → crear usuario Supabase, devolver JWT
- [ ] `POST /api/auth/login` → validar email/password, devolver JWT + refresh token
- [ ] `POST /api/auth/refresh` → renovar JWT
- [ ] Middleware `verifyAuth` que valida JWT en header `Authorization`

### 1.2 Periodos endpoints
- [ ] `GET /api/periodos` → listar todos (o paginar)
- [ ] `GET /api/periodos/:id` → detalle de un período + KPIs (ingresos, gastos, ahorro)
- [ ] `POST /api/periodos` → crear período (año, mes)
- [ ] `POST /api/periodos/:id/cerrar` → cerrar mes (operación crítica, ver 1.4)
- [ ] `POST /api/periodos/:id/reabrir` → reabrir mes cerrado

### 1.3 Movimientos endpoints
- [ ] `GET /api/periodos/:periodoId/movimientos` → listar movimientos del período
- [ ] `POST /api/periodos/:periodoId/movimientos` → crear movimiento
- [ ] `PATCH /api/movimientos/:id` → editar movimiento (monto, moneda, estado, etc.)
- [ ] `PATCH /api/movimientos/:id/estado` → toggle pagado/pendiente (rápido)
- [ ] `DELETE /api/movimientos/:id` → borrar movimiento

### 1.4 Conceptos endpoints
- [ ] `GET /api/conceptos` → listar conceptos
- [ ] `POST /api/conceptos` → crear concepto
- [ ] `PATCH /api/conceptos/:id` → editar concepto
- [ ] `DELETE /api/conceptos/:id` → borrar concepto

### 1.5 Lógica de cálculos (`backend/utils/calc.ts`)
Replicar exactamente las funciones de `js/calc.js` en Node:
- [ ] `aArs(monto, moneda)` → convierte a ARS con cotización vigente
- [ ] `ingresos(periodoId)` → suma movimientos ingresos (congelado si cerrado, en vivo si abierto)
- [ ] `gastos(periodoId)` → suma movimientos gastos
- [ ] `ahorro(periodoId)` → ingresos - gastos
- [ ] `ahorroAcumulado()` → suma de todos los períodos
- [ ] `cotizacionVigente(par)` → última cotización cargada de USD_ARS o BTC_USD

### 1.6 Operación crítica: cerrar mes
`POST /api/periodos/:id/cerrar` implementa la lógica completa de `acciones.cerrarMes`:
- [ ] Validar período existe y está abierto
- [ ] Tomar cotizaciones vigentes
- [ ] Calcular ingresos, gastos, ahorro
- [ ] **Transacción Postgres**:
  - Para cada movimiento: freeze `monto_ars`
  - Actualizar período: `estado='cerrado'`, campos congelados
  - Si es último período: crear siguiente mes + copiar recurrentes
  - Recalcular acumulado de todos los períodos cerrados
- [ ] Respuesta: período cerrado + nuevo período creado (si corresponde)

**Tests**:
- [ ] Unit: `calc.aArs()` convierte correctamente
- [ ] Unit: `calc.ingresos()` suma bien
- [ ] Integration: `POST /api/periodos/:id/cerrar` congela y crea siguiente mes

**Entregable**: Backend completo, todos los endpoints para "Mes en curso" funcionales, base vacía lista.

---

## Sprint 2: Frontend Base + Pantalla Lectura (1 semana)

**Objetivo**: UI funcional para "Mes en curso", mostrar datos (solo lectura).

### 2.1 Estructura React
- [ ] `src/App.tsx` con React Router
- [ ] Layout principal: topbar (selector mes/año + tema) + sidebar (nav) + main content
- [ ] Rutas:
  - `/login` → pantalla login
  - `/mes-en-curso` → pantalla principal
  - `/dashboard`, `/carga`, etc. (placeholder por ahora)

### 2.2 Auth flow (componentes)
- [ ] Hook `useAuth()` → maneja login/logout/estado
- [ ] Componente `LoginPage` → form email/password
- [ ] Componente `PrivateRoute` → redirect a login si no autenticado
- [ ] Guardar JWT en `localStorage` (o sessionStorage)

### 2.3 Estado global (Zustand/Jotai)
- [ ] Store `usePeriodoStore` → periodo actual, lista de períodos
- [ ] Store `useMovimientosStore` → movimientos del período actual
- [ ] Hook `useFetchPeriodos()` → llamar backend, llenar stores
- [ ] Hook `useFetchMovimientos(periodoId)` → idem para movimientos

### 2.4 Pantalla "Mes en curso" - Lectura
Componentes:
- [ ] `MesCursoPage.tsx` (página principal)
  - [ ] Selector período (flechas ‹ › para navegar mes a mes)
  - [ ] Validar si período existe; si no, mostrar card "Crear [mes]"
  - [ ] `KPICard` (ingresos, gastos, ahorro del mes, ahorro acumulado)
  - [ ] `MovimientosTable` (tabla read-only de movimientos)
    - Columnas: concepto, categoría, monto, moneda, estado (pagado/pendiente), cuenta, vencimiento
    - Orden: por categoría o por fecha
  - [ ] Botones: "Traer recurrentes", "Cerrar mes", "Reabrir" (si está cerrado)

Componentes reutilizables:
- [ ] `KPICard.tsx` → mostrar KPI (label + valor + % si aplica)
- [ ] `MovimientosTable.tsx` → tabla con datos
- [ ] `PeriodoSelector.tsx` → flechas y selector mes/año
- [ ] `BadgeEstado.tsx` → chip pagado/pendiente (styling)

### 2.5 API client (`src/api/client.ts`)
- [ ] Función helper `apiCall(method, path, body?, options?)`
- [ ] Maneja JWT en headers, refresh token automático
- [ ] Maneja errores (401 → logout, 4xx → toast de error, 5xx → error server)
- [ ] Endpoints específicos:
  - `auth.login(email, password)`
  - `periodos.listar()`
  - `periodos.obtener(id)`
  - `movimientos.listar(periodoId)`

### 2.6 Estilos
- [ ] Variables CSS (tema claro/oscuro heredadas de `styles.css` viejo)
- [ ] Layout responsive (mobile first)
- [ ] Temas: implementar toggle claro/oscuro en topbar

### 2.7 Manejo de errores & edge cases
- [ ] Si período vacío (sin movimientos), mostrar "Este mes no tiene movimientos"
- [ ] Si período no existe, mostrar opción "Crear período"
- [ ] Si se desconecta (500), mostrar error con retry
- [ ] Loading states (skeleton, spinner)

**Tests**:
- [ ] Unit: `useAuth()` hook maneja login/logout
- [ ] Integration: MesCursoPage carga datos y renderiza tabla
- [ ] Manual: abrir página, ver movimientos, navegar períodos

**Entregable**: Frontend funcional mostrando "Mes en curso", sin edición aún, base vacía.

---

## Sprint 3: Pantalla Edición + Acciones Simples (1 semana)

**Objetivo**: Crear, editar, toggle estado de movimientos.

### 3.1 Acciones simples (endpoints + frontend)

#### Toggle pagado/pendiente
- [ ] Backend: `PATCH /api/movimientos/:id/estado`
- [ ] Frontend: click en badge estado en tabla → actualiza inmediatamente
- [ ] Optimistic update (actualizar UI antes de respuesta, revertir si falla)

#### Crear movimiento
- [ ] Componente `CrearMovimientoModal.tsx`
  - Inputs: concepto (select + botón "crear categoría rápida"), monto, moneda, categoría, cuenta, estado, vencimiento (si gasto), nota
  - Validaciones: monto > 0, concepto no vacío, moneda válida
  - Submit: `POST /api/periodos/:id/movimientos`
  - **UX importante**: no perder el formulario si se crea categoría al vuelo (ver req 3.7 del doc original)
- [ ] Botón "Agregar movimiento" en MesCursoPage
- [ ] Backend valida período está abierto (si está cerrado, rechazar)

#### Editar movimiento
- [ ] Componente `EditarMovimientoModal.tsx` (similar a crear, pre-rellena datos)
- [ ] Click en row de tabla → abre modal
- [ ] `PATCH /api/movimientos/:id` con los cambios
- [ ] Backend valida período abierto

#### Borrar movimiento
- [ ] Botón "eliminar" en modal o en row
- [ ] Confirmación: "¿Eliminar movimiento? Si es el único de este concepto, también se borrará el concepto."
- [ ] `DELETE /api/movimientos/:id`

### 3.2 CRUD Categorías (si falta)
- [ ] Componente `CrearCategoriaModal.tsx` (modal rápida sin perder formulario principal)
- [ ] `POST /api/conceptos/categorias` (crear categoría)
- [ ] Backend valida nombre único (case-insensitive)

### 3.3 Tablas mejoradas
- [ ] `MovimientosTable` ahora con filas clickeables → abre modal editar
- [ ] Columna "Acciones" con botón eliminar
- [ ] Inline editing opcional (editar moneda/estado sin modal)

### 3.4 Validaciones & errores
- [ ] Monto: debe ser > 0, formato argentina (punto miles, coma decimal)
- [ ] Moneda: ARS, USD, BTC válidas
- [ ] Concepto: no vacío, si es nuevo debe tener nombre único (o por periodo)
- [ ] Vencimiento (gasto): fecha válida ISO, opcional
- [ ] Mostrar errores inline en form o toast

### 3.5 Tests
- [ ] Unit: parseMonto convierte "1.234,56" → 1234.56
- [ ] Integration: crear movimiento → aparece en tabla
- [ ] Integration: editar movimiento → datos actualizados
- [ ] Integration: toggle estado → cambio inmediato
- [ ] Manual: llenar formulario, crear, ver en tabla, editar, toggliar, borrar

**Entregable**: "Mes en curso" completamente funcional (CRUD movimientos), base vacía.

---

## Sprint 4: Operaciones Críticas (Cerrar/Reabrir Mes) (1 semana)

**Objetivo**: Las operaciones más complejas del negocio, totalmente testeadas.

### 4.1 Cerrar mes (`POST /api/periodos/:id/cerrar`)
Backend (ya está en Sprint 1, pero aquí se refina y testea a fondo):
- [ ] Validar período existe y está abierto
- [ ] Obtener cotizaciones vigentes
- [ ] Calcular ingresos, gastos, ahorro
- [ ] Determinar si es último período
- [ ] **Transacción atómica Postgres**:
  1. Update `movimientos`: freeze `monto_ars` para cada fila
  2. Update `periodo`: estado='cerrado', campos congelados, cotizaciones cierre
  3. Si es último período:
     - Insert nuevo período (abierto)
     - Insert movimientos recurrentes en nuevo período
     - Copy presupuesto_efectivo (si hay)
  4. Recalc `ahorro_acumulado` de todos los períodos cerrados
- [ ] Validar atomicidad: si falla en el medio, rollback completo

Frontend:
- [ ] Botón "Cerrar mes" en MesCursoPage
- [ ] Modal confirmación
  - Mostrar resumen: ingresos, gastos, ahorro, "se creará [próximo mes]"
  - Botón "Cerrar" (deshabilitado si período está vacío o ya cerrado)
- [ ] Submit: `POST /api/periodos/:id/cerrar`
- [ ] Respuesta: actualiza estado a cerrado, recarga período siguiente
- [ ] **Feedback visual**: mensaje "Mes cerrado ✓", disable botón, mostrar campos congelados

### 4.2 Reabrir mes (`POST /api/periodos/:id/reabrir`)
Backend:
- [ ] Validar período está cerrado
- [ ] Transacción:
  - Update período: estado='abierto', NULL en campos congelados, NULL en cotizaciones cierre
  - Update movimientos: NULL en `monto_ars`
  - Recalc acumulado
- [ ] Validar que no haya datos en el período siguiente que hayan sido copiados (si los hay, warning)

Frontend:
- [ ] Si período está cerrado, mostrar botón "Reabrir mes"
- [ ] Modal confirmación: "¿Reabrir mes para editarlo? Se descongalarán los datos y se recalcularán."
- [ ] Submit, esperar respuesta, recargar
- [ ] Feedback visual: mensaje "Mes reabierto ✓"

### 4.3 "Traer recurrentes" (`POST /api/periodos/:id/traer-recurrentes`)
Backend (si falta):
- [ ] Listar conceptos recurrentes (es_recurrente=1, activo=1)
- [ ] Para cada uno, validar no existe movimiento en ese período
- [ ] Insertar movimientos en pendiente con monto_referencia y vencimiento sugerido
- [ ] Retornar lista de los insertados

Frontend:
- [ ] Botón "Traer recurrentes" en MesCursoPage (habilitado solo si período abierto y hay recurrentes faltantes)
- [ ] Click → simple `POST`, sin modal (o confirmación leve)
- [ ] Feedback: "Se agregaron X movimientos recurrentes", tabla se recarga

### 4.4 Crear período (`POST /api/periodos`)
- [ ] Frontend: modal "Crear período [mes/año]"
- [ ] Backend: validar no existe, insertar con estado abierto
- [ ] Feedback: "Período creado ✓"

### 4.5 Eliminación segura de período
- [ ] Backend: validar está vacío (sin movimientos, saldos, aportes, presupuesto)
- [ ] Si no está vacío, devolver 400 con mensaje claro
- [ ] Frontend: mostrar error o disable botón si hay datos

### 4.6 Tests exhaustivos
**Unit tests** (`backend/tests/unit/`):
- [ ] `calc.aArs()` con BTC, USD, ARS (3 casos)
- [ ] `calc.ingresos()` período abierto vs cerrado
- [ ] `recalcAcumulado()` recalcula correctamente después de cerrar mes

**Integration tests** (`backend/tests/integration/`):
- [ ] Test completo: crear período → agregar movimientos → cerrar mes → validar congelado → crear siguiente → agregar recurrentes
- [ ] Caso edge: cerrar período viejo (no último) → no crear siguiente
- [ ] Caso edge: reabrir período → vuelve a estar editable → cerrar de nuevo
- [ ] Validaciones: cerrar período con período siguiente ya creado (debe fallar)

**Manual tests** (tu responsabilidad):
- [ ] Crear período, agregar 3 movimientos (2 USD, 1 BTC, gasto/ingreso), cerrar, validar congelado
- [ ] Reabrir, editar monto, cerrar de nuevo, validar datos nuevos congelados
- [ ] Navegar período anterior (debería mostrar read-only + botón reabrir)
- [ ] Cargar cotización nueva después de cerrar, validar que monto_ars no cambia

**Entregable**: "Mes en curso" completamente funcional, operaciones críticas probadas, MVP listo para migración de datos.

---

## Hitos de validación

| Sprint | Hito | Estado |
|--------|------|--------|
| 0 | Infraestructura deployada, auth funcional | [ ] |
| 1 | Backend completo, cálculos verificados | [ ] |
| 2 | Frontend layout + lectura de datos | [ ] |
| 3 | CRUD movimientos funcional | [ ] |
| 4 | Cerrar/reabrir mes, todas las operaciones | [ ] |
| Final | Validación manual completa, base vacía OK | [ ] |

---

## Siguiente fase (después de MVP)

Una vez "Mes en curso" está probado:

1. **Migrar datos reales**: ejecutar `scripts/migrate.js` contra datos reales
2. **Pantallas adicionales** (en prioridad sugerida):
   - Dashboard (KPIs + gráficos)
   - Cuentas & saldos
   - Carga (conceptos)
   - Presupuesto (semáforo efectivo)
   - Metas (ahorro)
   - Cotizaciones
3. **Pulido final**: estilos, responsivo, dark mode, optimizaciones

---

## Notas de desarrollo

- **Convención numérica**: Argentina (punto miles, coma decimal) — función `parseMonto()` en `backend/utils/format.ts`
- **Fechas**: ISO `YYYY-MM-DD` en BD, mostrar `DD/MM/AAAA` en UI
- **Transacciones**: Postgres transacciones explícitas (`BEGIN`/`COMMIT`/`ROLLBACK`) en operaciones críticas
- **Errores**: respuestas REST con código HTTP apropiado (400 validación, 401 auth, 500 server) + JSON `{error, message}`
- **Logs**: console.log en desarrollo, remover o usar logger en producción
- **Secretos**: `.env` local, `.env.example` sin valores (commitear example, ignorar .env)

---

**Inicio**: mañana Sprint 0
**Duración estimada**: 4-5 semanas (1 semana por sprint)
**Próxima reunión**: fin de Sprint 0 (infraestructura lista)
