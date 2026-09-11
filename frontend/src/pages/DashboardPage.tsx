import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useDataStore } from '../stores/dataStore'
import './DashboardPage.css'

export default function DashboardPage() {
  const { user, logout } = useAuthStore()
  const { periodos } = useDataStore()
  const [totalIngresos, setTotalIngresos] = useState(0)
  const [totalGastos, setTotalGastos] = useState(0)
  const [totalAhorro, setTotalAhorro] = useState(0)

  useEffect(() => {
    // Calcular totales de todos los períodos
    if (periodos && periodos.length > 0) {
      const ingresos = periodos.reduce((sum, p) => sum + (p.ingresos_mes_calculado || 0), 0)
      const gastos = periodos.reduce((sum, p) => sum + (p.gastos_mes_calculado || 0), 0)
      const ahorro = periodos.reduce((sum, p) => sum + (p.ahorro_mes_calculado || 0), 0)

      setTotalIngresos(ingresos)
      setTotalGastos(gastos)
      setTotalAhorro(ahorro)
    }
  }, [periodos])

  return (
    <div className="app-container">
      <div className="topbar">
        <h1>Dashboard</h1>
        <div className="user-menu">
          <span>{user?.email}</span>
          <button onClick={logout} className="logout-btn">
            Salir
          </button>
        </div>
      </div>

      <div className="content">
        <div className="dashboard-grid">
          {/* Resumen general */}
          <section className="dashboard-section">
            <h2>Resumen General</h2>
            <div className="summary-cards">
              <div className="summary-card income">
                <div className="card-label">Ingresos Totales</div>
                <div className="card-value">
                  ${totalIngresos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="summary-card expense">
                <div className="card-label">Gastos Totales</div>
                <div className="card-value">
                  ${totalGastos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="summary-card savings">
                <div className="card-label">Ahorro Total</div>
                <div className="card-value">
                  ${totalAhorro.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </section>

          {/* Períodos recientes */}
          <section className="dashboard-section">
            <h2>Últimos 6 Meses</h2>
            <div className="periods-list">
              {periodos && periodos.length > 0 ? (
                periodos.slice(0, 6).map((p) => (
                  <div key={p.id} className="period-item">
                    <div className="period-name">
                      {new Date(p.anio, p.mes - 1).toLocaleDateString('es-AR', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="period-stats">
                      <span className="stat income">
                        ↓ ${(p.ingresos_mes_calculado || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                      </span>
                      <span className="stat expense">
                        ↑ ${(p.gastos_mes_calculado || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                      </span>
                      <span className="stat savings">
                        ✓ ${(p.ahorro_mes_calculado || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="period-status">{p.estado === 'cerrado' ? '✓ Cerrado' : 'Abierto'}</div>
                  </div>
                ))
              ) : (
                <div className="empty-state">No hay períodos disponibles</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
