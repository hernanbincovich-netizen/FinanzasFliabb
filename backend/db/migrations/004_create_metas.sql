-- Crear tabla de metas
CREATE TABLE IF NOT EXISTS metas (
  id SERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  monto_objetivo DECIMAL(12,2) NOT NULL,
  monto_actual DECIMAL(12,2) DEFAULT 0,
  fecha_objetivo DATE,
  estado VARCHAR(20) DEFAULT 'activa', -- 'activa', 'completada', 'cancelada'
  creado_en TIMESTAMP DEFAULT NOW(),
  actualizado_en TIMESTAMP DEFAULT NOW()
);

-- Crear índices
CREATE INDEX idx_metas_usuario_id ON metas(usuario_id);
CREATE INDEX idx_metas_estado ON metas(estado);
CREATE INDEX idx_metas_fecha_objetivo ON metas(fecha_objetivo);

-- RLS policies
ALTER TABLE metas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver sus propias metas"
  ON metas FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden crear metas"
  ON metas FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden actualizar sus metas"
  ON metas FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden eliminar sus metas"
  ON metas FOR DELETE
  USING (auth.uid() = usuario_id);
