import './KPICard.css'

interface KPICardProps {
  label: string
  value: number | string
  subValue?: string
  color?: 'primary' | 'success' | 'danger' | 'warning'
  icon?: string
}

export default function KPICard({
  label,
  value,
  subValue,
  color = 'primary',
  icon,
}: KPICardProps) {
  return (
    <div className={`kpi-card kpi-${color}`}>
      {icon && <div className="kpi-icon">{icon}</div>}
      <div className="kpi-content">
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
        {subValue && <div className="kpi-sub">{subValue}</div>}
      </div>
    </div>
  )
}
