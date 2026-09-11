/* Consultas (App.q): funciones que traen datos del servidor y los cachean localmente */
(function (App) {
  const api = App.api;

  // Estado cachéado
  let cache = {
    periodos: [],
    conceptos: [],
    categorias: [],
    integrantes: [],
    cuentas: [],
    movimientos: {}, // por periodoId
    metas: [],
    cotizaciones: [],
    settings: {} // por clave
  };

  const q = {
    // ============ SETTINGS ============
    async setting(clave, def = null) {
      if (!cache.settings[clave]) {
        const data = await api.getSetting(clave);
        cache.settings[clave] = data.valor;
      }
      return cache.settings[clave] !== null ? cache.settings[clave] : def;
    },

    async setSetting(clave, valor) {
      await api.setSetting(clave, valor);
      cache.settings[clave] = valor;
    },

    // ============ PERIODOS ============
    async periodos() {
      if (cache.periodos.length === 0) {
        cache.periodos = await api.getPeriodos();
      }
      return cache.periodos;
    },

    async periodo(id) {
      const periodos = await q.periodos();
      return periodos.find(p => p.id === id) || null;
    },

    async periodoByYM(anio, mes) {
      const periodos = await q.periodos();
      return periodos.find(p => p.anio === anio && p.mes === mes) || null;
    },

    async periodoActual() {
      const id = await q.setting('periodo_actual_id');
      if (id) {
        const p = await q.periodo(id);
        if (p) return p;
      }
      // Buscar el período abierto más reciente
      const periodos = await q.periodos();
      let p = periodos.find(x => x.estado === 'abierto');
      if (!p) p = periodos[0]; // El más reciente
      return p || null;
    },

    // ============ INTEGRANTES ============
    async integrantes() {
      if (cache.integrantes.length === 0) {
        cache.integrantes = await api.getIntegrantes();
      }
      return cache.integrantes;
    },

    async integranteNombre(id) {
      if (!id) return 'Compartido';
      const integrantes = await q.integrantes();
      const i = integrantes.find(x => x.id === id);
      return i ? i.nombre : 'Compartido';
    },

    // ============ CATEGORIAS ============
    async categorias() {
      if (cache.categorias.length === 0) {
        cache.categorias = await api.getCategorias();
      }
      return cache.categorias;
    },

    // ============ CUENTAS ============
    async cuentas(soloActivas = true) {
      if (cache.cuentas.length === 0) {
        cache.cuentas = await api.getCuentas();
      }
      return soloActivas ? cache.cuentas.filter(c => c.activa) : cache.cuentas;
    },

    async cuenta(id) {
      const cuentas = await q.cuentas(false);
      return cuentas.find(c => c.id === id) || null;
    },

    // ============ CONCEPTOS ============
    async conceptos(soloActivos = true) {
      if (cache.conceptos.length === 0) {
        cache.conceptos = await api.getConceptos();
      }
      return soloActivos ? cache.conceptos.filter(c => c.activo) : cache.conceptos;
    },

    // ============ MOVIMIENTOS ============
    async movimientos(periodoId) {
      if (!cache.movimientos[periodoId]) {
        cache.movimientos[periodoId] = await api.getMovimientos(periodoId);
      }
      return cache.movimientos[periodoId];
    },

    // ============ METAS ============
    async metas() {
      if (cache.metas.length === 0) {
        cache.metas = await api.getMetas();
      }
      return cache.metas;
    },

    async metaAportes(metaId) {
      return await api.getMetaAportes(metaId);
    },

    // ============ COTIZACIONES ============
    async cotizacionVigente(par) {
      const cotizaciones = await q.cotizaciones();
      const vigente = cotizaciones.find(c => c.par === par);
      return vigente || { par, valor: 0 };
    },

    async cotizaciones() {
      if (cache.cotizaciones.length === 0) {
        cache.cotizaciones = await api.getCotizaciones();
      }
      return cache.cotizaciones;
    },

    // ============ PRESUPUESTO EFECTIVO ============
    async presupuestoEfectivo(periodoId) {
      return await api.getPresupuestoEfectivo(periodoId);
    },

    // ============ SALDOS ============
    async saldoActual(cuentaId) {
      const saldo = await api.getSaldo(cuentaId);
      return saldo ? saldo.saldo : 0;
    },

    // ============ REFRESCAR CACHE ============
    invalidateCache() {
      cache = {
        periodos: [],
        conceptos: [],
        categorias: [],
        integrantes: [],
        cuentas: [],
        movimientos: {},
        metas: [],
        cotizaciones: [],
        settings: {}
      };
    },

    invalidatePeriodoMovimientos(periodoId) {
      if (cache.movimientos[periodoId]) {
        delete cache.movimientos[periodoId];
      }
    }
  };

  App.q = q;
})(window.App = window.App || {});
