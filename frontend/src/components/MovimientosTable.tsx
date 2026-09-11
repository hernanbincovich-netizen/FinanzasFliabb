import BadgeEstado from './BadgeEstado'
import './MovimientosTable.css'

export interface MovimientoRow {
  id: number
  concepto_id: number
  monto: number
  moneda: string
  estado: 'pendiente' | 'pagado'
  fecha_vencimiento?: string
  nota?: string
  conceptos?: {
    nombre: string
    tipo: string
    categorias?: { nombre: string; color?: string }
  }
  cuentas?: { nombre: string }
}

interface MovimientosTableProps {
  movimientos: MovimientoRow[]
  loading?: boolean
  onToggleEstado?: (id: number) => void
  onEdit?: (id: number) => void
  onDelete?: (id: number) => void
  readonly?: boolean
}

function formatMonto(monto: number, moneda: string): string {
  const symbol = moneda === 'USD' ? 'US$' : moneda === 'BTC' ? '₿' : '$'
  return `${symbol} ${monto.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatFecha(isoDate: string | undefined): string {
  if (!isoDate) return '-'
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

export default function MovimientosTable({
  movimientos,
  loading = false,
  onToggleEstado,
  onEdit,
  onDelete,
  readonly = false,
}: MovimientosTableProps) {
  if (loading) {
    return <div className="movimientos-table-loading">Cargando movimientos...</div>
  }

  if (movimientos.length === 0) {
    return <div className="movimientos-table-empty">No hay movimientos en este período</div>
  }

  return (
    <div className="movimientos-table-container">
      <table className="movimientos-table">
        <thead>
          <tr>
            <th>Concepto</th>
            <th>Categoría</th>
            <th>Monto</th>
            <th>Estado</th>
            <th>Vencimiento</th>
            {!readonly && <th>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {movimientos.map((mov) => (
            <tr key={mov.id}>
              <td className="concepto-cell">
                <div className="concepto-name">{mov.conceptos?.nombre || 'Sin concepto'}</div>
                {mov.nota && <div className="concepto-nota">{mov.nota}</div>}
              </td>
              <td>
                {mov.conceptos?.categorias?.nombre && (
                  <span
                    className="categoria-badge"
                    style={{
                      backgroundColor: mov.conceptos.categorias.color || '#e5e7eb',
                    }}
                  >
                    {mov.conceptos.categorias.nombre}
                  </span>
                )}
              </td>
              <td className="monto-cell">{formatMonto(mov.monto, mov.moneda)}</td>
              <td>
                <BadgeEstado
                  estado={mov.estado}
                  clickable={!readonly && !!onToggleEstado}
                  onClick={() => onToggleEstado?.(mov.id)}
                />
              </td>
              <td className="fecha-cell">{formatFecha(mov.fecha_vencimiento)}</td>
              {!readonly && (
                <td className="actions-cell">
                  <button className="btn-sm btn-edit" onClick={() => onEdit?.(mov.id)}>
                    ✎
                  </button>
                  <button className="btn-sm btn-delete" onClick={() => onDelete?.(mov.id)}>
                    ✕
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
