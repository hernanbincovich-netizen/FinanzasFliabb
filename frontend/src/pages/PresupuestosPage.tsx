import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useDataStore } from '../stores/dataStore'
import { apiClient } from '../lib/api'
import './PresupuestosPage.css'

interface Presupuesto {
  id: number
  periodo_id: number
  concepto_id: number
  monto_presupuestado: number
  gasto_actual: number
  porcentaje: number
  excedido: boolean
  estado: string
  conceptos: { id: number; nombre: string; tipo: string }
}

interface FormData {
  concepto_id: number
  monto_presupuestado: number
}

export default function PresupuestosPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { periodoActual, periodos } = useDataStore()

  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
  const [conceptos, setConceptos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>(undefined)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<FormData>({
    concepto_id: 0,
    monto_presupuestado: 0,
  })
  const [formError, setFormError] = useState<string | undefined>(undefined)
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    if (periodoActual?.id) {
      loadPresupuestos()
      loadConceptos()
    }
  }, [periodoActual?.id])

  const loadPresupuestos = async () => {
    if (!periodoActual?.id) return
    try {
      setLoading(true)
      const response = (await apiClient.getPresupuestosPeriodo(periodoActual.id)) as any
      setPresupuestos(response?.data || [])
      setError(undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando presupuestos')
    } finally {
      setLoading(false)
    }
  }

  const loadConceptos = async () => {
    try {
      const response = (await apiClient.getConceptos('gasto')) as any
      setConceptos(response?.data || [])
    } catch (err) {
      console.error('Error loading conceptos:', err)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const openCreateModal = () => {
    setEditingId(null)
    setFormData({ concepto_id: 0, monto_presupuestado: 0 })
    setFormError(undefined)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
    setFormData({ concepto_id: 0, monto_presupuestado: 0 })
    setFormError(undefined)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError(undefined)

    try {
      if (!periodoActual?.id) throw new Error('No hay período seleccionado')

      if (editingId) {
        await apiClient.updatePresupuesto(editingId, {
          monto_presupuestado: formData.monto_presupuestado,
        })
      } else {
        await apiClient.createPresupuesto({
          periodo_id: periodoActual.id,
          concepto_id: formData.concepto_id,
          monto_presupuestado: formData.monto_presupuestado,
        })
      }
      await loadPresupuestos()
      closeModal()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error guardando presupuesto')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Eliminar este presupuesto?')) return

    try {
      await apiClient.deletePresupuesto(id)
      await loadPresupuestos()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error eliminando presupuesto')
    }
  }

  const getTotalPresupuestado = () => {
    return presupuestos.reduce((sum, p) => sum + (p.monto_presupuestado || 0), 0)
  }

  const getTotalGastado = () => {
    return presupuestos.reduce((sum, p) => sum + (p.gasto_actual || 0), 0)
  }

  const getPresupuestosExcedidos = () => {
    return presupuestos.filter((p) => p.excedido).length
  }

  const getConceptoNombre = (conceptoId: number) => {
    const concepto = conceptos.find((c) => c.id === conceptoId)
    return concepto?.nombre || `Concepto ${conceptoId}`
  }

  return (
    <div className="app-container">
      <div className="topbar">
        <div className="topbar-left">
          <h1>Presupuestos</h1>
          <nav className="topbar-nav">
            <button onClick={() => navigate('/dashboard')} className="nav-btn">
              Dashboard
            </button>
            <button onClick={() => navigate('/mes-en-curso')} className="nav-btn">
              Mes en Curso
            </button>
            <button onClick={() => navigate('/cuentas')} className="nav-btn">
              Cuentas
            </button>
            <button onClick={() => navigate('/presupuestos')} className="nav-btn active">
              Presupuestos
            </button>
          </nav>
        </div>
        <div className="user-menu">
          <span>{user?.email}</span>
          <button onClick={handleLogout} className="logout-btn">
            Salir
          </button>
        </div>
      </div>

      <div className="content">
        {error && <div className="error-banner">{error}</div>}

        {!periodoActual ? (
          <div className="empty-state">
            <p>No hay período seleccionado</p>
          </div>
        ) : (
          <>
            <div className="presupuestos-header">
              <div className="periodo-info">
                <h2>
                  {periodoActual.mes} / {periodoActual.anio}
                </h2>
              </div>
              <button onClick={openCreateModal} className="btn-primary" disabled={!periodoActual}>
                + Nuevo Presupuesto
              </button>
            </div>

            {loading ? (
              <div className="loading">Cargando presupuestos...</div>
            ) : (
              <>
                <div className="presupuestos-summary">
                  <div className="summary-card">
                    <span className="label">Presupuestado</span>
                    <span className="value">
                      ${getTotalPresupuestado().toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="summary-card">
                    <span className="label">Gastado</span>
                    <span className="value">
                      ${getTotalGastado().toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="summary-card">
                    <span className="label">Disponible</span>
                    <span className={`value ${getTotalGastado() > getTotalPresupuestado() ? 'alert' : ''}`}>
                      $
                      {(getTotalPresupuestado() - getTotalGastado()).toLocaleString('es-AR', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  {getPresupuestosExcedidos() > 0 && (
                    <div className="summary-card alert">
                      <span className="label">⚠️ Excedidos</span>
                      <span className="value">{getPresupuestosExcedidos()}</span>
                    </div>
                  )}
                </div>

                {presupuestos.length === 0 ? (
                  <div className="empty-state">
                    <p>No hay presupuestos para este período</p>
                    <button onClick={openCreateModal} className="btn-primary">
                      Crear primer presupuesto
                    </button>
                  </div>
                ) : (
                  <div className="presupuestos-list">
                    {presupuestos.map((pres) => (
                      <div key={pres.id} className={`presupuesto-item ${pres.excedido ? 'excedido' : ''}`}>
                        <div className="item-header">
                          <h3>{getConceptoNombre(pres.concepto_id)}</h3>
                          <span className={`badge ${pres.excedido ? 'badge-alert' : 'badge-ok'}`}>
                            {pres.excedido ? '⚠️ Excedido' : '✓ OK'}
                          </span>
                        </div>

                        <div className="item-stats">
                          <div className="stat">
                            <span className="label">Presupuestado:</span>
                            <span className="value">
                              ${pres.monto_presupuestado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="stat">
                            <span className="label">Gastado:</span>
                            <span className="value">
                              ${pres.gasto_actual.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        <div className="progress-container">
                          <div className="progress-bar">
                            <div
                              className={`progress-fill ${pres.excedido ? 'alert' : ''}`}
                              style={{ width: `${Math.min(pres.porcentaje, 100)}%` }}
                            />
                          </div>
                          <span className="progress-text">{Math.round(pres.porcentaje)}%</span>
                        </div>

                        <div className="item-actions">
                          <button
                            onClick={() => {
                              setEditingId(pres.id)
                              setFormData({
                                concepto_id: pres.concepto_id,
                                monto_presupuestado: pres.monto_presupuestado,
                              })
                              setModalOpen(true)
                            }}
                            className="btn-edit"
                          >
                            ✎ Editar
                          </button>
                          <button onClick={() => handleDelete(pres.id)} className="btn-delete">
                            ✕ Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}</h2>
              <button onClick={closeModal} className="close-btn">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="concepto">Concepto *</label>
                <select
                  id="concepto"
                  value={formData.concepto_id}
                  onChange={(e) => setFormData({ ...formData, concepto_id: parseInt(e.target.value) })}
                  required
                  disabled={formLoading || editingId !== null}
                >
                  <option value={0}>Seleccionar concepto...</option>
                  {conceptos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="monto">Monto Presupuestado *</label>
                <input
                  id="monto"
                  type="number"
                  value={formData.monto_presupuestado}
                  onChange={(e) => setFormData({ ...formData, monto_presupuestado: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  step="0.01"
                  required
                  disabled={formLoading}
                />
              </div>

              {formError && <div className="error-message">{formError}</div>}

              <div className="modal-actions">
                <button type="button" onClick={closeModal} className="btn-cancel" disabled={formLoading}>
                  Cancelar
                </button>
                <button type="submit" className="btn-submit" disabled={formLoading}>
                  {formLoading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
