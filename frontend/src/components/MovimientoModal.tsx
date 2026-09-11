import { useState } from 'react'
import './MovimientoModal.css'

export interface MovimientoFormData {
  concepto_id: number
  monto: number
  moneda: 'ARS' | 'USD' | 'BTC'
  cuenta_id?: number
  estado?: 'pendiente' | 'pagado'
  fecha_vencimiento?: string
  nota?: string
}

interface MovimientoModalProps {
  isOpen: boolean
  isLoading?: boolean
  error?: string
  initialData?: Partial<MovimientoFormData>
  conceptos?: any[]
  onSubmit: (data: MovimientoFormData) => void
  onClose: () => void
  title?: string
}

export default function MovimientoModal({
  isOpen,
  isLoading = false,
  error,
  initialData,
  conceptos = [],
  onSubmit,
  onClose,
  title = 'Nuevo Movimiento',
}: MovimientoModalProps) {
  const [formData, setFormData] = useState<Partial<MovimientoFormData>>(
    initialData || {
      moneda: 'ARS',
      estado: 'pendiente',
    }
  )

  const [validationError, setValidationError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'monto' ? parseFloat(value) || 0 : value,
    }))
    setValidationError(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    // Validaciones
    if (!formData.concepto_id) {
      setValidationError('Concepto es requerido')
      return
    }

    if (!formData.monto || formData.monto <= 0) {
      setValidationError('Monto debe ser mayor a 0')
      return
    }

    if (!formData.moneda) {
      setValidationError('Moneda es requerida')
      return
    }

    onSubmit(formData as MovimientoFormData)
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="movimiento-form">
          {error && <div className="form-error">{error}</div>}
          {validationError && <div className="form-error">{validationError}</div>}

          {/* Concepto */}
          <div className="form-group">
            <label htmlFor="concepto_id">Concepto *</label>
            <select
              id="concepto_id"
              name="concepto_id"
              value={formData.concepto_id || ''}
              onChange={handleChange}
              disabled={isLoading}
            >
              <option value="">Seleccionar concepto...</option>
              {conceptos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Monto y Moneda */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="monto">Monto *</label>
              <input
                id="monto"
                type="number"
                name="monto"
                step="0.01"
                min="0"
                value={formData.monto || ''}
                onChange={handleChange}
                disabled={isLoading}
                placeholder="0,00"
              />
            </div>
            <div className="form-group">
              <label htmlFor="moneda">Moneda</label>
              <select
                id="moneda"
                name="moneda"
                value={formData.moneda || 'ARS'}
                onChange={handleChange}
                disabled={isLoading}
              >
                <option value="ARS">ARS ($)</option>
                <option value="USD">USD (US$)</option>
                <option value="BTC">BTC (₿)</option>
              </select>
            </div>
          </div>

          {/* Estado */}
          <div className="form-group">
            <label htmlFor="estado">Estado</label>
            <select
              id="estado"
              name="estado"
              value={formData.estado || 'pendiente'}
              onChange={handleChange}
              disabled={isLoading}
            >
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
            </select>
          </div>

          {/* Vencimiento */}
          <div className="form-group">
            <label htmlFor="fecha_vencimiento">Fecha de Vencimiento</label>
            <input
              id="fecha_vencimiento"
              type="date"
              name="fecha_vencimiento"
              value={formData.fecha_vencimiento || ''}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>

          {/* Nota */}
          <div className="form-group">
            <label htmlFor="nota">Nota</label>
            <textarea
              id="nota"
              name="nota"
              value={formData.nota || ''}
              onChange={handleChange}
              disabled={isLoading}
              rows={2}
              placeholder="Nota opcional..."
            />
          </div>

          {/* Botones */}
          <div className="form-actions">
            <button type="button" onClick={onClose} disabled={isLoading} className="btn-cancel">
              Cancelar
            </button>
            <button type="submit" disabled={isLoading} className="btn-submit">
              {isLoading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
