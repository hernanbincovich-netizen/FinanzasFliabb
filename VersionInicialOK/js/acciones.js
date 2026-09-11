/* Acciones de negocio que tocan varias tablas. */
(function (App) {
  const db = App.db, q = App.q, calc = App.calc, F = App.fmt;

  // Período sobre el que se está trabajando (el del navegador de meses de arriba).
  // Exige que exista y esté abierto para poder editar.
  function periodoEditable() {
    const p = App.periodoView();
    if (!p || !p.id) throw new Error('Ese mes todavía no existe. Creralo primero.');
    if (p.estado !== 'abierto') throw new Error('El mes está cerrado. Reabrilo para poder editar.');
    return p;
  }
  // Período para datos que "flotan" (saldos, cotizaciones, aportes): el que se ve, o el actual.
  function periodoParaDato() {
    const p = App.periodoView();
    return (p && p.id) ? p : q.periodoActual();
  }

  function crearConcepto(d) {
    // d: {nombre,tipo,monto,moneda,categoria_id,cuenta_id,integrante_id,es_agrupado,es_recurrente,fecha_vencimiento}
    const pid = periodoEditable().id;
    const venc = d.tipo === 'gasto' ? (d.fecha_vencimiento || null) : null;
    db.tx(() => {
      db.run(
        `INSERT INTO conceptos(nombre,tipo,categoria_id,cuenta_id,integrante_id,moneda,es_agrupado,es_recurrente,monto_referencia)
         VALUES(?,?,?,?,?,?,?,?,?)`,
        [d.nombre, d.tipo, d.categoria_id || null, d.cuenta_id || null, d.integrante_id || null,
         d.moneda, d.es_agrupado ? 1 : 0, d.es_recurrente ? 1 : 0, d.es_recurrente ? d.monto : null]
      );
      const cid = db.lastId();
      db.run(
        `INSERT INTO movimientos(periodo_id,concepto_id,monto,moneda,estado,vino_de_recurrente,fecha_vencimiento)
         VALUES(?,?,?,?,?,0,?)`,
        [pid, cid, d.monto || 0, d.moneda, d.estado || 'pendiente', venc]
      );
    });
    db.markDirty();
  }

  function actualizarMovimiento(id, d) {
    // la categoría es un dato del concepto (compartido por todos los meses), no del movimiento:
    // si viene concepto_id, se corrige ahí y vale para siempre (pasado, actual y futuro).
    db.tx(() => {
      db.run(
        `UPDATE movimientos SET monto=?, moneda=?, estado=?, cuenta_id=?, nota=?, fecha_vencimiento=?, actualizado_en=datetime('now') WHERE id=?`,
        [d.monto, d.moneda, d.estado, d.cuenta_id || null, d.nota || null, d.fecha_vencimiento || null, id]
      );
      if (d.concepto_id) db.run('UPDATE conceptos SET categoria_id=? WHERE id=?', [d.categoria_id || null, d.concepto_id]);
    });
    db.markDirty();
  }
  function setEstadoMovimiento(id, estado) {
    db.run(`UPDATE movimientos SET estado=?, actualizado_en=datetime('now') WHERE id=?`, [estado, id]);
    db.markDirty();
  }
  function borrarMovimiento(id, tambienConcepto) {
    db.tx(() => {
      const m = db.get('SELECT concepto_id FROM movimientos WHERE id=?', [id]);
      db.run('DELETE FROM movimientos WHERE id=?', [id]);
      if (tambienConcepto && m) {
        const usos = db.get('SELECT COUNT(*) c FROM movimientos WHERE concepto_id=?', [m.concepto_id]).c;
        if (!usos) db.run('DELETE FROM conceptos WHERE id=?', [m.concepto_id]);
      }
    });
    db.markDirty();
  }

  // Alta rápida de categoría desde un formulario abierto (ej. Carga). A propósito NO usa
  // markDirty(): eso dispara un re-render de toda la pantalla y perderíamos lo que el usuario
  // ya venía completando. Solo persiste; quien la llama actualiza el <select> a mano.
  function crearCategoria(nombre, tipo) {
    const existe = db.get('SELECT id FROM categorias WHERE nombre=? COLLATE NOCASE', [nombre]);
    if (existe) throw new Error('Ya existe una categoría con ese nombre.');
    const orden = db.get('SELECT COALESCE(MAX(orden),0)+1 n FROM categorias').n;
    db.run('INSERT INTO categorias(nombre,tipo,orden) VALUES(?,?,?)', [nombre, tipo, orden]);
    const id = db.lastId();
    db.persistNow();
    return id;
  }

  function guardarCuenta(id, d) {
    if (id) {
      db.run('UPDATE cuentas SET nombre=?, tipo=?, titular_id=?, proposito=?, moneda=?, activa=? WHERE id=?',
        [d.nombre, d.tipo, d.titular_id || null, d.proposito, d.moneda, d.activa ? 1 : 0, id]);
    } else {
      db.run('INSERT INTO cuentas(nombre,tipo,titular_id,proposito,moneda,orden) VALUES(?,?,?,?,?,?)',
        [d.nombre, d.tipo, d.titular_id || null, d.proposito, d.moneda,
         (db.get('SELECT COALESCE(MAX(orden),0)+1 n FROM cuentas').n)]);
    }
    db.markDirty();
  }
  function actualizarSaldo(cuentaId, saldo, fecha, nota) {
    const p = periodoParaDato();
    db.run('INSERT INTO saldos_cuenta(cuenta_id,periodo_id,fecha,saldo,nota) VALUES(?,?,?,?,?)',
      [cuentaId, p ? p.id : null, fecha || F.hoyISO(), saldo, nota || null]);
    db.markDirty();
  }

  function setCotizacion(par, valor, fecha) {
    const p = periodoParaDato();
    db.run('INSERT INTO cotizaciones(par,valor,fecha,periodo_id) VALUES(?,?,?,?)', [par, valor, fecha || F.hoyISO(), p ? p.id : null]);
    db.markDirty();
  }

  function guardarMeta(id, d) {
    if (id) {
      db.run('UPDATE metas SET nombre=?, moneda=?, monto_objetivo=?, monto_inicial=?, fecha_inicio=?, fecha_objetivo=?, cuenta_id=?, estado=? WHERE id=?',
        [d.nombre, d.moneda, d.monto_objetivo, d.monto_inicial, d.fecha_inicio, d.fecha_objetivo, d.cuenta_id || null, d.estado || 'activa', id]);
    } else {
      db.run('INSERT INTO metas(nombre,moneda,monto_objetivo,monto_inicial,fecha_inicio,fecha_objetivo,cuenta_id) VALUES(?,?,?,?,?,?,?)',
        [d.nombre, d.moneda, d.monto_objetivo, d.monto_inicial, d.fecha_inicio, d.fecha_objetivo, d.cuenta_id || null]);
    }
    db.markDirty();
  }
  function registrarAporte(metaId, monto, moneda, fecha) {
    const p = periodoParaDato();
    db.run('INSERT INTO meta_aportes(meta_id,periodo_id,monto,moneda,fecha) VALUES(?,?,?,?,?)',
      [metaId, p ? p.id : null, monto, moneda, fecha || F.hoyISO()]);
    db.markDirty();
  }
  function borrarMeta(id) { db.run('DELETE FROM metas WHERE id=?', [id]); db.markDirty(); }

  function guardarAsignadoEfectivo(periodoId, cuentaId, asignado) {
    db.run(`INSERT INTO presupuesto_efectivo(periodo_id,cuenta_id,asignado) VALUES(?,?,?)
            ON CONFLICT(periodo_id,cuenta_id) DO UPDATE SET asignado=excluded.asignado`,
      [periodoId, cuentaId, asignado]);
    db.markDirty();
  }

  // Recalcula ahorro_acumulado de todos los períodos cerrados, en orden cronológico.
  function recalcAcumulado() {
    let acc = 0;
    db.all('SELECT id, estado, ahorro_mes FROM periodos ORDER BY anio, mes').forEach((p) => {
      const ah = (p.estado === 'cerrado' && p.ahorro_mes != null) ? p.ahorro_mes : (calc.ingresos(p.id) - calc.gastos(p.id));
      acc += ah;
      if (p.estado === 'cerrado') db.run('UPDATE periodos SET ahorro_acumulado=? WHERE id=?', [acc, p.id]);
    });
  }
  function fijarPeriodoActual() {
    const la = db.get("SELECT id FROM periodos WHERE estado='abierto' ORDER BY anio DESC, mes DESC LIMIT 1")
            || db.get('SELECT id FROM periodos ORDER BY anio DESC, mes DESC LIMIT 1');
    if (la) App.q.setSetting('periodo_actual_id', la.id);
  }

  function crearPeriodo(anio, mes) {
    if (db.get('SELECT 1 FROM periodos WHERE anio=? AND mes=?', [anio, mes])) return;
    db.run("INSERT INTO periodos(anio,mes,estado) VALUES(?,?,'abierto')", [anio, mes]);
    fijarPeriodoActual();
    db.markDirty();
  }

  function eliminarPeriodo(periodoId) {
    const c = (t, col) => db.get('SELECT COUNT(*) c FROM ' + t + ' WHERE ' + col + '=?', [periodoId]).c;
    if (c('movimientos', 'periodo_id') || c('saldos_cuenta', 'periodo_id') || c('meta_aportes', 'periodo_id') || c('presupuesto_efectivo', 'periodo_id'))
      throw new Error('El período tiene datos cargados. Borralos primero.');
    db.tx(() => { db.run('DELETE FROM periodos WHERE id=?', [periodoId]); fijarPeriodoActual(); recalcAcumulado(); });
    db.markDirty();
  }

  function reabrirMes(periodoId) {
    db.tx(() => {
      db.run("UPDATE periodos SET estado='abierto', fecha_cierre=NULL, ingresos_mes=NULL, gastos_mes=NULL, ahorro_mes=NULL, ahorro_acumulado=NULL, cotiz_usd_ars_cierre=NULL, cotiz_btc_usd_cierre=NULL WHERE id=?", [periodoId]);
      db.run('UPDATE movimientos SET monto_ars=NULL WHERE periodo_id=?', [periodoId]);
      fijarPeriodoActual();
      recalcAcumulado();
    });
    db.markDirty();
  }

  // Última fecha de vencimiento cargada para un concepto (con el período al que pertenecía).
  function ultimaFechaVencimiento(conceptoId) {
    return db.get(
      `SELECT m.fecha_vencimiento AS fv, p.anio AS anio, p.mes AS mes
       FROM movimientos m JOIN periodos p ON p.id = m.periodo_id
       WHERE m.concepto_id=? AND m.fecha_vencimiento IS NOT NULL
       ORDER BY p.anio DESC, p.mes DESC LIMIT 1`,
      [conceptoId]
    );
  }
  // Sugiere el vencimiento para un concepto recurrente en un período nuevo,
  // corriendo el último vencimiento conocido la cantidad de meses que corresponda.
  function vencimientoSugerido(conceptoId, anioDestino, mesDestino) {
    const u = ultimaFechaVencimiento(conceptoId);
    if (!u || !u.fv) return null;
    const delta = (anioDestino * 12 + mesDestino) - (u.anio * 12 + u.mes);
    return F.shiftFechaMes(u.fv, delta);
  }

  // Copia al período los conceptos recurrentes que todavía no tenga (en pendiente).
  function traerRecurrentes(periodoId) {
    let n = 0;
    const per = db.get('SELECT anio, mes FROM periodos WHERE id=?', [periodoId]);
    db.tx(() => {
      db.all('SELECT * FROM conceptos WHERE es_recurrente=1 AND activo=1').forEach((c) => {
        if (db.get('SELECT 1 FROM movimientos WHERE periodo_id=? AND concepto_id=?', [periodoId, c.id])) return;
        const venc = per ? vencimientoSugerido(c.id, per.anio, per.mes) : null;
        db.run("INSERT INTO movimientos(periodo_id,concepto_id,monto,moneda,estado,vino_de_recurrente,fecha_vencimiento) VALUES(?,?,?,?,'pendiente',1,?)",
          [periodoId, c.id, c.monto_referencia != null ? c.monto_referencia : 0, c.moneda, venc]);
        n++;
      });
    });
    db.markDirty();
    return n;
  }

  function cerrarMes() {
    const p = App.periodoView();
    if (!p || !p.id) throw new Error('Ese mes todavía no existe.');
    if (p.estado !== 'abierto') throw new Error('Ese mes ya está cerrado.');
    const usd = calc.usdArs(), btc = calc.btcUsd();
    const ing = calc.ingresos(p.id), gas = calc.gastos(p.id), ahorro = ing - gas;
    const ult = db.get('SELECT anio, mes FROM periodos ORDER BY anio DESC, mes DESC LIMIT 1');
    const esUltimo = ult && ult.anio === p.anio && ult.mes === p.mes;
    const nMes = p.mes === 12 ? 1 : p.mes + 1;
    const nAnio = p.mes === 12 ? p.anio + 1 : p.anio;

    db.tx(() => {
      q.movimientos(p.id).forEach((m) => {
        db.run('UPDATE movimientos SET monto_ars=? WHERE id=?', [calc.aArs(m.monto, m.moneda), m.id]);
      });
      db.run("UPDATE periodos SET estado='cerrado', fecha_cierre=?, ingresos_mes=?, gastos_mes=?, ahorro_mes=?, cotiz_usd_ars_cierre=?, cotiz_btc_usd_cierre=? WHERE id=?",
        [F.hoyISO(), ing, gas, ahorro, usd, btc, p.id]);
      if (esUltimo) {
        db.run("INSERT INTO periodos(anio,mes,estado) VALUES(?,?,'abierto')", [nAnio, nMes]);
        const npid = db.lastId();
        db.all('SELECT * FROM conceptos WHERE es_recurrente=1 AND activo=1').forEach((c) => {
          const prev = db.get('SELECT monto, fecha_vencimiento FROM movimientos WHERE periodo_id=? AND concepto_id=?', [p.id, c.id]);
          const monto = c.monto_referencia != null ? c.monto_referencia : (prev ? prev.monto : 0);
          const venc = prev && prev.fecha_vencimiento ? F.shiftFechaMes(prev.fecha_vencimiento, 1) : null;
          db.run("INSERT INTO movimientos(periodo_id,concepto_id,monto,moneda,estado,vino_de_recurrente,fecha_vencimiento) VALUES(?,?,?,?,'pendiente',1,?)",
            [npid, c.id, monto, c.moneda, venc]);
        });
        q.presupuestoEfectivo(p.id).forEach((pe) => {
          db.run('INSERT INTO presupuesto_efectivo(periodo_id,cuenta_id,asignado) VALUES(?,?,?)', [npid, pe.cuenta_id, pe.asignado]);
        });
      }
      recalcAcumulado();
      fijarPeriodoActual();
    });
    const act = q.periodoActual();
    App.state.view = act ? { anio: act.anio, mes: act.mes } : { anio: p.anio, mes: p.mes };
    db.markDirty();
  }

  /* Garantiza que la base tenga lo mínimo para operar (bases de cero o importadas viejas). */
  function asegurarBase() {
    if (App.bootstrapMinimo) App.bootstrapMinimo(db);
    if (!q.periodoActual()) {
      const d = new Date();
      db.run("INSERT INTO periodos(anio,mes,estado) VALUES(?,?,'abierto')", [d.getFullYear(), d.getMonth() + 1]);
      App.q.setSetting('periodo_actual_id', db.lastId());
      db.markDirty();
    }
  }

  App.acciones = {
    asegurarBase,
    crearConcepto, actualizarMovimiento, setEstadoMovimiento, borrarMovimiento, crearCategoria,
    guardarCuenta, actualizarSaldo, setCotizacion, guardarMeta, registrarAporte, borrarMeta,
    guardarAsignadoEfectivo, cerrarMes,
    crearPeriodo, eliminarPeriodo, reabrirMes, traerRecurrentes, recalcAcumulado,
  };
})(window.App = window.App || {});
