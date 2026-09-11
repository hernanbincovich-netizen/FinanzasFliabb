import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useDataStore } from '../stores/dataStore'
import { apiClient } from '../lib/api'
import KPICard from '../components/KPICard'
import MovimientosTable from '../components/MovimientosTable'
import './MesCursoPage.css'

export default function MesCursoPage() {
  const { user, logout } = useAuthStore()
  const { periodos, periodoActual, movimientos, fetchPeriodos, setPeriodoActual, movimientosLoading } =
    useDataStore()

  const [cerrando, setCerrando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar períodos al montar
  useEffect(() => {
    fetchPeriodos()
  }, [fetchPeriodos])

  // Navegar a período anterior
  const goToPreviousMes = () => {
    if (!periodoActual) return

    let prevMes = periodoActual.mes - 1
    let prevAnio = periodoActual.anio

    if (prevMes < 1) {
      prevMes = 12
      prevAnio -= 1
    }

    const encontrado = periodos.find((p) => p.anio === prevAnio && p.mes === prevMes)
    if (encontrado) {
      setPeriodoActual(encontrado)
    }
  }

  // Navegar a período siguiente
  const goToNextMes = () => {
    if (!periodoActual) return

    let nextMes = periodoActual.mes + 1
    let nextAnio = periodoActual.anio

    if (nextMes > 12) {
      nextMes = 1
      nextAnio += 1
    }

    const encontrado = periodos.find((p) => p.anio === nextAnio && p.mes === nextMes)
    if (encontrado) {
      setPeriodoActual(encontrado)
    }
  }

  // Cerrar período
  const handleCerrarPeriodo = async () => {
    if (!periodoActual || periodoActual.estado === 'cerrado') return

    if (!window.confirm('¿Cerrar este período? Esta acción es irreversible.')) {
      return
    }

    try {
      setCerrando(true)
      setError(null)
      await apiClient.cerrarPeriodo(periodoActual.id)
      // Recargar datos
      await fetchPeriodos()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cerrando período')
    } finally {
      setCerrando(false)
    }
  }

  // Reabrir período
  const handleReabrirPeriodo = async () => {
    if (!periodoActual || periodoActual.estado === 'abierto') return

    if (!window.confirm('¿Reabrir este período? Podrá editarlo de nuevo.')) {
      return
    }

    try {
      setCerrando(true)
      setError(null)
      await apiClient.reabrirPeriodo(periodoActual.id)
      // Recargar datos
      await fetchPeriodos()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error reabriendo período')
    } finally {
      setCerrando(false)
    }
  }

  const formatearMesAnio = (periodo: any) => {
    const meses = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ]
    return `${meses[periodo.mes - 1]} ${periodo.anio}`
  }

  if (!periodoActual) {
    return (
      <div className="app-container">
        <div className="topbar">
          <h1>Mes en Curso</h1>
          <div className="user-menu">
            <span>{user?.email}</span>
            <button onClick={logout} className="logout-btn">
              Salir
            </button>
          </div>
        </div>
        <div className="content">
          <div className="loading">Cargando período...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <div className="topbar">
        <h1>Mes en Curso</h1>
        <div className="periodo-selector">
          <button onClick={goToPreviousMes}>&lsaquo;</button>
          <span className="periodo-label">{formatearMesAnio(periodoActual)}</span>
          <button onClick={goToNextMes}>&rsaquo;</button>
        </div>
        <div className="user-menu">
          <span>{user?.email}</span>
          <button onClick={logout} className="logout-btn">
            Salir
          </button>
        </div>
      </div>

      <div className="content">
        {error && <div className="error-banner">{error}</div>}

        {/* KPIs */}
        <div className="kpis-grid">
          <KPICard
            label="Ingresos"
            value={`$ ${(periodoActual.ingresos_mes_calculado || 0).toLocaleString('es-AR', {
              minimumFractionDigits: 2,
            })}`}
            color="success"
            icon="↓"
          />
          <KPICard
            label="Gastos"
            value={`$ ${(periodoActual.gastos_mes_calculado || 0).toLocaleString('es-AR', {
              minimumFractionDigits: 2,
            })}`}
            color="danger"
            icon="↑"
          />
          <KPICard
            label="Ahorro"
            value={`$ ${(periodoActual.ahorro_mes_calculado || 0).toLocaleString('es-AR', {
              minimumFractionDigits: 2,
            })}`}
            subValue={
              periodoActual.ingresos_mes_calculado
                ? `${Math.round(
                    ((periodoActual.ahorro_mes_calculado || 0) /
                      periodoActual.ingresos_mes_calculado) *
                      100
                  )}% de ingresos`
                : ''
            }
            color="primary"
            icon="₿"
          />
        </div>

        {/* Tabla de movimientos */}
        <div className="movimientos-section">
          <h2>Movimientos</h2>
          <MovimientosTable
            movimientos={movimientos}
            loading={movimientosLoading}
            readonly={periodoActual.estado === 'cerrado'}
          />
        </div>

        {/* Botones de acción */}
        <div className="acciones">
          {periodoActual.estado === 'abierto' && (
            <button onClick={handleCerrarPeriodo} disabled={cerrando} className="btn btn-primary">
              {cerrando ? 'Cerrando...' : '✓ Cerrar Período'}
            </button>
          )}
          {periodoActual.estado === 'cerrado' && (
            <button onClick={handleReabrirPeriodo} disabled={cerrando} className="btn btn-warning">
              {cerrando ? 'Reabriendo...' : '↻ Reabrir Período'}
            </button>
          )}
        </div>

        <div className="periodo-estado">
          Estado: <strong>{periodoActual.estado === 'cerrado' ? 'Cerrado ✓' : 'Abierto'}</strong>
        </div>
      </div>
    </div>
  )
}
