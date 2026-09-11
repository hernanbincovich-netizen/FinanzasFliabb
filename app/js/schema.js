/* Esquema de la base — SQLite. Se ejecuta una sola vez al crear una base nueva. */
window.SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE settings (
  clave TEXT PRIMARY KEY,
  valor TEXT
);

CREATE TABLE integrantes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  orden INTEGER DEFAULT 0
);

CREATE TABLE periodos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anio INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  estado TEXT NOT NULL DEFAULT 'abierto',           -- abierto | cerrado
  fecha_cierre TEXT,
  ingresos_mes REAL,
  gastos_mes REAL,
  ahorro_mes REAL,
  ahorro_acumulado REAL,
  cotiz_usd_ars_cierre REAL,
  cotiz_btc_usd_cierre REAL,
  UNIQUE(anio, mes)
);

CREATE TABLE categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL DEFAULT 'ambos',               -- gasto | ingreso | ambos
  color TEXT,
  orden INTEGER DEFAULT 0
);

CREATE TABLE cuentas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,                               -- caja_ahorro | cuenta_sueldo | billetera_efectivo | billetera_cripto | inversion | tarjeta_credito | otro
  titular_id INTEGER REFERENCES integrantes(id),
  proposito TEXT NOT NULL DEFAULT 'otro',           -- gastos_mes | efectivo_mes | ahorro_metas | fondo_emergencia | ahorro_largo_plazo | otro
  moneda TEXT NOT NULL DEFAULT 'ARS',               -- ARS | USD | BTC
  activa INTEGER NOT NULL DEFAULT 1,
  orden INTEGER DEFAULT 0
);

CREATE TABLE saldos_cuenta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cuenta_id INTEGER NOT NULL REFERENCES cuentas(id) ON DELETE CASCADE,
  periodo_id INTEGER REFERENCES periodos(id) ON DELETE SET NULL,
  fecha TEXT NOT NULL,
  saldo REAL NOT NULL DEFAULT 0,                    -- en la moneda de la cuenta
  nota TEXT
);

CREATE TABLE conceptos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,                               -- ingreso | gasto
  categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
  cuenta_id INTEGER REFERENCES cuentas(id) ON DELETE SET NULL,
  integrante_id INTEGER REFERENCES integrantes(id) ON DELETE SET NULL,
  moneda TEXT NOT NULL DEFAULT 'ARS',
  es_agrupado INTEGER NOT NULL DEFAULT 0,
  es_recurrente INTEGER NOT NULL DEFAULT 0,
  monto_referencia REAL,
  activo INTEGER NOT NULL DEFAULT 1,
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE movimientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  periodo_id INTEGER NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  concepto_id INTEGER NOT NULL REFERENCES conceptos(id) ON DELETE CASCADE,
  monto REAL NOT NULL DEFAULT 0,                    -- en 'moneda'
  moneda TEXT NOT NULL DEFAULT 'ARS',
  estado TEXT NOT NULL DEFAULT 'pendiente',         -- pendiente | pagado
  cuenta_id INTEGER REFERENCES cuentas(id) ON DELETE SET NULL,
  fecha_vencimiento TEXT,                           -- solo gastos, opcional
  monto_ars REAL,                                   -- NULL hasta el cierre del mes
  vino_de_recurrente INTEGER NOT NULL DEFAULT 0,
  nota TEXT,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(periodo_id, concepto_id)
);

CREATE TABLE presupuesto_efectivo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  periodo_id INTEGER NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  cuenta_id INTEGER NOT NULL REFERENCES cuentas(id) ON DELETE CASCADE,
  asignado REAL NOT NULL DEFAULT 0,                 -- en ARS
  UNIQUE(periodo_id, cuenta_id)
);

CREATE TABLE cotizaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  par TEXT NOT NULL,                                -- USD_ARS | BTC_USD
  valor REAL NOT NULL,
  fecha TEXT NOT NULL,
  periodo_id INTEGER REFERENCES periodos(id) ON DELETE SET NULL
);

CREATE TABLE metas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  moneda TEXT NOT NULL DEFAULT 'ARS',
  monto_objetivo REAL NOT NULL,
  monto_inicial REAL NOT NULL DEFAULT 0,            -- ya ahorrado al crearla
  fecha_inicio TEXT NOT NULL,                       -- YYYY-MM
  fecha_objetivo TEXT NOT NULL,                     -- YYYY-MM
  cuenta_id INTEGER REFERENCES cuentas(id) ON DELETE SET NULL,
  estado TEXT NOT NULL DEFAULT 'activa',            -- activa | cumplida | pausada | cancelada
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE meta_aportes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meta_id INTEGER NOT NULL REFERENCES metas(id) ON DELETE CASCADE,
  periodo_id INTEGER REFERENCES periodos(id) ON DELETE SET NULL,
  monto REAL NOT NULL,
  moneda TEXT NOT NULL DEFAULT 'ARS',
  fecha TEXT NOT NULL,
  nota TEXT
);

CREATE INDEX ix_mov_periodo ON movimientos(periodo_id);
CREATE INDEX ix_saldos_cuenta ON saldos_cuenta(cuenta_id, fecha);
CREATE INDEX ix_cotiz_par ON cotizaciones(par, fecha);
CREATE INDEX ix_aportes_meta ON meta_aportes(meta_id);
`;
