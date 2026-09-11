import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { apiClient } from '../lib/api'
import './MetasPage.css'

interface Meta {
  id: number
  nombre: string
  descripcion: string
  monto_objetivo: number
  monto_actual: number
  fecha_objetivo: string
  estado: string
  porcentaje: number
  completada: boolean
  dias_restantes: number | null
}

interface FormData {
  nombre: string
  descripcion: string
  monto_objetivo: number
  fecha_objetivo: string
  monto_actual: number
}

export default function MetasPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const [metas, setMetas] = useState<Meta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>(undefined)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    descripcion: '',
    monto_objetivo: 0,
    fecha_objetivo: '',
    monto_actual: 0,
  })
  const [formError, setFormError] = useState<string | undefined>(undefined)
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    loadMetas()
  }, [])

  const loadMetas = async () => {
    try {
      setLoading(true)
      const response = (await apiClient.getMetas()) as any
      setMetas(response?.data || [])
      setError(undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando metas')
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
      nombre: '',
      descripcion: '',
      monto_objetivo: 0,
      fecha_objetivo: '',
      monto_actual: 0,
    })
    setFormError(undefined)
    setModalOpen(true)
  }

  const openEditModal = (meta: Meta) => {
    setEditingId(meta.id)
    setFormData({
      nombre: meta.nombre,
      descripcion: meta.descripcion || '',
      monto_objetivo: meta.monto_objetivo,
      fecha_objetivo: meta.fecha_objetivo || '',
      monto_actual: meta.monto_actual,
    })
    setFormError(undefined)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
    setFormData({
      nombre: '',
      descripcion: '',
      monto_objetivo: 0,
      fecha_objetivo: '',
      monto_actual: 0,
    })
    setFormError(undefined)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError(undefined)

    try {
      if (editingId) {
        await apiClient.updateMeta(editingId, formData)
      } else {
        await apiClient.createMeta(formData)
      }
      await loadMetas()
      closeModal()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error guardando meta')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Eliminar esta meta?')) return

    try {
      await apiClient.deleteMeta(id)
      await loadMetas()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error eliminando meta')
    }
  }

  const handleMarcarCompletada = async (meta: Meta) => {
    try {
      await apiClient.updateMeta(meta.id, {
        estado: meta.estado === 'completada' ? 'activa' : 'completada',
        monto_actual: meta.monto_objetivo,
      })
      await loadMetas()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando meta')
    }
  }

  const getTotalAhorroRequerido = () => {
    return metas.filter((m) => m.estado === 'activa').reduce((sum, m) => sum + m.monto_objetivo, 0)
  }

  const getTotalAhorroActual = () => {
    return metas.reduce((sum, m) => sum + m.monto_actual, 0)
  }

  const getMetasActivas = () => {
    return metas.filter((m) => m.estado === 'activa').length
  }

  const getMetasCompletadas = () => {
    return metas.filter((m) => m.estado === 'completada').length
  }

  const formatFecha = (fecha: string) => {
    if (!fecha) return '-'
    return new Date(fecha).toLocaleDateString('es-AR')
  }

  return (
    <div className="app-container">
      <div className="topbar">
        <div className="topbar-left">
          <h1>Metas</h1>
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
            <button onClick={() => navigate('/metas')} className="nav-btn active">
              Metas
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

        <div className="metas-header">
          <h2>Metas de Ahorro</h2>
          <button onClick={openCreateModal} className="btn-primary">
            + Nueva Meta
          </button>
        </div>

        {loading ? (
          <div className="loading">Cargando metas...</div>
        ) : (
          <>
            <div className="metas-summary">
              <div className="summary-card">
                <span className="label">Metas Activas</span>
                <span className="value">{getMetasActivas()}</span>
              </div>
              <div className="summary-card">
                <span className="label">Metas Completadas</span>
                <span className="value">{getMetasCompletadas()}</span>
              </div>
              <div className="summary-card">
                <span className="label">Ahorro Requerido</span>
                <span className="value">
                  ${getTotalAhorroRequerido().toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="summary-card">
                <span className="label">Ahorro Actual</span>
                <span className="value">
                  ${getTotalAhorroActual().toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {metas.length === 0 ? (
              <div className="empty-state">
                <p>No hay metas creadas</p>
                <button onClick={openCreateModal} className="btn-primary">
                  Crear primera meta
                </button>
              </div>
            ) : (
              <div className="metas-list">
                {metas.map((meta) => (
                  <div key={meta.id} className={`meta-card ${meta.completada ? 'completada' : ''}`}>
                    <div className="meta-header">
                      <div>
                        <h3>{meta.nombre}</h3>
                        {meta.descripcion && <p className="meta-desc">{meta.descripcion}</p>}
                      </div>
                      <button
                        onClick={() => handleMarcarCompletada(meta)}
                        className={`btn-estado ${meta.completada ? 'completada' : ''}`}
                      >
                        {meta.completada ? '✓ Completada' : 'Activa'}
                      </button>
                    </div>

                    <div className="meta-details">
                      <div className="detail">
                        <span className="label">Objetivo:</span>
                        <span className="value">
                          ${meta.monto_objetivo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="detail">
                        <span className="label">Ahorrado:</span>
                        <span className="value">
                          ${meta.monto_actual.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      {meta.fecha_objetivo && (
                        <div className="detail">
                          <span className="label">Fecha Objetivo:</span>
                          <span className="value">{formatFecha(meta.fecha_objetivo)}</span>
                        </div>
                      )}
                      {meta.dias_restantes !== null && meta.dias_restantes > 0 && (
                        <div className="detail">
                          <span className="label">Días Restantes:</span>
                          <span className="value">{meta.dias_restantes}</span>
                        </div>
                      )}
                    </div>

                    <div className="progress-container">
                      <div className="progress-bar">
                        <div
                          className={`progress-fill ${meta.completada ? 'completada' : ''}`}
                          style={{ width: `${Math.min(meta.porcentaje, 100)}%` }}
                        />
                      </div>
                      <span className="progress-text">{Math.round(meta.porcentaje)}%</span>
                    </div>

                    <div className="meta-actions">
                      <button onClick={() => openEditModal(meta)} className="btn-edit">
                        ✎ Editar
                      </button>
                      <button onClick={() => handleDelete(meta.id)} className="btn-delete">
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
              <h2>{editingId ? 'Editar Meta' : 'Nueva Meta'}</h2>
              <button onClick={closeModal} className="close-btn">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="nombre">Nombre *</label>
                <input
                  id="nombre"
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="ej: Viaje a Europa"
                  required
                  disabled={formLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="descripcion">Descripción</label>
                <textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="ej: Viaje planeado para el próximo verano"
                  rows={3}
                  disabled={formLoading}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="monto_objetivo">Monto Objetivo *</label>
                  <input
                    id="monto_objetivo"
                    type="number"
                    value={formData.monto_objetivo}
                    onChange={(e) => setFormData({ ...formData, monto_objetivo: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    step="0.01"
                    required
                    disabled={formLoading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="monto_actual">Monto Ahorrado Actual</label>
                  <input
                    id="monto_actual"
                    type="number"
                    value={formData.monto_actual}
                    onChange={(e) => setFormData({ ...formData, monto_actual: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    step="0.01"
                    disabled={formLoading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="fecha_objetivo">Fecha Objetivo</label>
                <input
                  id="fecha_objetivo"
                  type="date"
                  value={formData.fecha_objetivo}
                  onChange={(e) => setFormData({ ...formData, fecha_objetivo: e.target.value })}
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
