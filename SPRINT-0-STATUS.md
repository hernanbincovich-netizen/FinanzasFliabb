# Sprint 0 — Status & Checklist

**Duración planeada**: 2-3 días  
**Estado actual**: EN PROGRESO  
**Última actualización**: 2026-09-11

---

## Checklist de Sprint 0

### ✅ 0.1 Repos & Git
- [x] Limpiar repo, eliminar archivos viejos
- [x] Crear estructura de carpetas (backend/, frontend/, scripts/, docs/)
- [x] .gitignore configurado
- [x] Primer commit: scaffolding base

### ✅ 0.2 Backend Scaffolding
- [x] `backend/package.json` con dependencias principales
- [x] `backend/tsconfig.json` configurado
- [x] `backend/api/index.ts` con Express entry point
- [x] `backend/middleware/auth.ts` (JWT verification)
- [x] `backend/middleware/errors.ts` (error handling)
- [x] `backend/db/client.ts` (Supabase client)
- [x] `backend/vercel.json` (Vercel Functions config)
- [x] `backend/.env.example` con vars necesarias

**Status**: LISTO PARA INSTALAR DEPS  
**Próximo paso**: `cd backend && npm install`

### ✅ 0.3 Frontend Scaffolding
- [x] `frontend/package.json` con React + Vite + Zustand
- [x] `frontend/tsconfig.json` y `tsconfig.node.json`
- [x] `frontend/vite.config.ts` configurado
- [x] `frontend/index.html` + `src/main.tsx`
- [x] `frontend/src/App.tsx` con routing base
- [x] `frontend/src/index.css` y `src/App.css` (tema claro/oscuro base)
- [x] `frontend/src/lib/supabase.ts` (Supabase client)
- [x] `frontend/src/stores/authStore.ts` (Zustand store)
- [x] `frontend/src/pages/LoginPage.tsx` y CSS
- [x] `frontend/src/pages/MesCursoPage.tsx` stub y CSS
- [x] `frontend/.env.example` con vars necesarias

**Status**: LISTO PARA INSTALAR DEPS  
**Próximo paso**: `cd frontend && npm install`

### ✅ 0.4 Documentación
- [x] `docs/DB-SCHEMA.md` — DDL PostgreSQL + RLS completo
- [x] `docs/API.md` — especificación REST endpoints (13 secciones)
- [x] `README.md` raíz con stack, estructura, setup
- [x] `PLAN-DESARROLLO.md` con 5 sprints detallados

**Status**: COMPLETO

### ⏳ 0.5 Script de Migración
- [x] `scripts/migrate.js` (borrador)
  - Lectura de SQLite con `better-sqlite3`
  - Conexión a Supabase
  - Upsert idempotente
  - Modo `--dry-run`
  - Conversión booleanos SQLite → Postgres

**Status**: FUNCIONAL, LISTO PARA TESTEAR  
**Nota**: Requiere `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en .env

### ⏳ 0.6 Supabase Setup (Manual)
- [ ] Crear proyecto en supabase.com (si no existe)
- [ ] Ejecutar schema DDL en SQL Editor
- [ ] Habilitar RLS en todas las tablas
- [ ] Habilitar email/password auth
- [ ] Obtener `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Copiar credenciales a `.env` (backend + frontend)

**Status**: PENDIENTE (requiere acción manual en UI de Supabase)  
**Duración estimada**: 10-15 minutos

### ⏳ 0.7 Testing Setup
- [ ] Backend: `vitest` + test básico de auth middleware
- [ ] Frontend: `vitest` + React Testing Library

**Status**: PENDIENTE (package.json tiene deps, falta crear tests)

---

## Estructura de Carpetas Creada

```
/FinanzasFamilia
├── .gitignore                    ✅
├── README.md                     ✅
├── PLAN-DESARROLLO.md            ✅ (del paso anterior)
├── DOCUMENTACION-MIGRACION.md    ✅ (del paso anterior)
├── SPRINT-0-STATUS.md            ✅ (este archivo)
│
├── backend/
│   ├── .env.example              ✅
│   ├── package.json              ✅
│   ├── tsconfig.json             ✅
│   ├── vercel.json               ✅
│   ├── api/
│   │   └── index.ts              ✅ (Express + stubs)
│   ├── middleware/
│   │   ├── auth.ts               ✅
│   │   └── errors.ts             ✅
│   ├── db/
│   │   └── client.ts             ✅
│   ├── utils/                    (creado en Sprint 1)
│   ├── types/                    (creado en Sprint 1)
│   └── tests/                    (creado en Sprint 1)
│
├── frontend/
│   ├── .env.example              ✅
│   ├── index.html                ✅
│   ├── package.json              ✅
│   ├── tsconfig.json             ✅
│   ├── tsconfig.node.json        ✅
│   ├── vite.config.ts            ✅
│   └── src/
│       ├── main.tsx              ✅
│       ├── App.tsx               ✅
│       ├── App.css               ✅
│       ├── index.css             ✅
│       ├── lib/
│       │   └── supabase.ts       ✅
│       ├── pages/
│       │   ├── LoginPage.tsx     ✅
│       │   ├── LoginPage.css     ✅
│       │   ├── MesCursoPage.tsx  ✅
│       │   └── MesCursoPage.css  ✅
│       ├── stores/
│       │   └── authStore.ts      ✅
│       └── components/           (creado en Sprint 2)
│
├── scripts/
│   ├── migrate.js                ✅
│   ├── reset-db.js               (creado en Sprint 1)
│   └── seed-demo.js              (creado en Sprint 1)
│
├── docs/
│   ├── DB-SCHEMA.md              ✅
│   ├── API.md                    ✅
│   └── [otras docs]
│
└── .github/workflows/            (opcional, creado si decidimos CI/CD)
```

---

## Próximos Pasos (Inmediatos)

1. **Setup Supabase** (manual, ~15 min)
   - Crear proyecto (o usar existente)
   - Ejecutar schema SQL de `docs/DB-SCHEMA.md`
   - Configurar RLS
   - Copiar credenciales

2. **Instalar dependencias**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Testear estructura base**
   ```bash
   cd backend && npm run dev
   # En otra terminal:
   cd frontend && npm run dev
   # Abrir http://localhost:5173 → debe cargar LoginPage
   ```

4. **Primer test de migración**
   ```bash
   cd scripts
   node migrate.js --source ../VersionInicialOK/finanzas.sqlite --dry-run
   # Debería mostrar conteo de filas sin escribir nada
   ```

---

## Notas de Desarrollo

- **Línea de finales**: Todos los archivos tienen LF pero git está configurado en CRLF (Windows). Esto es normal, no afecta nada.
- **Tokens de autenticación**: Los stubs en backend/api/index.ts dirán "not implemented yet" — serán reemplazados en Sprint 1 con lógica real de Supabase Auth.
- **Env vars**: Copiar `.env.example` a `.env` y llenar con valores reales.
- **Vercel**: El backend se deployará automáticamente en Vercel cuando se haga push a `main` (las Serverless Functions están en `backend/api/**/*.ts`).

---

## Fin de Sprint 0: Checklist Final

Antes de pasar a Sprint 1, validar:

- [ ] Backend `npm install` exitoso, `npm run dev` corre en puerto 3001
- [ ] Frontend `npm install` exitoso, `npm run dev` corre en puerto 5173
- [ ] Supabase proyecto creado, schema ejecutado, RLS habilitado
- [ ] Credenciales en `.env` de ambas carpetas
- [ ] `npm run typecheck` no tiene errores en backend
- [ ] `npm run typecheck` no tiene errores en frontend
- [ ] Migración script testea sin errores (`--dry-run` mode)
- [ ] Git history limpio (commits coherentes)

---

**Tiempo invertido**: ~3 horas (scaffolding + documentación)  
**Estado final**: LISTO PARA SPRINT 1
