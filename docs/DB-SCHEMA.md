# Schema de Base de Datos — Finanzas del Hogar

Base de datos PostgreSQL en Supabase. Traducción del schema SQLite original con optimizaciones para Postgres.

## DDL Completo

Ejecutar en Supabase SQL Editor:

```sql
-- Habilitar extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABLA: settings
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
  clave TEXT PRIMARY KEY,
  valor TEXT,
  creado_en TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TABLA: integrantes
-- ============================================
CREATE TABLE IF NOT EXISTS integrantes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL,
  orden INTEGER DEFAULT 0,
  creado_en TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TABLA: periodos
-- ============================================
CREATE TABLE IF NOT EXISTS periodos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  anio INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  estado TEXT NOT NULL DEFAULT 'abierto', -- abierto | cerrado
  fecha_cierre DATE,
  ingresos_mes NUMERIC(18,8),
  gastos_mes NUMERIC(18,8),
  ahorro_mes NUMERIC(18,8),
  ahorro_acumulado NUMERIC(18,8),
  cotiz_usd_ars_cierre NUMERIC(18,8),
  cotiz_btc_usd_cierre NUMERIC(18,8),
  creado_en TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now(),
  UNIQUE(anio, mes)
);

CREATE INDEX idx_periodos_estado ON periodos(estado);
CREATE INDEX idx_periodos_fecha ON periodos(anio, mes);

-- ============================================
-- TABLA: categorias
-- ============================================
CREATE TABLE IF NOT EXISTS categorias (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL DEFAULT 'ambos', -- gasto | ingreso | ambos
  color TEXT,
  orden INTEGER DEFAULT 0,
  creado_en TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TABLA: cuentas
-- ============================================
CREATE TABLE IF NOT EXISTS cuentas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL, -- caja_ahorro | cuenta_sueldo | billetera_efectivo | billetera_cripto | inversion | tarjeta_credito | otro
  titular_id BIGINT REFERENCES integrantes(id) ON DELETE SET NULL,
  proposito TEXT NOT NULL DEFAULT 'otro', -- gastos_mes | efectivo_mes | ahorro_metas | fondo_emergencia | ahorro_largo_plazo | otro
  moneda TEXT NOT NULL DEFAULT 'ARS', -- ARS | USD | BTC
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  orden INTEGER DEFAULT 0,
  creado_en TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cuentas_titular ON cuentas(titular_id);
CREATE INDEX idx_cuentas_activa ON cuentas(activa);

-- ============================================
-- TABLA: saldos_cuenta
-- ============================================
CREATE TABLE IF NOT EXISTS saldos_cuenta (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cuenta_id BIGINT NOT NULL REFERENCES cuentas(id) ON DELETE CASCADE,
  periodo_id BIGINT REFERENCES periodos(id) ON DELETE SET NULL,
  fecha DATE NOT NULL,
  saldo NUMERIC(18,8) NOT NULL DEFAULT 0, -- en la moneda de la cuenta
  nota TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creado_en TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_saldos_cuenta ON saldos_cuenta(cuenta_id, fecha DESC);

-- ============================================
-- TABLA: conceptos
-- ============================================
CREATE TABLE IF NOT EXISTS conceptos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL, -- ingreso | gasto
  categoria_id BIGINT REFERENCES categorias(id) ON DELETE SET NULL,
  cuenta_id BIGINT REFERENCES cuentas(id) ON DELETE SET NULL,
  integrante_id BIGINT REFERENCES integrantes(id) ON DELETE SET NULL,
  moneda TEXT NOT NULL DEFAULT 'ARS',
  es_agrupado BOOLEAN NOT NULL DEFAULT FALSE,
  es_recurrente BOOLEAN NOT NULL DEFAULT FALSE,
  monto_referencia NUMERIC(18,8),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_conceptos_tipo ON conceptos(tipo);
CREATE INDEX idx_conceptos_recurrente ON conceptos(es_recurrente, activo);

-- ============================================
-- TABLA: movimientos
-- ============================================
CREATE TABLE IF NOT EXISTS movimientos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  periodo_id BIGINT NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  concepto_id BIGINT NOT NULL REFERENCES conceptos(id) ON DELETE CASCADE,
  monto NUMERIC(18,8) NOT NULL DEFAULT 0, -- en 'moneda'
  moneda TEXT NOT NULL DEFAULT 'ARS',
  estado TEXT NOT NULL DEFAULT 'pendiente', -- pendiente | pagado
  cuenta_id BIGINT REFERENCES cuentas(id) ON DELETE SET NULL,
  fecha_vencimiento DATE, -- solo gastos, opcional
  monto_ars NUMERIC(18,8), -- NULL hasta el cierre del mes
  vino_de_recurrente BOOLEAN NOT NULL DEFAULT FALSE,
  nota TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creado_en TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now(),
  UNIQUE(periodo_id, concepto_id)
);

CREATE INDEX idx_movimientos_periodo ON movimientos(periodo_id);
CREATE INDEX idx_movimientos_concepto ON movimientos(concepto_id);
CREATE INDEX idx_movimientos_estado ON movimientos(estado);

-- ============================================
-- TABLA: presupuesto_efectivo
-- ============================================
CREATE TABLE IF NOT EXISTS presupuesto_efectivo (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  periodo_id BIGINT NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  cuenta_id BIGINT NOT NULL REFERENCES cuentas(id) ON DELETE CASCADE,
  asignado NUMERIC(18,8) NOT NULL DEFAULT 0, -- en ARS
  creado_en TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now(),
  UNIQUE(periodo_id, cuenta_id)
);

-- ============================================
-- TABLA: cotizaciones
-- ============================================
CREATE TABLE IF NOT EXISTS cotizaciones (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  par TEXT NOT NULL, -- USD_ARS | BTC_USD
  valor NUMERIC(18,8) NOT NULL,
  fecha DATE NOT NULL,
  periodo_id BIGINT REFERENCES periodos(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creado_en TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cotizaciones_par_fecha ON cotizaciones(par, fecha DESC);

-- ============================================
-- TABLA: metas
-- ============================================
CREATE TABLE IF NOT EXISTS metas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL,
  moneda TEXT NOT NULL DEFAULT 'ARS',
  monto_objetivo NUMERIC(18,8) NOT NULL,
  monto_inicial NUMERIC(18,8) NOT NULL DEFAULT 0, -- ya ahorrado al crearla
  fecha_inicio TEXT NOT NULL, -- YYYY-MM
  fecha_objetivo TEXT NOT NULL, -- YYYY-MM
  cuenta_id BIGINT REFERENCES cuentas(id) ON DELETE SET NULL,
  estado TEXT NOT NULL DEFAULT 'activa', -- activa | cumplida | pausada | cancelada
  creado_en TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_metas_estado ON metas(estado);

-- ============================================
-- TABLA: meta_aportes
-- ============================================
CREATE TABLE IF NOT EXISTS meta_aportes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  meta_id BIGINT NOT NULL REFERENCES metas(id) ON DELETE CASCADE,
  periodo_id BIGINT REFERENCES periodos(id) ON DELETE SET NULL,
  monto NUMERIC(18,8) NOT NULL,
  moneda TEXT NOT NULL DEFAULT 'ARS',
  fecha DATE NOT NULL,
  nota TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creado_en TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_meta_aportes_meta ON meta_aportes(meta_id);
```

## Row Level Security (RLS)

Habilitar RLS en todas las tablas (excepto settings que es solo lectura desde backend):

```sql
-- Habilitar RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE periodos ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas ENABLE ROW LEVEL SECURITY;
ALTER TABLE saldos_cuenta ENABLE ROW LEVEL SECURITY;
ALTER TABLE conceptos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuesto_efectivo ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_aportes ENABLE ROW LEVEL SECURITY;

-- Política: cualquier usuario autenticado puede acceder a todos los datos
-- (mismo hogar, sin separación por usuario)

CREATE POLICY "users_access_all" ON settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "users_access_all" ON integrantes
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "users_access_all" ON periodos
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "users_access_all" ON categorias
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "users_access_all" ON cuentas
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "users_access_all" ON saldos_cuenta
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "users_access_all" ON conceptos
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "users_access_all" ON movimientos
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "users_access_all" ON presupuesto_efectivo
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "users_access_all" ON cotizaciones
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "users_access_all" ON metas
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "users_access_all" ON meta_aportes
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

## Cambios vs. SQLite original

| Campo | Cambio | Razón |
|-------|--------|-------|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `BIGINT GENERATED ALWAYS AS IDENTITY` | Postgres idiomático |
| `0/1` booleano | `BOOLEAN` | Tipo nativo |
| `REAL` (montos) | `NUMERIC(18,8)` | Precisión exacta, no float |
| `TEXT` ISO dates | `DATE` | Tipo nativo |
| Sin `created_by` | Agregar `UUID REFERENCES auth.users(id)` | Trazabilidad de usuario autenticado |
| Sin RLS | RLS policies | Control de acceso |
