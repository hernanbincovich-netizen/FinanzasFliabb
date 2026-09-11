# Finanzas del Hogar — Cloud

Administración centralizada de finanzas familiares. Migración de app local (SQLite/HTML) a arquitectura cloud (React + Node/Express + Supabase).

## Stack

- **Frontend**: React + Vite + TypeScript
- **Backend**: Node/Express en Vercel Serverless Functions
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email/password)
- **Deploy**: Vercel (frontend + backend)

## Estructura del Proyecto

```
/FinanzasFamilia
├── frontend/              # React/Vite app
├── backend/               # Express API (Vercel Functions)
├── scripts/               # Migración de datos, seeds, etc.
├── docs/                  # Documentación (API, schema, etc.)
├── PLAN-DESARROLLO.md     # Plan de 5 sprints
├── DOCUMENTACION-MIGRACION.md  # Análisis app original
└── README.md (este archivo)
```

## Fases de Desarrollo

**Sprint 0** (2-3 días): Infraestructura, Supabase schema, Vercel config, auth base  
**Sprint 1** (1 semana): Backend REST completo, cálculos, cerrar mes  
**Sprint 2** (1 semana): Frontend layout, login, lectura de datos  
**Sprint 3** (1 semana): CRUD movimientos, validaciones  
**Sprint 4** (1 semana): Cerrar/reabrir mes, tests exhaustivos  

→ [Ver PLAN-DESARROLLO.md para detalles](./PLAN-DESARROLLO.md)

## Requisitos Previos

- Node.js 18+
- npm o pnpm
- Cuenta Supabase (gratuita en supabase.com)
- Cuenta Vercel (gratuita en vercel.com)
- Git

## Setup Local (Desarrollo)

### 1. Clonar y preparar entorno

```bash
git clone <repo>
cd FinanzasFamilia

# Copiar variables de entorno
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Editar `.env` en ambas carpetas con tus credenciales de Supabase y Vercel.

### 2. Backend

```bash
cd backend
npm install
npm run dev
```

Backend corre en `http://localhost:3001` (modo desarrollo con hot-reload via `tsx watch`).

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend corre en `http://localhost:5173` (Vite dev server).

### 4. Supabase

1. Ir a supabase.com y crear proyecto nuevo (o usar existente)
2. En SQL Editor, ejecutar el schema completo: [docs/DB-SCHEMA.md](./docs/DB-SCHEMA.md)
3. Copiar `SUPABASE_URL` y `SUPABASE_ANON_KEY` → `.env` en frontend
4. Copiar `SUPABASE_SERVICE_ROLE_KEY` → `.env` en backend
5. Habilitar email/password auth en Supabase console

## Desarrollo

### Testing

```bash
# Backend - unit tests
cd backend && npm run test:unit

# Backend - integration tests
cd backend && npm run test:integration

# Frontend (cuando esté listo)
cd frontend && npm test
```

### Documentación

- [API.md](./docs/API.md) — especificación de endpoints REST
- [DB-SCHEMA.md](./docs/DB-SCHEMA.md) — schema Postgres + RLS
- [PLAN-DESARROLLO.md](./PLAN-DESARROLLO.md) — plan de 5 sprints con detalles
- [DOCUMENTACION-MIGRACION.md](./DOCUMENTACION-MIGRACION.md) — análisis de app original

## Migración de Datos

Una vez que MVP está validado y aprobado:

```bash
# Preview (sin escribir)
node scripts/migrate.js --source ./path/to/finanzas.sqlite --dry-run

# Ejecutar (escribir en Supabase)
node scripts/migrate.js --source ./path/to/finanzas.sqlite --execute

# Reset + migrar (trunca primero, cuidado!)
node scripts/migrate.js --source ./path/to/finanzas.sqlite --reset --execute
```

Requiere archivo `.sqlite` original en acceso local.

## Deploy

### Frontend en Vercel

```bash
cd frontend
vercel deploy
```

(O conectar repo a Vercel para auto-deploy en push a `main`)

### Backend en Vercel

Los Vercel Serverless Functions se deployean automáticamente desde `backend/api/**/*.ts` cuando haces push a GitHub.

Ver [backend/vercel.json](./backend/vercel.json) para configuración.

## Decisiones Principales

- **Multiusuario**: 2 personas (Hernan + Xime), ambas con acceso a mismos datos, sin permisos diferenciados por ahora
- **Cotizaciones**: carga manual (sin API externa)
- **Offline**: no soportado (requiere conexión a internet)
- **Moneda**: convención argentina (punto miles, coma decimal)
- **Conceptos**: plantilla reutilizable, aparece una sola vez por mes (no múltiples transacciones)

## Próximas Fases (Post-MVP)

Una vez "Mes en curso" es funcional y testado:

1. Dashboard (KPIs + gráficos)
2. Cuentas & saldos
3. Carga (conceptos)
4. Presupuesto (semáforo efectivo)
5. Metas (ahorro)
6. Cotizaciones

## Soporte & Contacto

Contacto: hernan.bincovich@gmail.com

---

**Última actualización**: 2026-09-11  
**Sprint actual**: 0 (Setup & Scaffolding)
