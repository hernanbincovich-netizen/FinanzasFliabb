import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { apiClient } from '../lib/api'
import './CotizacionesPage.css'

interface Cotizacion {
  id: number
  moneda_origen: string
  moneda_destino: string
  tasa_cambio: number
  fecha_vigencia: string
  es_vigente: boolean
  creado_en: string
}

interface FormData {
  moneda_origen: string
  moneda_destino: string
  tasa_cambio: number
  fecha_vigencia: string
  es_vigente: boolean
}

const MONEDAS = ['ARS', 'USD', 'BTC']

export default function CotizacionesPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [vigentes, setVigentes] = useState<Cotizacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>(undefined)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<FormData>({
    moneda_origen: 'ARS',
    moneda_destino: 'USD',
    tasa_cambio: 0,
    fecha_vigencia: new Date().toISOString().split('T')[0],
    es_vigente: true,
  })
  const [formError, setFormError] = useState<string | undefined>(undefined)
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    loadCotizaciones()
  }, [])

  const loadCotizaciones = async () => {
    try {
      setLoading(true)
      const [allRes, vigentesRes] = await Promise.all([
        apiClient.getCotizaciones(),
        apiClient.getCotizacionesVigentes(),
      ])
      setCotizaciones((allRes as any)?.data || [])
      setVigentes((vigentesRes as any)?.data || [])
      setError(undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando cotizaciones')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const openCreateModal = () => {
    setEditingId(null)
    setFormData({
      moneda_origen: 'ARS',
      moneda_destino: 'USD',
      tasa_cambio: 0,
      fecha_vigencia: new Date().toISOString().split('T')[0],
      es_vigente: true,
    })
    setFormError(undefined)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
    setFormError(undefined)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError(undefined)

    try {
      if (editingId) {
        await apiClient.updateCotizacion(editingId, formData)
      } else {
        await apiClient.createCotizacion(formData)
      }
      await loadCotizaciones()
      closeModal()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error guardando cotización')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Eliminar esta cotización?')) return

    try {
      await apiClient.deleteCotizacion(id)
      await loadCotizaciones()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error eliminando cotización')
    }
  }

  const getOtrasMonedas = (moneda: string) => {
    return MONEDAS.filter((m) => m !== moneda)
  }

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR')
  }

  return (
    <div className="app-container">
      <div className="topbar">
        <div className="topbar-left">
          <h1>Cotizaciones</h1>
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
            <button onClick={() => navigate('/presupuestos')} className="nav-btn">
              Presupuestos
            </button>
            <button onClick={() => navigate('/metas')} className="nav-btn">
              Metas
            </button>
            <button onClick={() => navigate('/cotizaciones')} className="nav-btn active">
              Cotizaciones
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

        <div className="cotizaciones-header">
          <h2>Tipos de Cambio</h2>
          <button onClick={openCreateModal} className="btn-primary">
            + Nueva Cotización
          </button>
        </div>

        {loading ? (
          <div className="loading">Cargando cotizaciones...</div>
        ) : (
          <>
            {vigentes.length > 0 && (
              <>
                <h3 className="section-title">Cotizaciones Vigentes</h3>
                <div className="cotizaciones-vigentes">
                  {vigentes.map((cot) => (
                    <div key={cot.id} className="cotizacion-vigente">
                      <div className="par">
                        <span className="moneda">{cot.moneda_origen}</span>
                        <span className="arrow">→</span>
                        <span className="moneda">{cot.moneda_destino}</span>
                      </div>
                      <div className="tasa">
                        <span className="valor">{cot.tasa_cambio.toFixed(4)}</span>
                      </div>
                      <div className="fecha">{formatFecha(cot.fecha_vigencia)}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <h3 className="section-title">Historial de Cotizaciones</h3>
            {cotizaciones.length === 0 ? (
              <div className="empty-state">
                <p>No hay cotizaciones registradas</p>
                <button onClick={openCreateModal} className="btn-primary">
                  Registrar primera cotización
                </button>
              </div>
            ) : (
              <div className="cotizaciones-list">
                {cotizaciones.map((cot) => (
                  <div key={cot.id} className={`cotizacion-item ${cot.es_vigente ? 'vigente' : ''}`}>
                    <div className="cotizacion-info">
                      <div className="par-info">
                        <span className="label">
                          {cot.moneda_origen} → {cot.moneda_destino}
                        </span>
                        {cot.es_vigente && <span className="badge-vigente">✓ Vigente</span>}
                      </div>
                      <div className="tasa-info">
                        <span className="label">Tasa:</span>
                        <span className="tasa">{cot.tasa_cambio.toFixed(4)}</span>
                      </div>
                      <div className="fecha-info">
                        <span className="label">Fecha:</span>
                        <span className="fecha">{formatFecha(cot.fecha_vigencia)}</span>
                      </div>
                    </div>
                    <div className="cotizacion-actions">
                      <button
                        onClick={() => {
                          setEditingId(cot.id)
                          setFormData({
                            moneda_origen: cot.moneda_origen,
                            moneda_destino: cot.moneda_destino,
                            tasa_cambio: cot.tasa_cambio,
                            fecha_vigencia: cot.fecha_vigencia,
                            es_vigente: cot.es_vigente,
                          })
                          setModalOpen(true)
                        }}
                        className="btn-edit"
                      >
                        ✎ Editar
                      </button>
                      <button onClick={() => handleDelete(cot.id)} className="btn-delete">
                        ✕ Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Editar Cotización' : 'Nueva Cotización'}</h2>
              <button onClick={closeModal} className="close-btn">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="moneda_origen">Moneda Origen *</label>
                  <select
                    id="moneda_origen"
                    value={formData.moneda_origen}
                    onChange={(e) => setFormData({ ...formData, moneda_origen: e.target.value })}
                    required
                    disabled={formLoading || editingId !== null}
                  >
                    {MONEDAS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="moneda_destino">Moneda Destino *</label>
                  <select
                    id="moneda_destino"
                    value={formData.moneda_destino}
                    onChange={(e) => setFormData({ ...formData, moneda_destino: e.target.value })}
                    required
                    disabled={formLoading || editingId !== null}
                  >
                    {getOtrasMonedas(formData.moneda_origen).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="tasa_cambio">Tasa de Cambio *</label>
                  <input
                    id="tasa_cambio"
                    type="number"
                    value={formData.tasa_cambio}
                    onChange={(e) => setFormData({ ...formData, tasa_cambio: parseFloat(e.target.value) || 0 })}
                    placeholder="0.0000"
                    step="0.0001"
                    required
                    disabled={formLoading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="fecha_vigencia">Fecha Vigencia</label>
                  <input
                    id="fecha_vigencia"
                    type="date"
                    value={formData.fecha_vigencia}
                    onChange={(e) => setFormData({ ...formData, fecha_vigencia: e.target.value })}
                    disabled={formLoading}
                  />
                </div>
              </div>

              <div className="form-group checkbox">
                <label htmlFor="es_vigente">
                  <input
                    id="es_vigente"
                    type="checkbox"
                    checked={formData.es_vigente}
                    onChange={(e) => setFormData({ ...formData, es_vigente: e.target.checked })}
                    disabled={formLoading}
                  />
                  <span>Marcar como cotización vigente</span>
                </label>
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
