-- Crear tabla de presupuestos
CREATE TABLE IF NOT EXISTS presupuestos (
  id SERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  periodo_id INT NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  concepto_id INT NOT NULL REFERENCES conceptos(id) ON DELETE CASCADE,
  monto_presupuestado DECIMAL(12,2) NOT NULL,
  estado VARCHAR(20) DEFAULT 'activo', -- 'activo', 'pausado', 'finalizado'
  creado_en TIMESTAMP DEFAULT NOW(),
  actualizado_en TIMESTAMP DEFAULT NOW(),
  UNIQUE(periodo_id, concepto_id)
);

-- Crear índices
CREATE INDEX idx_presupuestos_usuario_id ON presupuestos(usuario_id);
CREATE INDEX idx_presupuestos_periodo_id ON presupuestos(periodo_id);
CREATE INDEX idx_presupuestos_concepto_id ON presupuestos(concepto_id);

-- RLS policies
ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver presupuestos de sus periodos"
  ON presupuestos FOR SELECT
  USING (
    usuario_id = auth.uid()
  );

CREATE POLICY "Usuarios pueden crear presupuestos"
  ON presupuestos FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "Usuarios pueden actualizar sus presupuestos"
  ON presupuestos FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "Usuarios pueden eliminar sus presupuestos"
  ON presupuestos FOR DELETE
  USING (usuario_id = auth.uid());
