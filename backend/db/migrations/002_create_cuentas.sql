-- Crear tabla de cuentas
CREATE TABLE IF NOT EXISTS cuentas (
  id SERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  tipo VARCHAR(50) DEFAULT 'banco', -- 'banco', 'tarjeta', 'efectivo', 'inversión'
  moneda VARCHAR(3) DEFAULT 'ARS',
  saldo_inicial DECIMAL(12,2) DEFAULT 0,
  saldo_actual DECIMAL(12,2) DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'activa', -- 'activa', 'inactiva', 'cerrada'
  creado_en TIMESTAMP DEFAULT NOW(),
  actualizado_en TIMESTAMP DEFAULT NOW(),
  UNIQUE(usuario_id, nombre)
);

-- Crear índices
CREATE INDEX idx_cuentas_usuario_id ON cuentas(usuario_id);
CREATE INDEX idx_cuentas_estado ON cuentas(estado);

-- RLS policies
ALTER TABLE cuentas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver sus propias cuentas"
  ON cuentas FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden crear cuentas"
  ON cuentas FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden actualizar sus cuentas"
  ON cuentas FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden eliminar sus cuentas"
  ON cuentas FOR DELETE
  USING (auth.uid() = usuario_id);
