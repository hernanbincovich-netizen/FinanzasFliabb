import { create } from 'zustand'
import { apiClient } from '../lib/api'

export interface Periodo {
  id: number
  anio: number
  mes: number
  estado: 'abierto' | 'cerrado'
  ingresos_mes_calculado?: number
  gastos_mes_calculado?: number
  ahorro_mes_calculado?: number
}

export interface Movimiento {
  id: number
  periodo_id: number
  concepto_id: number
  monto: number
  moneda: string
  estado: 'pendiente' | 'pagado'
  cuenta_id?: number
  fecha_vencimiento?: string
  nota?: string
  conceptos?: { nombre: string; tipo: string; categorias?: any }
  cuentas?: { nombre: string }
}

interface DataState {
  // Períodos
  periodos: Periodo[]
  periodosLoading: boolean
  periodoActual: Periodo | null

  // Movimientos
  movimientos: Movimiento[]
  movimientosLoading: boolean

  // Acciones
  fetchPeriodos: () => Promise<void>
  fetchPeriodo: (id: number) => Promise<Periodo | null>
  fetchMovimientos: (periodoId: number) => Promise<void>
  setPeriodoActual: (periodo: Periodo | null) => void

  // Utils
  getPeriodoActualId: () => number | null
  getMovimientosActuales: () => Movimiento[]
}

export const useDataStore = create<DataState>((set, get) => ({
  // Estado inicial
  periodos: [],
  periodosLoading: false,
  periodoActual: null,
  movimientos: [],
  movimientosLoading: false,

  // Fetch periodos
  fetchPeriodos: async () => {
    try {
      set({ periodosLoading: true })
      const response = await apiClient.getPeriodos()
      set({ periodos: response.data || [] })

      // Si no hay período actual, establecer el primero
      const current = get().periodoActual
      if (!current && response.data && response.data.length > 0) {
        set({ periodoActual: response.data[0] })
      }
    } catch (err) {
      console.error('Error fetching periodos:', err)
    } finally {
      set({ periodosLoading: false })
    }
  },

  // Fetch un período específico
  fetchPeriodo: async (id: number) => {
    try {
      const response = await apiClient.getPeriodo(id)
      const periodo = response.periodo
      set({ periodoActual: periodo })
      return periodo
    } catch (err) {
      console.error('Error fetching periodo:', err)
      return null
    }
  },

  // Fetch movimientos del período actual
  fetchMovimientos: async (periodoId: number) => {
    try {
      set({ movimientosLoading: true })
      const response = await apiClient.getMovimientos(periodoId)
      set({ movimientos: response.data || [] })
    } catch (err) {
      console.error('Error fetching movimientos:', err)
    } finally {
      set({ movimientosLoading: false })
    }
  },

  // Establecer período actual y cargar sus movimientos
  setPeriodoActual: (periodo: Periodo | null) => {
    set({ periodoActual: periodo })
    if (periodo) {
      get().fetchMovimientos(periodo.id)
    } else {
      set({ movimientos: [] })
    }
  },

  // Getters
  getPeriodoActualId: () => {
    return get().periodoActual?.id || null
  },

  getMovimientosActuales: () => {
    return get().movimientos
  },
}))
