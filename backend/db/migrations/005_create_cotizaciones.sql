-- Crear tabla de cotizaciones
CREATE TABLE IF NOT EXISTS cotizaciones (
  id SERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  moneda_origen VARCHAR(3) NOT NULL, -- ARS, USD, BTC
  moneda_destino VARCHAR(3) NOT NULL, -- ARS, USD, BTC
  tasa_cambio DECIMAL(14,4) NOT NULL,
  fecha_vigencia DATE NOT NULL,
  es_vigente BOOLEAN DEFAULT true,
  creado_en TIMESTAMP DEFAULT NOW(),
  actualizado_en TIMESTAMP DEFAULT NOW()
);

-- Crear índices
CREATE INDEX idx_cotizaciones_usuario_id ON cotizaciones(usuario_id);
CREATE INDEX idx_cotizaciones_fecha ON cotizaciones(fecha_vigencia);
CREATE INDEX idx_cotizaciones_vigentes ON cotizaciones(usuario_id, es_vigente);
CREATE INDEX idx_cotizaciones_par ON cotizaciones(usuario_id, moneda_origen, moneda_destino, fecha_vigencia);

-- RLS policies
ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver sus propias cotizaciones"
  ON cotizaciones FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden crear cotizaciones"
  ON cotizaciones FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden actualizar sus cotizaciones"
  ON cotizaciones FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden eliminar sus cotizaciones"
  ON cotizaciones FOR DELETE
  USING (auth.uid() = usuario_id);
