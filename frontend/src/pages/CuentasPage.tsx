import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { apiClient } from '../lib/api'
import './CuentasPage.css'

interface Cuenta {
  id: number
  nombre: string
  tipo: string
  moneda: string
  saldo_inicial: number
  saldo_actual: number
  estado: string
  creado_en: string
}

interface FormData {
  nombre: string
  tipo: string
  moneda: string
  saldo_inicial: number
}

export default function CuentasPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>(undefined)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    tipo: 'banco',
    moneda: 'ARS',
    saldo_inicial: 0,
  })
  const [formError, setFormError] = useState<string | undefined>(undefined)
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    loadCuentas()
  }, [])

  const loadCuentas = async () => {
    try {
      setLoading(true)
      const response = (await apiClient.getCuentas()) as any
      setCuentas(response?.data || [])
      setError(undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando cuentas')
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
    setFormData({ nombre: '', tipo: 'banco', moneda: 'ARS', saldo_inicial: 0 })
    setFormError(undefined)
    setModalOpen(true)
  }

  const openEditModal = (cuenta: Cuenta) => {
    setEditingId(cuenta.id)
    setFormData({
      nombre: cuenta.nombre,
      tipo: cuenta.tipo,
      moneda: cuenta.moneda,
      saldo_inicial: cuenta.saldo_inicial,
    })
    setFormError(undefined)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
    setFormData({ nombre: '', tipo: 'banco', moneda: 'ARS', saldo_inicial: 0 })
    setFormError(undefined)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError(undefined)

    try {
      if (editingId) {
        await apiClient.updateCuenta(editingId, formData)
      } else {
        await apiClient.createCuenta(formData)
      }
      await loadCuentas()
      closeModal()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error guardando cuenta')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Eliminar esta cuenta?')) return

    try {
      await apiClient.deleteCuenta(id)
      await loadCuentas()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error eliminando cuenta')
    }
  }

  const getTotalSaldos = () => {
    return cuentas.reduce((sum, c) => sum + (c.saldo_actual || 0), 0)
  }

  const handleLogoutClick = () => {
    handleLogout()
  }

  return (
    <div className="app-container">
      <div className="topbar">
        <div className="topbar-left">
          <h1>Cuentas</h1>
          <nav className="topbar-nav">
            <button onClick={() => navigate('/dashboard')} className="nav-btn">
              Dashboard
            </button>
            <button onClick={() => navigate('/mes-en-curso')} className="nav-btn">
              Mes en Curso
            </button>
            <button onClick={() => navigate('/cuentas')} className="nav-btn active">
              Cuentas
            </button>
          </nav>
        </div>
        <div className="user-menu">
          <span>{user?.email}</span>
          <button onClick={handleLogoutClick} className="logout-btn">
            Salir
          </button>
        </div>
      </div>

      <div className="content">
        {error && <div className="error-banner">{error}</div>}

        <div className="cuentas-header">
          <div className="total-saldos">
            <h2>Saldo Total</h2>
            <p className="total-amount">
              ${getTotalSaldos().toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <button onClick={openCreateModal} className="btn-primary">
            + Nueva Cuenta
          </button>
        </div>

        {loading ? (
          <div className="loading">Cargando cuentas...</div>
        ) : cuentas.length === 0 ? (
          <div className="empty-state">
            <p>No hay cuentas creadas</p>
            <button onClick={openCreateModal} className="btn-primary">
              Crear primera cuenta
            </button>
          </div>
        ) : (
          <div className="cuentas-grid">
            {cuentas.map((cuenta) => (
              <div key={cuenta.id} className="cuenta-card">
                <div className="cuenta-header">
                  <h3>{cuenta.nombre}</h3>
                  <span className="cuenta-tipo">{cuenta.tipo}</span>
                </div>
                <div className="cuenta-details">
                  <div className="detail-row">
                    <span className="label">Moneda:</span>
                    <span className="value">{cuenta.moneda}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Saldo Inicial:</span>
                    <span className="value">
                      ${cuenta.saldo_inicial.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="detail-row highlight">
                    <span className="label">Saldo Actual:</span>
                    <span className="value">
                      ${cuenta.saldo_actual.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Estado:</span>
                    <span className={`status status-${cuenta.estado}`}>{cuenta.estado}</span>
                  </div>
                </div>
                <div className="cuenta-actions">
                  <button onClick={() => openEditModal(cuenta)} className="btn-edit">
                    ✎ Editar
                  </button>
                  <button onClick={() => handleDelete(cuenta.id)} className="btn-delete">
                    ✕ Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Editar Cuenta' : 'Nueva Cuenta'}</h2>
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
                  placeholder="ej: Mi Banco Santander"
                  required
                  disabled={formLoading}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="tipo">Tipo</label>
                  <select
                    id="tipo"
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    disabled={formLoading}
                  >
                    <option value="banco">Banco</option>
                    <option value="tarjeta">Tarjeta de Crédito</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="inversión">Inversión</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="moneda">Moneda</label>
                  <select
                    id="moneda"
                    value={formData.moneda}
                    onChange={(e) => setFormData({ ...formData, moneda: e.target.value })}
                    disabled={formLoading}
                  >
                    <option value="ARS">ARS ($)</option>
                    <option value="USD">USD (US$)</option>
                    <option value="BTC">BTC (₿)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="saldo">Saldo Inicial</label>
                <input
                  id="saldo"
                  type="number"
                  value={formData.saldo_inicial}
                  onChange={(e) => setFormData({ ...formData, saldo_inicial: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  step="0.01"
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
