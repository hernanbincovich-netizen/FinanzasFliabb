/* Cliente HTTP para la API REST (reemplaza sql.js local) */

(function (App) {
  const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://finanzas-api-XXX.vercel.app'; // Cambiar XXX por el proyecto real

  let token = null;

  const api = {
    // ============ AUTH ============
    async login(email, password) {
      try {
        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        if (!res.ok) throw new Error('Login failed');
        const data = await res.json();
        token = data.token;
        localStorage.setItem('token', token);
        return data;
      } catch (err) {
        console.error('Login error:', err);
        throw err;
      }
    },

    logout() {
      token = null;
      localStorage.removeItem('token');
    },

    isLoggedIn() {
      if (!token) token = localStorage.getItem('token');
      return !!token;
    },

    // ============ PERIODOS ============
    async getPeriodos() {
      try {
        const res = await this._fetch('/api/periodos');
        return res.json();
      } catch (err) {
        console.error('Error fetching periodos:', err);
        return [];
      }
    },

    async getPeriodo(id) {
      try {
        const res = await this._fetch(`/api/periodos/${id}`);
        return res.json();
      } catch (err) {
        console.error('Error fetching periodo:', err);
        return null;
      }
    },

    async createPeriodo(anio, mes, estado = 'abierto') {
      try {
        const res = await this._fetch('/api/periodos', {
          method: 'POST',
          body: JSON.stringify({ anio, mes, estado })
        });
        return res.json();
      } catch (err) {
        console.error('Error creating periodo:', err);
        throw err;
      }
    },

    // ============ CONCEPTOS ============
    async getConceptos() {
      try {
        const res = await this._fetch('/api/conceptos');
        return res.json();
      } catch (err) {
        console.error('Error fetching conceptos:', err);
        return [];
      }
    },

    async createConcepto(data) {
      try {
        const res = await this._fetch('/api/conceptos', {
          method: 'POST',
          body: JSON.stringify(data)
        });
        return res.json();
      } catch (err) {
        console.error('Error creating concepto:', err);
        throw err;
      }
    },

    // ============ MOVIMIENTOS ============
    async getMovimientos(periodoId) {
      try {
        const res = await this._fetch(`/api/movimientos/${periodoId}`);
        return res.json();
      } catch (err) {
        console.error('Error fetching movimientos:', err);
        return [];
      }
    },

    async createMovimiento(data) {
      try {
        const res = await this._fetch('/api/movimientos', {
          method: 'POST',
          body: JSON.stringify(data)
        });
        return res.json();
      } catch (err) {
        console.error('Error creating movimiento:', err);
        throw err;
      }
    },

    async updateMovimiento(id, data) {
      try {
        const res = await this._fetch(`/api/movimientos/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data)
        });
        return res.json();
      } catch (err) {
        console.error('Error updating movimiento:', err);
        throw err;
      }
    },

    // ============ CATEGORIAS ============
    async getCategorias() {
      try {
        const res = await this._fetch('/api/categorias');
        return res.json();
      } catch (err) {
        console.error('Error fetching categorias:', err);
        return [];
      }
    },

    // ============ CUENTAS ============
    async getCuentas() {
      try {
        const res = await this._fetch('/api/cuentas');
        return res.json();
      } catch (err) {
        console.error('Error fetching cuentas:', err);
        return [];
      }
    },

    // ============ SALDOS ============
    async getSaldo(cuentaId) {
      try {
        const res = await this._fetch(`/api/saldos/${cuentaId}`);
        return res.json();
      } catch (err) {
        console.error('Error fetching saldo:', err);
        return { saldo: 0 };
      }
    },

    async createSaldo(cuentaId, saldo, fecha, nota) {
      try {
        const res = await this._fetch('/api/saldos', {
          method: 'POST',
          body: JSON.stringify({ cuenta_id: cuentaId, saldo, fecha, nota })
        });
        return res.json();
      } catch (err) {
        console.error('Error creating saldo:', err);
        throw err;
      }
    },

    // ============ METAS ============
    async getMetas() {
      try {
        const res = await this._fetch('/api/metas');
        return res.json();
      } catch (err) {
        console.error('Error fetching metas:', err);
        return [];
      }
    },

    async createMeta(data) {
      try {
        const res = await this._fetch('/api/metas', {
          method: 'POST',
          body: JSON.stringify(data)
        });
        return res.json();
      } catch (err) {
        console.error('Error creating meta:', err);
        throw err;
      }
    },

    async updateMeta(id, data) {
      try {
        const res = await this._fetch(`/api/metas/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data)
        });
        return res.json();
      } catch (err) {
        console.error('Error updating meta:', err);
        throw err;
      }
    },

    async deleteMeta(id) {
      try {
        const res = await this._fetch(`/api/metas/${id}`, {
          method: 'DELETE'
        });
        return res.json();
      } catch (err) {
        console.error('Error deleting meta:', err);
        throw err;
      }
    },

    // ============ COTIZACIONES ============
    async getCotizaciones() {
      try {
        const res = await this._fetch('/api/cotizaciones');
        return res.json();
      } catch (err) {
        console.error('Error fetching cotizaciones:', err);
        return [];
      }
    },

    async getCotizacion(par) {
      try {
        const res = await this._fetch(`/api/cotizaciones/${par}`);
        return res.json();
      } catch (err) {
        console.error('Error fetching cotizacion:', err);
        return null;
      }
    },

    async setCotizacion(par, valor, fecha) {
      try {
        const res = await this._fetch('/api/cotizaciones', {
          method: 'POST',
          body: JSON.stringify({ par, valor, fecha })
        });
        return res.json();
      } catch (err) {
        console.error('Error setting cotizacion:', err);
        throw err;
      }
    },

    // ============ INTEGRANTES ============
    async getIntegrantes() {
      try {
        const res = await this._fetch('/api/integrantes');
        return res.json();
      } catch (err) {
        console.error('Error fetching integrantes:', err);
        return [];
      }
    },

    async createIntegrante(nombre) {
      try {
        const res = await this._fetch('/api/integrantes', {
          method: 'POST',
          body: JSON.stringify({ nombre })
        });
        return res.json();
      } catch (err) {
        console.error('Error creating integrante:', err);
        throw err;
      }
    },

    // ============ SETTINGS ============
    async getSetting(clave) {
      try {
        const res = await this._fetch(`/api/settings/${clave}`);
        return res.json();
      } catch (err) {
        console.error('Error fetching setting:', err);
        return { clave, valor: null };
      }
    },

    async setSetting(clave, valor) {
      try {
        const res = await this._fetch('/api/settings', {
          method: 'POST',
          body: JSON.stringify({ clave, valor })
        });
        return res.json();
      } catch (err) {
        console.error('Error setting:', err);
        throw err;
      }
    },

    // ============ PRESUPUESTO EFECTIVO ============
    async getPresupuestoEfectivo(periodoId) {
      try {
        const res = await this._fetch(`/api/presupuesto-efectivo/${periodoId}`);
        return res.json();
      } catch (err) {
        console.error('Error fetching presupuesto efectivo:', err);
        return [];
      }
    },

    async createPresupuestoEfectivo(periodoId, cuentaId, montoPresupuestado) {
      try {
        const res = await this._fetch('/api/presupuesto-efectivo', {
          method: 'POST',
          body: JSON.stringify({ periodo_id: periodoId, cuenta_id: cuentaId, monto_presupuestado: montoPresupuestado })
        });
        return res.json();
      } catch (err) {
        console.error('Error creating presupuesto efectivo:', err);
        throw err;
      }
    },

    // ============ META APORTES ============
    async getMetaAportes(metaId) {
      try {
        const res = await this._fetch(`/api/metas/${metaId}/aportes`);
        return res.json();
      } catch (err) {
        console.error('Error fetching meta aportes:', err);
        return [];
      }
    },

    async createMetaAporte(metaId, monto, fecha, nota) {
      try {
        const res = await this._fetch(`/api/metas/${metaId}/aportes`, {
          method: 'POST',
          body: JSON.stringify({ monto, fecha, nota })
        });
        return res.json();
      } catch (err) {
        console.error('Error creating meta aporte:', err);
        throw err;
      }
    },

    // ============ CALCULOS ============
    async getIngresos(periodoId) {
      try {
        const res = await this._fetch(`/api/calculos/ingresos/${periodoId}`);
        return res.json();
      } catch (err) {
        console.error('Error fetching ingresos:', err);
        return { ingresos: 0 };
      }
    },

    async getGastos(periodoId) {
      try {
        const res = await this._fetch(`/api/calculos/gastos/${periodoId}`);
        return res.json();
      } catch (err) {
        console.error('Error fetching gastos:', err);
        return { gastos: 0 };
      }
    },

    async getGastosPorCategoria(periodoId) {
      try {
        const res = await this._fetch(`/api/calculos/gastos-por-categoria/${periodoId}`);
        return res.json();
      } catch (err) {
        console.error('Error fetching gastos por categoria:', err);
        return [];
      }
    },

    // ============ HELPER ============
    async _fetch(path, options = {}) {
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers
      });

      if (res.status === 401) {
        this.logout();
        window.location.href = '/index.html'; // Redirect a login
        throw new Error('Unauthorized');
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      return res;
    }
  };

  App.api = api;
})(window.App = window.App || {});
