-- Crear tabla de categorías
CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE
);

-- Insertar categorías por defecto (ignorar si ya existen)
DELETE FROM categorias WHERE nombre IN ('Ingresos', 'Gastos', 'Ahorros', 'Inversiones');
INSERT INTO categorias (nombre) VALUES
  ('Ingresos'),
  ('Gastos'),
  ('Ahorros'),
  ('Inversiones');

-- Crear tabla de conceptos (sin usuario_id - son globales)
CREATE TABLE IF NOT EXISTS conceptos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  tipo VARCHAR(20) NOT NULL, -- 'ingreso', 'gasto'
  es_recurrente BOOLEAN DEFAULT false,
  creado_en TIMESTAMP DEFAULT NOW()
);

-- Insertar conceptos por defecto
DELETE FROM conceptos WHERE nombre IN ('Sueldo', 'Freelance', 'Bonus', 'Supermercado', 'Servicios', 'Entretenimiento', 'Transporte');
INSERT INTO conceptos (nombre, tipo, es_recurrente) VALUES
  ('Sueldo', 'ingreso', true),
  ('Freelance', 'ingreso', false),
  ('Bonus', 'ingreso', false),
  ('Supermercado', 'gasto', true),
  ('Servicios', 'gasto', true),
  ('Entretenimiento', 'gasto', false),
  ('Transporte', 'gasto', true);

-- Crear tabla de períodos
CREATE TABLE IF NOT EXISTS periodos (
  id SERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  anio INTEGER NOT NULL,
  estado VARCHAR(20) DEFAULT 'abierto', -- 'abierto', 'cerrado'
  fecha_cierre TIMESTAMP,
  creado_en TIMESTAMP DEFAULT NOW(),
  actualizado_en TIMESTAMP DEFAULT NOW(),
  UNIQUE(usuario_id, mes, anio)
);

CREATE INDEX idx_periodos_usuario_id ON periodos(usuario_id);
CREATE INDEX idx_periodos_estado ON periodos(estado);

-- RLS policies para periodos
ALTER TABLE periodos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver sus propios periodos"
  ON periodos FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden crear periodos"
  ON periodos FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden actualizar sus periodos"
  ON periodos FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden eliminar sus periodos"
  ON periodos FOR DELETE
  USING (auth.uid() = usuario_id);

-- Crear tabla de movimientos
CREATE TABLE IF NOT EXISTS movimientos (
  id SERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  periodo_id INTEGER NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  concepto_id INTEGER NOT NULL REFERENCES conceptos(id),
  monto DECIMAL(12,2) NOT NULL,
  moneda VARCHAR(3) DEFAULT 'ARS',
  estado VARCHAR(20) DEFAULT 'pendiente', -- 'pendiente', 'pagado', 'cancelado'
  nota TEXT,
  creado_en TIMESTAMP DEFAULT NOW(),
  actualizado_en TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_movimientos_usuario_id ON movimientos(usuario_id);
CREATE INDEX idx_movimientos_periodo_id ON movimientos(periodo_id);
CREATE INDEX idx_movimientos_concepto_id ON movimientos(concepto_id);
CREATE INDEX idx_movimientos_estado ON movimientos(estado);

-- RLS policies para movimientos
ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver sus propios movimientos"
  ON movimientos FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden crear movimientos"
  ON movimientos FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden actualizar sus movimientos"
  ON movimientos FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden eliminar sus movimientos"
  ON movimientos FOR DELETE
  USING (auth.uid() = usuario_id);
