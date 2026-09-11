# Finanzas del Hogar — Status de Migración a Cloud

**Fecha**: 2026-09-08  
**Estado**: ✅ Fase 1-2 Completadas | 🔄 Fase 3 en Desarrollo

---

## Fases Completadas

### ✅ Fase 1: Extracción de Datos (Sept 8)
- Extraídos 225 registros de finanzas.sqlite
- Estructura preservada (11 tablas)
- Sin pérdida de datos

### ✅ Fase 2: Migración a Supabase (Sept 8)
- Schema PostgreSQL creado en Supabase ✓
- 225 registros ingirieron correctamente ✓
- Verificación de integridad: OK ✓

**Resumen de datos:**
```
categorias:        11 registros
conceptos:         88 registros
movimientos:       78 registros
cuentas:           17 registros
saldos_cuenta:     21 registros
periodos:           2 registros
cotizaciones:       2 registros
integrantes:        2 registros
settings:           4 registros
─────────────────────────────
TOTAL:            225 registros ✓
```

---

## 🔄 Fase 3: API REST Backend (EN DESARROLLO)

**Ubicación**: `C:\Hernan\Hernan\Personal\FinanzasFamilia\api\`

**Archivos creados:**
- `server.js` — Express API con endpoints REST
- `package.json` — Dependencias Node.js
- `.env.example` — Variables de entorno
- `vercel.json` — Configuración para despliegue
- `README.md` — Documentación completa

**Endpoints implementados:**
- `POST /api/auth/login` — Autenticación JWT
- `GET /api/periodos`, `POST /api/periodos`
- `GET /api/conceptos`, `POST /api/conceptos`
- `GET /api/movimientos/:periodoId`, `POST /api/movimientos`, `PATCH /api/movimientos/:id`
- `GET /api/categorias`
- `GET /api/cuentas`
- `GET /api/saldos/:cuentaId`, `POST /api/saldos`
- `GET /api/health` — Health check

**Usuarios de prueba:**
- `hernan@finanzas.local` / `Hernan123!` (owner)
- `ximena@finanzas.local` / `Ximena123!` (viewer)

---

## 📋 Próximos Pasos (Fase 3-7)

### Fase 3: Desarrollo Local de API (AHORA)
- [ ] `npm install` en la carpeta `api/`
- [ ] Crear `.env` con credenciales
- [ ] `npm run dev` para probar localmente
- [ ] Verificar endpoints con curl

### Fase 4: Despliegue en Vercel
- [ ] Crear repo en GitHub
- [ ] Conectar a Vercel
- [ ] Configurar variables de entorno
- [ ] Deploy de la API

### Fase 5: Adaptar Frontend
- [ ] Reemplazar sql.js con llamadas HTTP a la API
- [ ] Agregar token JWT a cada request
- [ ] Mantener IndexedDB como cache offline
- [ ] Cambiar App.db → App.api

### Fase 6: Autenticación Real
- [ ] Implementar Supabase Auth
- [ ] Row Level Security para datos de Ximena
- [ ] Sistema de invitaciones

### Fase 7: Deploy Frontend
- [ ] Desplegar app en Vercel (sitio web principal)
- [ ] Compartir URL con Ximena
- [ ] Testing end-to-end

---

## 🔑 Credenciales Actuales

**Supabase:**
- Proyecto: FinanzasFlia (dtgrwrmtqoxkpxssaduc)
- Host: db.dtgrwrmtqoxkpxssaduc.supabase.co
- Usuario: postgres
- 225 registros listos en PostgreSQL

**API (Local):**
- URL: http://localhost:3000
- JWT Secret: (ver .env)

**Vercel (no configurado aún):**
- Será: https://finanzas-api-XXX.vercel.app
- Será: https://finanzas-app-XXX.vercel.app

---

## ⚠️ Notas Importantes

1. **Autenticación hardcodeada**: Los usuarios están en el código (`server.js`). Cambiar a Supabase Auth antes de producción.

2. **JWT Secret**: Cambiar en producción. No usar el default.

3. **CORS**: Configurado para cualquier origen. Restringir en producción.

4. **Row Level Security**: Falta configurar en Supabase para aislar datos de Ximena.

5. **Backups**: Supabase hace backups automáticos. Configurar replicación si es crítico.

---

## 📊 Arquitectura Final

```
┌─────────────────────────────────────────────────────┐
│                  CLIENTE (Vercel)                    │
│  app.js + React (reemplaza sql.js local)           │
│  Llamadas HTTP a API + JWT token                    │
└────────────────┬────────────────────────────────────┘
                 │ HTTP/REST
┌────────────────▼────────────────────────────────────┐
│            API REST (Vercel Serverless)              │
│  Node.js + Express                                   │
│  Endpoints: periodos, conceptos, movimientos, etc    │
│  Autenticación JWT + RLS                            │
└────────────────┬────────────────────────────────────┘
                 │ PostgreSQL
┌────────────────▼────────────────────────────────────┐
│         SUPABASE PostgreSQL                          │
│  11 tablas, 225 registros, datos compartidos        │
│  Row Level Security para Hernan vs Ximena           │
└─────────────────────────────────────────────────────┘
```

---

**Generado**: Sept 8, 2026  
**Responsable**: Claude Haiku 4.5 + Hernan  
**Progreso**: 2/7 fases completadas (28%)
