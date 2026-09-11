# API REST — Finanzas del Hogar

Especificación de endpoints para el backend Express en Vercel Serverless Functions.

**Base URL**: `https://[vercel-domain]/api/`

**Auth**: Token JWT en header `Authorization: Bearer <token>`

---

## Autenticación

### POST /auth/register
Registrar nuevo usuario.

**Request**:
```json
{
  "email": "hernan@example.com",
  "password": "securepass123"
}
```

**Response** (201):
```json
{
  "user": {
    "id": "uuid",
    "email": "hernan@example.com"
  },
  "session": {
    "access_token": "jwt...",
    "refresh_token": "refresh...",
    "expires_in": 3600
  }
}
```

### POST /auth/login
Iniciar sesión.

**Request**:
```json
{
  "email": "hernan@example.com",
  "password": "securepass123"
}
```

**Response** (200): [idem register]

### POST /auth/refresh
Renovar token expirado.

**Request**:
```json
{
  "refresh_token": "refresh..."
}
```

**Response** (200):
```json
{
  "access_token": "jwt...",
  "expires_in": 3600
}
```

---

## Períodos

### GET /periodos
Listar todos los períodos.

**Query params**:
- `limit`: default 50
- `offset`: default 0
- `estado`: filter por "abierto" o "cerrado" (opcional)

**Response** (200):
```json
{
  "data": [
    {
      "id": 1,
      "anio": 2026,
      "mes": 9,
      "estado": "abierto",
      "ingresos_mes": null,
      "gastos_mes": null,
      "ahorro_mes": null,
      "ahorro_acumulado": null,
      "creado_en": "2026-09-11T10:30:00Z"
    }
  ],
  "total": 2
}
```

### GET /periodos/:id
Obtener detalles de un período + KPIs calculados en vivo.

**Response** (200):
```json
{
  "periodo": {
    "id": 1,
    "anio": 2026,
    "mes": 9,
    "estado": "abierto",
    "ingresos_mes_calculado": 50000,
    "gastos_mes_calculado": 35000,
    "ahorro_mes_calculado": 15000,
    "ahorro_acumulado_calculado": 15000
  }
}
```

### POST /periodos
Crear nuevo período.

**Request**:
```json
{
  "anio": 2026,
  "mes": 10
}
```

**Response** (201): [idem GET /periodos/:id]

### POST /periodos/:id/cerrar
Cerrar un período (operación crítica — ver PLAN-DESARROLLO.md Sprint 4).

**Response** (200):
```json
{
  "periodo_cerrado": { ... },
  "periodo_siguiente_creado": { ... },
  "movimientos_recurrentes_copiados": 5,
  "mensaje": "Mes cerrado exitosamente"
}
```

**Errores**:
- 400: Período no existe, ya está cerrado, o está vacío
- 500: Error en transacción

### POST /periodos/:id/reabrir
Reabrir un período cerrado.

**Response** (200):
```json
{
  "periodo": { ... },
  "mensaje": "Mes reabierto"
}
```

---

## Movimientos

### GET /periodos/:periodoId/movimientos
Listar movimientos de un período.

**Query params**:
- `estado`: filter por "pendiente" o "pagado" (opcional)
- `sort`: "fecha" | "categoria" (default "categoria")

**Response** (200):
```json
{
  "data": [
    {
      "id": 1,
      "periodo_id": 1,
      "concepto_id": 5,
      "concepto_nombre": "Sueldo Hernan",
      "categoria": "Ingresos",
      "monto": 50000,
      "moneda": "ARS",
      "estado": "pagado",
      "cuenta_id": 3,
      "fecha_vencimiento": "2026-09-30",
      "monto_ars": 50000,
      "vino_de_recurrente": false,
      "nota": null
    }
  ]
}
```

### POST /periodos/:periodoId/movimientos
Crear movimiento en un período.

**Request**:
```json
{
  "concepto_id": 5,
  "monto": 50000,
  "moneda": "ARS",
  "cuenta_id": 3,
  "estado": "pendiente",
  "fecha_vencimiento": "2026-09-30",
  "nota": "Sueldo septiembre"
}
```

**Response** (201): [movimiento creado]

**Validaciones**:
- Período debe estar abierto
- Concepto debe existir
- Monto > 0
- Moneda válida (ARS, USD, BTC)

### PATCH /movimientos/:id
Editar movimiento.

**Request** (campos parciales):
```json
{
  "monto": 52000,
  "estado": "pagado",
  "nota": "Sueldo ajustado"
}
```

**Response** (200): [movimiento actualizado]

### PATCH /movimientos/:id/estado
Toggle rápido de estado (pagado ↔ pendiente).

**Response** (200):
```json
{
  "id": 1,
  "estado": "pagado"
}
```

### DELETE /movimientos/:id
Borrar movimiento.

**Query params**:
- `borrar_concepto`: true para borrar también el concepto si quedó huérfano

**Response** (200):
```json
{
  "movimiento_borrado": { ... },
  "concepto_borrado": null | { ... }
}
```

---

## Conceptos

### GET /conceptos
Listar todos los conceptos.

**Query params**:
- `tipo`: filter por "ingreso" o "gasto"
- `recurrente`: true/false

**Response** (200):
```json
{
  "data": [
    {
      "id": 5,
      "nombre": "Sueldo Hernan",
      "tipo": "ingreso",
      "categoria_id": 10,
      "categoria": "Ingresos",
      "es_recurrente": true,
      "es_agrupado": false,
      "monto_referencia": 50000,
      "moneda": "ARS",
      "activo": true
    }
  ]
}
```

### POST /conceptos
Crear concepto.

**Request**:
```json
{
  "nombre": "Sueldo Hernan",
  "tipo": "ingreso",
  "categoria_id": 10,
  "moneda": "ARS",
  "es_recurrente": true,
  "monto_referencia": 50000
}
```

**Response** (201): [concepto creado]

### PATCH /conceptos/:id
Editar concepto.

**Response** (200): [concepto actualizado]

### DELETE /conceptos/:id
Borrar concepto (solo si no tiene movimientos).

**Response** (200) o 400 si tiene movimientos

---

## Categorías

### GET /categorias
Listar categorías.

**Response** (200):
```json
{
  "data": [
    {
      "id": 1,
      "nombre": "Alquiler",
      "tipo": "gasto",
      "color": "#FF5733",
      "orden": 0
    }
  ]
}
```

### POST /categorias
Crear categoría (endpoint de "crear rápida" sin perder formulario).

**Request**:
```json
{
  "nombre": "Servicios",
  "tipo": "gasto",
  "color": "#FFC300"
}
```

**Response** (201): [categoría creada]

---

## Cuentas

### GET /cuentas
Listar cuentas.

**Response** (200):
```json
{
  "data": [
    {
      "id": 1,
      "nombre": "Caja de Ahorro USD",
      "tipo": "caja_ahorro",
      "titular_id": 1,
      "moneda": "USD",
      "proposito": "ahorro_metas",
      "activa": true,
      "saldo_actual": 10000,
      "saldo_vigente_en": "2026-09-11"
    }
  ]
}
```

### GET /cuentas/:id
Detalle de cuenta + historial de saldos.

**Response** (200):
```json
{
  "cuenta": { ... },
  "saldos_historial": [
    {
      "id": 1,
      "fecha": "2026-09-11",
      "saldo": 10000,
      "nota": "Saldo real según app bancaria"
    }
  ]
}
```

### POST /cuentas
Crear cuenta.

**Response** (201): [cuenta creada]

### PATCH /cuentas/:id
Editar cuenta.

**Response** (200): [cuenta actualizada]

---

## Saldos

### POST /cuentas/:cuentaId/saldos
Registrar nuevo saldo.

**Request**:
```json
{
  "saldo": 10500,
  "fecha": "2026-09-11",
  "nota": "Según saldo bancario"
}
```

**Response** (201): [registro creado]

---

## Cotizaciones

### GET /cotizaciones
Listar cotizaciones vigentes y historial.

**Response** (200):
```json
{
  "vigentes": {
    "USD_ARS": {
      "par": "USD_ARS",
      "valor": 950,
      "fecha": "2026-09-11"
    },
    "BTC_USD": {
      "par": "BTC_USD",
      "valor": 65000,
      "fecha": "2026-09-11"
    }
  },
  "historial": [ ... ]
}
```

### POST /cotizaciones
Cargar nueva cotización.

**Request**:
```json
{
  "par": "USD_ARS",
  "valor": 950,
  "fecha": "2026-09-11"
}
```

**Response** (201): [cotización creada]

---

## Metas

### GET /metas
Listar metas.

**Response** (200):
```json
{
  "data": [
    {
      "id": 1,
      "nombre": "Vacaciones 2027",
      "moneda": "ARS",
      "monto_objetivo": 500000,
      "monto_acumulado": 150000,
      "fecha_objetivo": "2027-01",
      "porcentaje_avance": 30,
      "meses_restantes": 4,
      "aporte_mensual_necesario": 87500,
      "estado": "activa"
    }
  ]
}
```

### POST /metas
Crear meta.

**Response** (201): [meta creada]

### PATCH /metas/:id
Editar meta.

**Response** (200): [meta actualizada]

### DELETE /metas/:id
Borrar meta.

**Response** (200): { mensaje: "Meta eliminada" }

---

## Meta Aportes

### POST /metas/:metaId/aportes
Registrar aporte a una meta.

**Request**:
```json
{
  "monto": 50000,
  "moneda": "ARS",
  "fecha": "2026-09-11",
  "nota": "Aporte de septiembre"
}
```

**Response** (201): [aporte registrado]

---

## Errores

Todas las respuestas de error siguen este formato:

```json
{
  "error": "validation_error",
  "message": "Descripción legible del error",
  "details": { ... }
}
```

**Códigos HTTP usados**:
- 200: OK
- 201: Created
- 400: Bad Request (validación)
- 401: Unauthorized (sin token o token inválido)
- 404: Not Found
- 500: Internal Server Error

---

## Rate Limiting

(A definir según la escala)

---

## Cambio Log

### v0.1.0 (Sprint 0-1)
- Endpoints base: auth, periodos, movimientos, conceptos
- RLS con acceso autenticado
