# 🚀 Finanzas del Hogar - Guía de Desarrollo

## Inicio Rápido

### Opción 1: Batch file automático (RECOMENDADO)

Simplemente ejecuta:
```bash
start-dev.cmd
```

Esto abrirá 2 ventanas automáticamente:
- **Ventana 1**: API en `http://localhost:3000`
- **Ventana 2**: Frontend en `http://localhost:8080`

### Opción 2: Manual (2 terminales)

**Terminal 1 - API:**
```bash
cd api
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd app
python -m http.server 8080
```

## URLs de Desarrollo

- **Frontend**: http://localhost:8080
- **API**: http://localhost:3000

## Credenciales de Prueba

```
Email: hernan@finanzas.local
Password: Hernan123!

Email: ximena@finanzas.local
Password: Ximena123!
```

## Base de Datos

- **Tipo**: SQLite local
- **Ubicación**: `api/finanzas.db`
- **Se crea automáticamente** al iniciar el servidor

## Estructura del Proyecto

```
FinanzasFamilia/
├── api/                    # Backend (Node.js + Express)
│   ├── server-sqlite.js    # Servidor con SQLite
│   ├── finanzas.db         # Base de datos (se crea al iniciar)
│   └── package.json
├── app/                    # Frontend (HTML + JS vanilla)
│   ├── index.html
│   ├── js/
│   │   ├── api-client.js   # Cliente HTTP para API
│   │   ├── screens/        # Pantallas (login, dashboard, etc.)
│   │   ├── ui.js           # Componentes UI
│   │   └── format.js       # Formatos
│   └── css/
└── start-dev.cmd           # Script de inicio
```

## Endpoints Principales

### Autenticación
- `POST /api/auth/login` — Login con JWT

### CRUD Operations
- `GET/POST /api/periodos` — Períodos
- `GET/POST /api/conceptos` — Conceptos
- `GET/POST/PATCH/DELETE /api/movimientos` — Movimientos
- `GET/POST /api/categorias` — Categorías
- `GET/POST/PATCH /api/cuentas` — Cuentas
- `GET/POST /api/saldos` — Saldos
- `GET/POST/PATCH/DELETE /api/metas` — Metas
- `GET/POST /api/cotizaciones` — Cotizaciones

## Desarrollo Local vs Producción

### Local (Ahora)
- ✅ SQLite
- ✅ Usuarios hardcodeados
- ✅ Sin validaciones complejas
- ✅ CORS abierto

### Producción (Próximas fases)
- PostgreSQL en Supabase
- Gestión completa de usuarios
- Row-Level Security (RLS)
- CORS restringido

## Próximas Tareas

1. **Conectar pantallas a datos reales**
   - Dashboard: cargar datos desde `/api/periodos` y `/api/movimientos`
   - Carga: conectar formulario a `/api/conceptos` y `/api/movimientos`
   - Cuentas: listar desde `/api/cuentas`

2. **Agregar validaciones**
   - Email válido
   - Montos positivos
   - Fechas consistentes

3. **Mejorar UX**
   - Loading spinners
   - Errores amigables
   - Confirmaciones en acciones destructivas

4. **Persistencia avanzada**
   - Soft deletes
   - Auditoría de cambios
   - Historial de cambios

5. **Despliegue**
   - API a Vercel o Railway
   - Frontend a Vercel
   - Supabase PostgreSQL en producción

## Troubleshooting

### "No se puede acceder a este sitio web" en localhost:8080
**Solución**: El servidor HTTP se cayó. Ejecuta:
```bash
cd app
python -m http.server 8080
```

### "Cannot GET /api/..." 
**Solución**: El servidor API no está corriendo. Ejecuta:
```bash
cd api
npm run dev
```

### "Database is locked"
**Solución**: Cierra todas las conexiones a SQLite (reinicia los servidores)

### Puerto 8080 o 3000 en uso
**Solución**: Cambia en el script o usa puertos diferentes:
```bash
# Para Frontend:
python -m http.server 9000  # Usa puerto 9000

# Para API:
PORT=4000 npm run dev      # Usa puerto 4000
```

Luego actualiza las URLs en `app/js/api-client.js`:
```javascript
const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:4000'  // Cambiar a tu puerto
  : 'https://api.finanzas.com';
```

## Comandos Útiles

```bash
# Instalar dependencias
cd api
npm install

# Ejecutar tests (cuando existan)
npm test

# Limpiar base de datos (elimina finanzas.db)
rm api/finanzas.db
```

## Notas Importantes

- Los datos se guardan en `api/finanzas.db` — **no la elimines a menos que quieras borrar todo**
- El token JWT expira en 30 días
- No hay validación de email real (es solo un string)
- Las contraseñas están hardcodeadas (solo para desarrollo)

---

**¿Preguntas?** Revisa los archivos de código fuente o crea un issue.
