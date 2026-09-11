import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import LoginPage from './pages/LoginPage'
import MesCursoPage from './pages/MesCursoPage'
import DashboardPage from './pages/DashboardPage'
import CuentasPage from './pages/CuentasPage'
import './App.css'

function App() {
  const { isAuthenticated, loading, checkAuth } = useAuthStore()

  // Verificar autenticación al montar
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (loading) {
    return <div className="loading">Cargando...</div>
  }

  return (
    <Router>
      <Routes>
        {isAuthenticated ? (
          <>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/mes-en-curso" element={<MesCursoPage />} />
            <Route path="/cuentas" element={<CuentasPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </>
        ) : (
          <>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </>
        )}
      </Routes>
    </Router>
  )
}

export default App
