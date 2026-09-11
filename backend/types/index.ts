// Tipos compartidos de la base de datos y API

export interface Periodo {
  id: number;
  anio: number;
  mes: number;
  estado: 'abierto' | 'cerrado';
  fecha_cierre: string | null;
  ingresos_mes: number | null;
  gastos_mes: number | null;
  ahorro_mes: number | null;
  ahorro_acumulado: number | null;
  cotiz_usd_ars_cierre: number | null;
  cotiz_btc_usd_cierre: number | null;
  creado_en: string;
  actualizado_en: string;
}

export interface Movimiento {
  id: number;
  periodo_id: number;
  concepto_id: number;
  monto: number;
  moneda: 'ARS' | 'USD' | 'BTC';
  estado: 'pendiente' | 'pagado';
  cuenta_id: number | null;
  fecha_vencimiento: string | null;
  monto_ars: number | null;
  vino_de_recurrente: boolean;
  nota: string | null;
  creado_en: string;
  actualizado_en: string;
}

export interface Concepto {
  id: number;
  nombre: string;
  tipo: 'ingreso' | 'gasto';
  categoria_id: number | null;
  cuenta_id: number | null;
  integrante_id: number | null;
  moneda: 'ARS' | 'USD' | 'BTC';
  es_agrupado: boolean;
  es_recurrente: boolean;
  monto_referencia: number | null;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface Categoria {
  id: number;
  nombre: string;
  tipo: 'ingreso' | 'gasto' | 'ambos';
  color: string | null;
  orden: number;
  creado_en: string;
  actualizado_en: string;
}

export interface Cuenta {
  id: number;
  nombre: string;
  tipo: 'caja_ahorro' | 'cuenta_sueldo' | 'billetera_efectivo' | 'billetera_cripto' | 'inversion' | 'tarjeta_credito' | 'otro';
  titular_id: number | null;
  proposito: 'gastos_mes' | 'efectivo_mes' | 'ahorro_metas' | 'fondo_emergencia' | 'ahorro_largo_plazo' | 'otro';
  moneda: 'ARS' | 'USD' | 'BTC';
  activa: boolean;
  orden: number;
  creado_en: string;
  actualizado_en: string;
}

export interface SaldoCuenta {
  id: number;
  cuenta_id: number;
  periodo_id: number | null;
  fecha: string;
  saldo: number;
  nota: string | null;
  creado_en: string;
  actualizado_en: string;
}

export interface Cotizacion {
  id: number;
  par: 'USD_ARS' | 'BTC_USD';
  valor: number;
  fecha: string;
  periodo_id: number | null;
  creado_en: string;
  actualizado_en: string;
}

export interface Integrante {
  id: number;
  nombre: string;
  orden: number;
  creado_en: string;
  actualizado_en: string;
}

export interface Meta {
  id: number;
  nombre: string;
  moneda: 'ARS' | 'USD' | 'BTC';
  monto_objetivo: number;
  monto_inicial: number;
  fecha_inicio: string; // YYYY-MM
  fecha_objetivo: string; // YYYY-MM
  cuenta_id: number | null;
  estado: 'activa' | 'cumplida' | 'pausada' | 'cancelada';
  creado_en: string;
  actualizado_en: string;
}

export interface MetaAporte {
  id: number;
  meta_id: number;
  periodo_id: number | null;
  monto: number;
  moneda: 'ARS' | 'USD' | 'BTC';
  fecha: string;
  nota: string | null;
  creado_en: string;
  actualizado_en: string;
}

export interface Settings {
  clave: string;
  valor: string;
}

// Request/Response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

export interface PeriodoWithKPIs extends Periodo {
  ingresos_mes_calculado?: number;
  gastos_mes_calculado?: number;
  ahorro_mes_calculado?: number;
  ahorro_acumulado_calculado?: number;
}
