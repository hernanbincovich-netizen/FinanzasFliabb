/* Consultas (App.q) y cálculos derivados (App.calc). Todo sobre App.db. */
(function (App) {
  const db = App.db;
  const F = App.fmt;

  /* ================= consultas ================= */
  const q = {
    setting(clave, def = null) {
      const r = db.get('SELECT valor FROM settings WHERE clave=?', [clave]);
      return r ? r.valor : def;
    },
    setSetting(clave, valor) {
      db.run('INSERT INTO settings(clave,valor) VALUES(?,?) ON CONFLICT(clave) DO UPDATE SET valor=excluded.valor', [clave, String(valor)]);
    },
    periodos() { return db.all('SELECT * FROM periodos ORDER BY anio, mes'); },
    periodo(id) { return db.get('SELECT * FROM periodos WHERE id=?', [id]); },
    periodoByYM(anio, mes) { return db.get('SELECT * FROM periodos WHERE anio=? AND mes=?', [anio, mes]); },
    periodoActual() {
      const id = q.setting('periodo_actual_id');
      let p = id ? db.get('SELECT * FROM periodos WHERE id=?', [id]) : null;
      if (!p) p = db.get("SELECT * FROM periodos WHERE estado='abierto' ORDER BY anio DESC, mes DESC LIMIT 1");
      if (!p) p = db.get('SELECT * FROM periodos ORDER BY anio DESC, mes DESC LIMIT 1');
      return p;
    },
    integrantes() { return db.all('SELECT * FROM integrantes ORDER BY orden, id'); },
    integranteNombre(id) { const r = id && db.get('SELECT nombre FROM integrantes WHERE id=?', [id]); return r ? r.nombre : 'Compartido'; },
    categorias() { return db.all('SELECT * FROM categorias ORDER BY orden, nombre'); },
    cuentas(soloActivas = true) {
      return db.all('SELECT * FROM cuentas' + (soloActivas ? ' WHERE activa=1' : '') + ' ORDER BY orden, id');
    },
    cuenta(id) { return db.get('SELECT * FROM cuentas WHERE id=?', [id]); },
    conceptos(soloActivos = true) {
      return db.all('SELECT * FROM conceptos' + (soloActivos ? ' WHERE activo=1' : '') + ' ORDER BY tipo DESC, nombre');
    },
    movimientos(periodoId) {
      return db.all(
        `SELECT m.*, c.nombre AS concepto, c.tipo AS tipo, c.es_recurrente, c.es_agrupado,
                c.categoria_id AS categoria_id, cat.nombre AS categoria,
                COALESCE(cu.nombre, cuc.nombre) AS cuenta_nombre,
                c.integrante_id
         FROM movimientos m
         JOIN conceptos c ON c.id = m.concepto_id
         LEFT JOIN categorias cat ON cat.id = c.categoria_id
         LEFT JOIN cuentas cu  ON cu.id = m.cuenta_id
         LEFT JOIN cuentas cuc ON cuc.id = c.cuenta_id
         WHERE m.periodo_id = ?
         ORDER BY c.tipo DESC, c.nombre`,
        [periodoId]
      );
    },
    metas() { return db.all('SELECT * FROM metas ORDER BY estado, fecha_objetivo'); },
    metaAportes(metaId) { return db.all('SELECT * FROM meta_aportes WHERE meta_id=? ORDER BY fecha', [metaId]); },
    cotizacionVigente(par) {
      return db.get('SELECT * FROM cotizaciones WHERE par=? ORDER BY fecha DESC, id DESC LIMIT 1', [par]);
    },
    cotizaciones(par) { return db.all('SELECT * FROM cotizaciones WHERE par=? ORDER BY fecha DESC, id DESC', [par]); },
    presupuestoEfectivo(periodoId) {
      return db.all(
        `SELECT pe.*, cu.nombre AS cuenta_nombre, cu.moneda, cu.titular_id
         FROM presupuesto_efectivo pe JOIN cuentas cu ON cu.id = pe.cuenta_id
         WHERE pe.periodo_id = ? ORDER BY cu.orden`,
        [periodoId]
      );
    },
    saldoActual(cuentaId) {
      const r = db.get('SELECT saldo FROM saldos_cuenta WHERE cuenta_id=? ORDER BY fecha DESC, id DESC LIMIT 1', [cuentaId]);
      return r ? r.saldo : 0;
    },
    saldoPeriodo(cuentaId, periodoId) {
      const r = db.get('SELECT saldo FROM saldos_cuenta WHERE cuenta_id=? AND periodo_id=? ORDER BY fecha DESC, id DESC LIMIT 1', [cuentaId, periodoId]);
      return r ? r.saldo : null;
    },
  };

  /* ================= cálculos ================= */
  const calc = {
    pctEfectivo() { return parseFloat(q.setting('pct_efectivo_objetivo', '0.05')) || 0.05; },
    usdArs() { const r = q.cotizacionVigente('USD_ARS'); return r ? r.valor : 0; },
    btcUsd() { const r = q.cotizacionVigente('BTC_USD'); return r ? r.valor : 0; },
    btcArs() { return calc.btcUsd() * calc.usdArs(); },
    aArs(monto, moneda) {
      monto = Number(monto) || 0;
      if (moneda === 'USD') return monto * calc.usdArs();
      if (moneda === 'BTC') return monto * calc.btcArs();
      return monto;
    },

    ingresos(periodoId) {
      const p = q.periodo(periodoId);
      if (p && p.estado === 'cerrado' && p.ingresos_mes != null) return p.ingresos_mes;
      return q.movimientos(periodoId).filter((m) => m.tipo === 'ingreso')
        .reduce((a, m) => a + calc.aArs(m.monto, m.moneda), 0);
    },
    gastos(periodoId) {
      const p = q.periodo(periodoId);
      if (p && p.estado === 'cerrado' && p.gastos_mes != null) return p.gastos_mes;
      return q.movimientos(periodoId).filter((m) => m.tipo === 'gasto')
        .reduce((a, m) => a + calc.aArs(m.monto, m.moneda), 0);
    },
    ahorro(periodoId) { return calc.ingresos(periodoId) - calc.gastos(periodoId); },

    // ahorro de un período (cerrado usa lo congelado, abierto se calcula en vivo)
    ahorroPeriodo(p) {
      if (p.estado === 'cerrado' && p.ahorro_mes != null) return p.ahorro_mes;
      return calc.ingresos(p.id) - calc.gastos(p.id);
    },
    ahorroAcumulado() {
      return q.periodos().reduce((a, p) => a + calc.ahorroPeriodo(p), 0);
    },
    // acumulado hasta ese período inclusive (en orden cronológico)
    acumHasta(per) {
      let acc = 0;
      for (const x of q.periodos()) {
        acc += calc.ahorroPeriodo(x);
        if (x.anio === per.anio && x.mes === per.mes) break;
      }
      return acc;
    },

    gastosPorCategoria(periodoId) {
      const map = {};
      q.movimientos(periodoId).filter((m) => m.tipo === 'gasto').forEach((m) => {
        const k = m.categoria || 'Sin categoría';
        map[k] = (map[k] || 0) + calc.aArs(m.monto, m.moneda);
      });
      return Object.entries(map).map(([nombre, total]) => ({ nombre, total })).sort((a, b) => b.total - a.total);
    },

    evolucion(n = 12) {
      let acc = 0;
      const all = q.periodos().map((p) => {
        let ing, gas;
        if (p.estado === 'cerrado' && p.ingresos_mes != null) { ing = p.ingresos_mes; gas = p.gastos_mes || 0; }
        else { ing = calc.ingresos(p.id); gas = calc.gastos(p.id); }
        const ah = ing - gas; acc += ah;
        return { label: F.MES3[p.mes - 1], anio: p.anio, ingresos: ing, gastos: gas, ahorro: ah, acum: acc };
      });
      return all.slice(-n);
    },

    objetivoEfectivo(periodoId) { return calc.ingresos(periodoId) * calc.pctEfectivo(); },
    gastadoEfectivo(cuentaId, periodoId, asignado) {
      const s = q.saldoPeriodo(cuentaId, periodoId);
      if (s == null) return 0;
      return Math.max(0, asignado - s);
    },

    plataPara(propositos) {
      return q.cuentas(true).filter((c) => propositos.includes(c.proposito))
        .reduce((a, c) => a + calc.aArs(q.saldoActual(c.id), c.moneda), 0);
    },
    plataParaMes() { return calc.plataPara(['gastos_mes', 'efectivo_mes']); },
    plataParaAhorro() { return calc.plataPara(['ahorro_metas', 'fondo_emergencia', 'ahorro_largo_plazo']); },
    tarjetaAPagar() {
      return q.cuentas(true).filter((c) => q.saldoActual(c.id) < 0)
        .reduce((a, c) => a + calc.aArs(q.saldoActual(c.id), c.moneda), 0);
    },

    metaAcum(meta) {
      const ap = q.metaAportes(meta.id).reduce((a, x) => a + Number(x.monto), 0);
      return Number(meta.monto_inicial) + ap;
    },
    metaMesesRestantes(meta) {
      return Math.max(1, F.mesesEntreYM(F.hoyYM(), meta.fecha_objetivo));
    },
    metaAporteMensual(meta) {
      const falta = Number(meta.monto_objetivo) - calc.metaAcum(meta);
      return Math.max(0, falta / calc.metaMesesRestantes(meta));
    },
  };

  App.q = q;
  App.calc = calc;
})(window.App = window.App || {});
