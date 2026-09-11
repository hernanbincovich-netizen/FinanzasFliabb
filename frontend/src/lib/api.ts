/**
 * Cliente API para comunicación con backend
 * Maneja autenticación, reintentos, errores
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    return this.token || localStorage.getItem('auth_token');
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = this.getToken();
    const url = `${API_URL}${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = (await response.json()) as any;

    if (!response.ok) {
      const error = data?.error || data?.message || 'Error desconocido';
      throw new Error(error);
    }

    return data;
  }

  // Auth endpoints
  async register(email: string, password: string): Promise<any> {
    const response = (await this.request<any>('POST', '/auth/register', { email, password })) as any;
    if (response?.session?.access_token) {
      this.setToken(response.session.access_token);
    }
    return response;
  }

  async login(email: string, password: string): Promise<any> {
    const response = (await this.request<any>('POST', '/auth/login', { email, password })) as any;
    if (response?.session?.access_token) {
      this.setToken(response.session.access_token);
    }
    return response;
  }

  async refresh(refreshToken: string): Promise<any> {
    const response = (await this.request<any>('POST', '/auth/refresh', { refresh_token: refreshToken })) as any;
    if (response?.access_token) {
      this.setToken(response.access_token);
    }
    return response;
  }

  // Periodos endpoints
  async getPeriodos() {
    return this.request<{ data: any[] }>('GET', '/periodos');
  }

  async getPeriodo(id: number) {
    return this.request<{ periodo: any }>('GET', `/periodos/${id}`);
  }

  async createPeriodo(anio: number, mes: number) {
    return this.request<{ periodo: any }>('POST', '/periodos', { anio, mes });
  }

  async cerrarPeriodo(id: number) {
    return this.request<any>('POST', `/periodos/${id}/cerrar`);
  }

  async reabrirPeriodo(id: number) {
    return this.request<any>('POST', `/periodos/${id}/reabrir`);
  }

  // Movimientos endpoints
  async getMovimientos(periodoId: number) {
    return this.request<{ data: any[] }>('GET', `/movimientos/${periodoId}`);
  }

  async createMovimiento(periodoId: number, data: {
    concepto_id: number;
    monto: number;
    moneda: string;
    cuenta_id?: number;
    estado?: string;
    fecha_vencimiento?: string;
    nota?: string;
  }) {
    return this.request<{ movimiento: any }>('POST', `/movimientos/${periodoId}`, data);
  }

  async updateMovimiento(id: number, data: Partial<any>) {
    return this.request<{ movimiento: any }>('PATCH', `/movimientos/${id}`, data);
  }

  async toggleEstadoMovimiento(id: number) {
    return this.request<{ movimiento: any }>('PATCH', `/movimientos/${id}/estado`);
  }

  async deleteMovimiento(id: number, borrarConcepto?: boolean) {
    const path = `/movimientos/${id}${borrarConcepto ? '?borrar_concepto=true' : ''}`;
    return this.request<any>('DELETE', path);
  }

  // Conceptos endpoints
  async getConceptos(tipo?: string, recurrente?: boolean) {
    let path = '/conceptos';
    const params = new URLSearchParams();
    if (tipo) params.append('tipo', tipo);
    if (recurrente !== undefined) params.append('recurrente', String(recurrente));
    if (params.size > 0) path += `?${params.toString()}`;
    return this.request<{ data: any[] }>('GET', path);
  }

  async createConcepto(data: {
    nombre: string;
    tipo: 'ingreso' | 'gasto';
    categoria_id?: number;
    cuenta_id?: number;
    integrante_id?: number;
    moneda?: string;
    es_recurrente?: boolean;
    monto_referencia?: number;
  }) {
    return this.request<{ concepto: any }>('POST', '/conceptos', data);
  }

  async updateConcepto(id: number, data: Partial<any>) {
    return this.request<{ concepto: any }>('PATCH', `/conceptos/${id}`, data);
  }

  async deleteConcepto(id: number) {
    return this.request<any>('DELETE', `/conceptos/${id}`);
  }

  // Cuentas endpoints
  async getCuentas() {
    return this.request<{ data: any[] }>('GET', '/cuentas');
  }

  async getCuenta(id: number) {
    return this.request<{ cuenta: any }>('GET', `/cuentas/${id}`);
  }

  async createCuenta(data: {
    nombre: string;
    tipo?: string;
    moneda?: string;
    saldo_inicial?: number;
  }) {
    return this.request<{ cuenta: any }>('POST', '/cuentas', data);
  }

  async updateCuenta(id: number, data: Partial<any>) {
    return this.request<{ cuenta: any }>('PATCH', `/cuentas/${id}`, data);
  }

  async deleteCuenta(id: number) {
    return this.request<any>('DELETE', `/cuentas/${id}`);
  }

  // Presupuestos endpoints
  async getPresupuestosPeriodo(periodoId: number) {
    return this.request<{ data: any[] }>('GET', `/presupuestos/periodo/${periodoId}`);
  }

  async getPresupuesto(id: number) {
    return this.request<{ presupuesto: any }>('GET', `/presupuestos/${id}`);
  }

  async createPresupuesto(data: {
    periodo_id: number;
    concepto_id: number;
    monto_presupuestado: number;
  }) {
    return this.request<{ presupuesto: any }>('POST', '/presupuestos', data);
  }

  async updatePresupuesto(id: number, data: Partial<any>) {
    return this.request<{ presupuesto: any }>('PATCH', `/presupuestos/${id}`, data);
  }

  async deletePresupuesto(id: number) {
    return this.request<any>('DELETE', `/presupuestos/${id}`);
  }

  // Metas endpoints
  async getMetas() {
    return this.request<{ data: any[] }>('GET', '/metas');
  }

  async getMeta(id: number) {
    return this.request<{ meta: any }>('GET', `/metas/${id}`);
  }

  async createMeta(data: {
    nombre: string;
    descripcion?: string;
    monto_objetivo: number;
    fecha_objetivo?: string;
    monto_actual?: number;
  }) {
    return this.request<{ meta: any }>('POST', '/metas', data);
  }

  async updateMeta(id: number, data: Partial<any>) {
    return this.request<{ meta: any }>('PATCH', `/metas/${id}`, data);
  }

  async deleteMeta(id: number) {
    return this.request<any>('DELETE', `/metas/${id}`);
  }

  // Cotizaciones endpoints
  async getCotizaciones() {
    return this.request<{ data: any[] }>('GET', '/cotizaciones');
  }

  async getCotizacionesVigentes() {
    return this.request<{ data: any[] }>('GET', '/cotizaciones/vigentes/actuales');
  }

  async getCotizacion(id: number) {
    return this.request<{ cotizacion: any }>('GET', `/cotizaciones/${id}`);
  }

  async createCotizacion(data: {
    moneda_origen: string;
    moneda_destino: string;
    tasa_cambio: number;
    fecha_vigencia?: string;
    es_vigente?: boolean;
  }) {
    return this.request<{ cotizacion: any }>('POST', '/cotizaciones', data);
  }

  async updateCotizacion(id: number, data: Partial<any>) {
    return this.request<{ cotizacion: any }>('PATCH', `/cotizaciones/${id}`, data);
  }

  async deleteCotizacion(id: number) {
    return this.request<any>('DELETE', `/cotizaciones/${id}`);
  }
}

export const apiClient = new ApiClient();
