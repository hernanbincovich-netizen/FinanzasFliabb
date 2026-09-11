import { create } from 'zustand'
import { supabaseClient } from '../lib/supabase'

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
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ error: null, loading: true })

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        set({
          user: {
            id: data.user.id,
            email: data.user.email || '',
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

      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        set({
          user: {
            id: data.user.id,
            email: data.user.email || '',
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

  logout: async () => {
    try {
      set({ error: null, loading: true })
      await supabaseClient.auth.signOut()
      set({ user: null, isAuthenticated: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error en logout'
      set({ error: message })
      throw err
    } finally {
      set({ loading: false })
    }
  },

  checkAuth: async () => {
    try {
      set({ loading: true })

      const { data, error } = await supabaseClient.auth.getSession()

      if (error) throw error

      if (data.session?.user) {
        set({
          user: {
            id: data.session.user.id,
            email: data.session.user.email || '',
          },
          isAuthenticated: true,
        })
      } else {
        set({ user: null, isAuthenticated: false })
      }
    } catch (err) {
      console.error('Auth check error:', err)
      set({ user: null, isAuthenticated: false })
    } finally {
      set({ loading: false })
    }
  },
}))
