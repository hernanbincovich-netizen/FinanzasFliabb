import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import './LoginPage.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, error } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRegister, setIsRegister] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Finanzas del Hogar</h1>
        <p className="subtitle">Administra tus finanzas familiares</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Cargando...' : isRegister ? 'Registrarse' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="toggle-auth">
          {isRegister ? 'Ya tienes cuenta?' : 'No tienes cuenta?'}{' '}
          <button
            type="button"
            className="link-button"
            onClick={() => setIsRegister(!isRegister)}
          >
            {isRegister ? 'Iniciar sesión' : 'Registrarse'}
          </button>
        </p>
      </div>
    </div>
  )
}
