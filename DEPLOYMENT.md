# Deployment Guide - Finanzas del Hogar

## 🚀 Deployment a Vercel

### Requisitos Previos
- Cuenta en [Vercel](https://vercel.com) (gratis)
- Cuenta en [GitHub](https://github.com) (ya configurada)
- Supabase project con credenciales

### Step 1: Preparar Variables de Entorno

#### Backend (.env)
En Vercel, agregar estas variables de entorno:
```
SUPABASE_URL=tu_url_supabase
SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
NODE_ENV=production
```

#### Frontend (.env)
```
VITE_API_URL=https://your-backend.vercel.app/api
```

### Step 2: Deploy Backend

1. Ir a [vercel.com](https://vercel.com)
2. Click en "New Project"
3. Seleccionar tu repositorio de GitHub: `FinanzasFliabb`
4. Seleccionar "Other" como framework (Node.js)
5. En Build Settings:
   - **Build Command**: `npm run build --prefix backend`
   - **Output Directory**: `backend/dist`
   - **Install Command**: `npm install`
6. Agregar Environment Variables (Backend)
7. Click "Deploy"

**URL Backend**: https://your-project.vercel.app/api

### Step 3: Deploy Frontend

1. Ir a [vercel.com](https://vercel.com)
2. Click en "New Project"
3. Seleccionar mismo repositorio
4. Seleccionar "Other" o "Next.js" como framework
5. En Build Settings:
   - **Framework**: "Other" (Vite)
   - **Build Command**: `npm run build --prefix frontend`
   - **Output Directory**: `frontend/dist`
   - **Install Command**: `npm install`
6. Agregar Environment Variables:
   - `VITE_API_URL=https://your-backend.vercel.app/api`
7. Click "Deploy"

**URL Frontend**: https://your-frontend.vercel.app

### Step 4: Actualizar CORS en Backend

En `backend/api/index.ts`, actualizar CORS con tu dominio de Vercel:

```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
```

Agregar a variables de entorno del backend:
```
FRONTEND_URL=https://your-frontend.vercel.app
```

### Step 5: Probar

1. Abre el frontend en el navegador
2. Prueba login/register
3. Crea un movimiento de prueba
4. Verifica que los datos se guardan en Supabase

---

## 🔧 Troubleshooting

### Error: "Cannot find module"
- Verifica que `package.json` tiene todos los dependencies
- Ejecuta `npm install` localmente

### Error: "SUPABASE_URL is required"
- Verifica que las variables de entorno están configuradas en Vercel
- Espera unos minutos después de agregarlas

### Error: "CORS blocked"
- Actualiza `FRONTEND_URL` en backend
- Redeploy el backend

### Error: "Cannot GET /api/health"
- Verifica que Build Command es correcto
- Verifica que Output Directory es `backend/dist` o `frontend/dist`

---

## 📝 Notas Importantes

- Vercel detecta cambios en GitHub automáticamente
- Cada push a `main` dispara un nuevo deploy
- Los deployments son gratis para el plan hobby
- La base de datos sigue siendo Supabase (no cambia)
- Las migraciones SQL deben ejecutarse manualmente en Supabase

---

## 🔐 Seguridad

- Nunca commits `.env` con valores reales
- Usa Supabase Service Role Key solo en backend
- Configura CORS correctamente
- Revisa RLS policies en Supabase

