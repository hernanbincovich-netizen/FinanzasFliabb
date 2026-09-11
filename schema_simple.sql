-- Finanzas del Hogar - Schema Simplificado para Supabase

CREATE TABLE integrantes (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  orden INTEGER DEFAULT 0
);

CREATE TABLE periodos (
  id SERIAL PRIMARY KEY,
  anio INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  estado TEXT DEFAULT 'abierto',
  fecha_cierre TEXT,
  ingresos_mes REAL,
  gastos_mes REAL,
  ahorro_mes REAL,
  ahorro_acumulado REAL,
  cotiz_usd_ars_cierre REAL,
  cotiz_btc_usd_cierre REAL
);

CREATE TABLE categorias (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT DEFAULT 'ambos',
  color TEXT,
  orden INTEGER DEFAULT 0
);

CREATE TABLE cuentas (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,
  titular_id INTEGER,
  proposito TEXT DEFAULT 'otro',
  moneda TEXT DEFAULT 'ARS',
  activa INTEGER DEFAULT 1,
  orden INTEGER DEFAULT 0
);

CREATE TABLE conceptos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,
  categoria_id INTEGER,
  cuenta_id INTEGER,
  integrante_id INTEGER,
  moneda TEXT DEFAULT 'ARS',
  es_agrupado INTEGER DEFAULT 0,
  es_recurrente INTEGER DEFAULT 0,
  monto_referencia REAL,
  activo INTEGER DEFAULT 1,
  creado_en TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE movimientos (
  id SERIAL PRIMARY KEY,
  periodo_id INTEGER NOT NULL,
  concepto_id INTEGER NOT NULL,
  monto REAL DEFAULT 0,
  moneda TEXT DEFAULT 'ARS',
  estado TEXT DEFAULT 'pendiente',
  cuenta_id INTEGER,
  fecha_vencimiento TEXT,
  monto_ars REAL,
  vino_de_recurrente INTEGER DEFAULT 0,
  nota TEXT,
  creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE saldos_cuenta (
  id SERIAL PRIMARY KEY,
  cuenta_id INTEGER NOT NULL,
  periodo_id INTEGER,
  fecha TEXT NOT NULL,
  saldo REAL DEFAULT 0,
  nota TEXT
);

CREATE TABLE cotizaciones (
  id SERIAL PRIMARY KEY,
  par TEXT NOT NULL,
  valor REAL NOT NULL,
  fecha TEXT NOT NULL,
  periodo_id INTEGER
);

CREATE TABLE metas (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  moneda TEXT DEFAULT 'ARS',
  monto_objetivo REAL NOT NULL,
  monto_inicial REAL DEFAULT 0,
  fecha_inicio TEXT NOT NULL,
  fecha_objetivo TEXT NOT NULL,
  cuenta_id INTEGER,
  estado TEXT DEFAULT 'activa',
  creado_en TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE meta_aportes (
  id SERIAL PRIMARY KEY,
  meta_id INTEGER NOT NULL,
  periodo_id INTEGER,
  monto REAL NOT NULL,
  moneda TEXT DEFAULT 'ARS',
  fecha TEXT NOT NULL,
  nota TEXT
);

CREATE TABLE presupuesto_efectivo (
  id SERIAL PRIMARY KEY,
  periodo_id INTEGER NOT NULL,
  cuenta_id INTEGER NOT NULL,
  asignado REAL DEFAULT 0
);

CREATE TABLE settings (
  clave TEXT PRIMARY KEY,
  valor TEXT
);
