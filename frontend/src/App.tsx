import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import LoginPage from './pages/LoginPage'
import MesCursoPage from './pages/MesCursoPage'
import './App.css'

function App() {
  const { isAuthenticated, loading } = useAuthStore()

  if (loading) {
    return <div className="loading">Cargando...</div>
  }

  return (
    <Router>
      <Routes>
        {isAuthenticated ? (
          <>
            <Route path="/mes-en-curso" element={<MesCursoPage />} />
            <Route path="/" element={<Navigate to="/mes-en-curso" replace />} />
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
