import { create } from 'zustand'
import { apiClient } from '../lib/api'

interface User {
  id: string
  email: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ error: null, loading: true })

      const response = (await apiClient.login(email, password)) as any

      if (response?.user) {
        set({
          user: {
            id: response.user.id,
            email: response.user.email,
          },
          isAuthenticated: true,
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error en login'
      set({ error: message, isAuthenticated: false })
      throw err
    } finally {
      set({ loading: false })
    }
  },

  register: async (email: string, password: string) => {
    try {
      set({ error: null, loading: true })

      const response = (await apiClient.register(email, password)) as any

      if (response?.user) {
        set({
          user: {
            id: response.user.id,
            email: response.user.email,
          },
          isAuthenticated: true,
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error en registro'
      set({ error: message, isAuthenticated: false })
      throw err
    } finally {
      set({ loading: false })
    }
  },

  logout: () => {
    apiClient.setToken(null)
    set({ user: null, isAuthenticated: false, error: null })
  },

  checkAuth: () => {
    // Verificar si hay token guardado
    const token = apiClient.getToken()
    if (token) {
      // Para una verificación completa, hacer request a un endpoint protegido
      // Por ahora, asumir que si hay token, está autenticado
      set({ isAuthenticated: true })
    } else {
      set({ isAuthenticated: false })
    }
    set({ loading: false })
  },
}))
