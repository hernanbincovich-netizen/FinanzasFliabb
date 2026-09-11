import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import './MesCursoPage.css'

export default function MesCursoPage() {
  const { user, logout } = useAuthStore()

  useEffect(() => {
    // Aquí se cargarán los datos del período actual
    console.log('MesCursoPage mounted')
  }, [])

  return (
    <div className="app-container">
      <div className="topbar">
        <h1>Mes en Curso</h1>
        <div className="user-menu">
          <span>{user?.email}</span>
          <button onClick={logout} className="logout-btn">Salir</button>
        </div>
      </div>

      <div className="content">
        <div className="placeholder">
          <h2>Mes en Curso — Pantalla MVP</h2>
          <p>Esta pantalla mostrará:</p>
          <ul>
            <li>Selector de período (mes/año)</li>
            <li>KPIs: ingresos, gastos, ahorro</li>
            <li>Tabla de movimientos</li>
            <li>Botones: crear, editar, eliminar, cerrar mes</li>
          </ul>
          <p style={{ marginTop: '2rem', fontSize: '0.875rem', color: '#6b7280' }}>
            Próximos pasos: Sprint 1 (backend), Sprint 2 (frontend detail)
          </p>
        </div>
      </div>
    </div>
  )
}
