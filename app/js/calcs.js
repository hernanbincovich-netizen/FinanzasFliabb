/* Cálculos derivados (App.calc): funciones que usan App.q para derivar valores */
(function (App) {
  const q = App.q, api = App.api;

  const calc = {
    pctEfectivo() {
      return 0.05; // 5% por defecto
    },

    async usdArs() {
      const r = await q.cotizacionVigente('USD_ARS');
      return r ? r.valor : 0;
    },

    async btcUsd() {
      const r = await q.cotizacionVigente('BTC_USD');
      return r ? r.valor : 0;
    },

    async btcArs() {
      const btcUsd = await calc.btcUsd();
      const usdArs = await calc.usdArs();
      return btcUsd * usdArs;
    },

    async aArs(monto, moneda) {
      monto = Number(monto) || 0;
      if (moneda === 'USD') {
        const rate = await calc.usdArs();
        return monto * rate;
      }
      if (moneda === 'BTC') {
        const rate = await calc.btcArs();
        return monto * rate;
      }
      return monto;
    },

    async ingresos(periodoId) {
      const res = await api.getIngresos(periodoId);
      return res.ingresos || 0;
    },

    async gastos(periodoId) {
      const res = await api.getGastos(periodoId);
      return res.gastos || 0;
    },

    async ahorro(periodoId) {
      const ing = await calc.ingresos(periodoId);
      const gas = await calc.gastos(periodoId);
      return ing - gas;
    },

    async ahorroPeriodo(p) {
      if (p.estado === 'cerrado' && p.ahorro_mes != null) {
        return p.ahorro_mes;
      }
      return await calc.ahorro(p.id);
    },

    async ahorroAcumulado() {
      const periodos = await q.periodos();
      let total = 0;
      for (const p of periodos) {
        total += await calc.ahorroPeriodo(p);
      }
      return total;
    },

    async acumHasta(per) {
      const periodos = await q.periodos();
      let acc = 0;
      for (const x of periodos) {
        acc += await calc.ahorroPeriodo(x);
        if (x.anio === per.anio && x.mes === per.mes) break;
      }
      return acc;
    },

    async gastosPorCategoria(periodoId) {
      const gastos = await api.getGastosPorCategoria(periodoId);
      return gastos.map(g => ({
        nombre: g.nombre,
        total: g.total
      }));
    },

    async evolucion(meses = 12) {
      const periodos = await q.periodos();
      const hoy = new Date();
      const ev = [];

      // Últimos N meses
      for (let i = meses - 1; i >= 0; i--) {
        const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        const anio = d.getFullYear();
        const mes = d.getMonth() + 1;

        const p = await q.periodoByYM(anio, mes);
        if (p) {
          const ing = await calc.ingresos(p.id);
          const gas = await calc.gastos(p.id);
          const acum = await calc.acumHasta(p);
          ev.push({
            label: `${anio}-${String(mes).padStart(2, '0')}`,
            ingresos: ing,
            gastos: gas,
            ahorro: ing - gas,
            acum: acum
          });
        }
      }

      return ev;
    }
  };

  App.calc = calc;
})(window.App = window.App || {});
