import './BadgeEstado.css'

interface BadgeEstadoProps {
  estado: 'pendiente' | 'pagado'
  onClick?: () => void
  clickable?: boolean
}

export default function BadgeEstado({ estado, onClick, clickable = false }: BadgeEstadoProps) {
  const label = estado === 'pagado' ? '✓ Pagado' : '⏱ Pendiente'

  return (
    <span
      className={`badge-estado badge-${estado} ${clickable ? 'clickable' : ''}`}
      onClick={clickable ? onClick : undefined}
      title={clickable ? 'Click para cambiar' : ''}
    >
      {label}
    </span>
  )
}
