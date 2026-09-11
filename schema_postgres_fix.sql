-- Finanzas del Hogar - PostgreSQL Schema (VERSIÓN CORREGIDA)
-- Para Supabase

-- Periodos
CREATE TABLE IF NOT EXISTS periodos (
  id SERIAL PRIMARY KEY,
  anio INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  estado TEXT NOT NULL DEFAULT 'abierto',
  fecha_cierre TEXT,
  ingresos_mes REAL,
  gastos_mes REAL,
  ahorro_mes REAL,
  ahorro_acumulado REAL,
  cotiz_usd_ars_cierre REAL,
  cotiz_btc_usd_cierre REAL,
  UNIQUE(anio, mes)
);

-- Categorias
CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL DEFAULT 'ambos',
  color TEXT,
  orden INTEGER DEFAULT 0
);

-- Cuentas
CREATE TABLE IF NOT EXISTS cuentas (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,
  titular_id INTEGER REFERENCES integrantes(id) ON DELETE SET NULL,
  proposito TEXT NOT NULL DEFAULT 'otro',
  moneda TEXT NOT NULL DEFAULT 'ARS',
  activa INTEGER NOT NULL DEFAULT 1,
  orden INTEGER DEFAULT 0
);

-- Saldos Cuenta
CREATE TABLE IF NOT EXISTS saldos_cuenta (
  id SERIAL PRIMARY KEY,
  cuenta_id INTEGER NOT NULL REFERENCES cuentas(id) ON DELETE CASCADE,
  periodo_id INTEGER REFERENCES periodos(id) ON DELETE SET NULL,
  fecha TEXT NOT NULL,
  saldo REAL NOT NULL DEFAULT 0,
  nota TEXT
);

-- Conceptos
CREATE TABLE IF NOT EXISTS conceptos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,
  categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
  cuenta_id INTEGER REFERENCES cuentas(id) ON DELETE SET NULL,
  integrante_id INTEGER REFERENCES integrantes(id) ON DELETE SET NULL,
  moneda TEXT NOT NULL DEFAULT 'ARS',
  es_agrupado INTEGER NOT NULL DEFAULT 0,
  es_recurrente INTEGER NOT NULL DEFAULT 0,
  monto_referencia REAL,
  activo INTEGER NOT NULL DEFAULT 1,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Movimientos
CREATE TABLE IF NOT EXISTS movimientos (
  id SERIAL PRIMARY KEY,
  periodo_id INTEGER NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  concepto_id INTEGER NOT NULL REFERENCES conceptos(id) ON DELETE CASCADE,
  monto REAL NOT NULL DEFAULT 0,
  moneda TEXT NOT NULL DEFAULT 'ARS',
  estado TEXT NOT NULL DEFAULT 'pendiente',
  cuenta_id INTEGER REFERENCES cuentas(id) ON DELETE SET NULL,
  fecha_vencimiento TEXT,
  monto_ars REAL,
  vino_de_recurrente INTEGER NOT NULL DEFAULT 0,
  nota TEXT,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(periodo_id, concepto_id)
);

-- Presupuesto Efectivo
CREATE TABLE IF NOT EXISTS presupuesto_efectivo (
  id SERIAL PRIMARY KEY,
  periodo_id INTEGER NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  cuenta_id INTEGER NOT NULL REFERENCES cuentas(id) ON DELETE CASCADE,
  asignado REAL NOT NULL DEFAULT 0,
  UNIQUE(periodo_id, cuenta_id)
);

-- Cotizaciones
CREATE TABLE IF NOT EXISTS cotizaciones (
  id SERIAL PRIMARY KEY,
  par TEXT NOT NULL,
  valor REAL NOT NULL,
  fecha TEXT NOT NULL,
  periodo_id INTEGER REFERENCES periodos(id) ON DELETE SET NULL
);

-- Metas
CREATE TABLE IF NOT EXISTS metas (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  moneda TEXT NOT NULL DEFAULT 'ARS',
  monto_objetivo REAL NOT NULL,
  monto_inicial REAL NOT NULL DEFAULT 0,
  fecha_inicio TEXT NOT NULL,
  fecha_objetivo TEXT NOT NULL,
  cuenta_id INTEGER REFERENCES cuentas(id) ON DELETE SET NULL,
  estado TEXT NOT NULL DEFAULT 'activa',
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Meta Aportes
CREATE TABLE IF NOT EXISTS meta_aportes (
  id SERIAL PRIMARY KEY,
  meta_id INTEGER NOT NULL REFERENCES metas(id) ON DELETE CASCADE,
  periodo_id INTEGER REFERENCES periodos(id) ON DELETE SET NULL,
  monto REAL NOT NULL,
  moneda TEXT NOT NULL DEFAULT 'ARS',
  fecha TEXT NOT NULL,
  nota TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS ix_mov_periodo ON movimientos(periodo_id);
CREATE INDEX IF NOT EXISTS ix_saldos_cuenta ON saldos_cuenta(cuenta_id, fecha);
CREATE INDEX IF NOT EXISTS ix_cotiz_par ON cotizaciones(par, fecha);
CREATE INDEX IF NOT EXISTS ix_aportes_meta ON meta_aportes(meta_id);
