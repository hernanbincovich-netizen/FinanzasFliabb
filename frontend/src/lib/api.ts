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
    const response = (await this.request<any>('/auth/register', 'POST', { email, password })) as any;
    if (response?.session?.access_token) {
      this.setToken(response.session.access_token);
    }
    return response;
  }

  async login(email: string, password: string): Promise<any> {
    const response = (await this.request<any>('/auth/login', 'POST', { email, password })) as any;
    if (response?.session?.access_token) {
      this.setToken(response.session.access_token);
    }
    return response;
  }

  async refresh(refreshToken: string): Promise<any> {
    const response = (await this.request<any>('/auth/refresh', 'POST', { refresh_token: refreshToken })) as any;
    if (response?.access_token) {
      this.setToken(response.access_token);
    }
    return response;
  }

  // Periodos endpoints
  async getPeriodos() {
    return this.request<{ data: any[] }>('/periodos', 'GET');
  }

  async getPeriodo(id: number) {
    return this.request<{ periodo: any }>(`/periodos/${id}`, 'GET');
  }

  async createPeriodo(anio: number, mes: number) {
    return this.request<{ periodo: any }>('/periodos', 'POST', { anio, mes });
  }

  async cerrarPeriodo(id: number) {
    return this.request<any>(`/periodos/${id}/cerrar`, 'POST');
  }

  async reabrirPeriodo(id: number) {
    return this.request<any>(`/periodos/${id}/reabrir`, 'POST');
  }

  // Movimientos endpoints
  async getMovimientos(periodoId: number) {
    return this.request<{ data: any[] }>(`/periodos/${periodoId}/movimientos`, 'GET');
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
    return this.request<{ movimiento: any }>(`/periodos/${periodoId}/movimientos`, 'POST', data);
  }

  async updateMovimiento(id: number, data: Partial<any>) {
    return this.request<{ movimiento: any }>(`/movimientos/${id}`, 'PATCH', data);
  }

  async toggleEstadoMovimiento(id: number) {
    return this.request<{ movimiento: any }>(`/movimientos/${id}/estado`, 'PATCH');
  }

  async deleteMovimiento(id: number, borrarConcepto?: boolean) {
    const path = `/movimientos/${id}${borrarConcepto ? '?borrar_concepto=true' : ''}`;
    return this.request<any>(path, 'DELETE');
  }

  // Conceptos endpoints
  async getConceptos(tipo?: string, recurrente?: boolean) {
    let path = '/conceptos';
    const params = new URLSearchParams();
    if (tipo) params.append('tipo', tipo);
    if (recurrente !== undefined) params.append('recurrente', String(recurrente));
    if (params.size > 0) path += `?${params.toString()}`;
    return this.request<{ data: any[] }>(path, 'GET');
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
    return this.request<{ concepto: any }>('/conceptos', 'POST', data);
  }

  async updateConcepto(id: number, data: Partial<any>) {
    return this.request<{ concepto: any }>(`/conceptos/${id}`, 'PATCH', data);
  }

  async deleteConcepto(id: number) {
    return this.request<any>(`/conceptos/${id}`, 'DELETE');
  }
}

export const apiClient = new ApiClient();
