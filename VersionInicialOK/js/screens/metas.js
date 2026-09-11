(function (App) {
  const U = App.ui, q = App.q, calc = App.calc, F = App.fmt, A = App.acciones;
  const MON = ['ARS', 'USD', 'BTC'];

  function formMeta(m) {
    const cuentas = q.cuentas(true);
    return U.form([
      { k: 'nombre', label: 'Nombre', value: m ? m.nombre : '', placeholder: 'Ej. Cambio de auto' },
      { k: 'moneda', label: 'Moneda', type: 'select', value: m ? m.moneda : 'ARS', opts: MON, half: true },
      { k: 'monto_objetivo', label: 'Monto objetivo', type: 'number', value: m ? F.nf.format(m.monto_objetivo) : '', half: true },
      { k: 'monto_inicial', label: 'Ya ahorrado', type: 'number', value: m ? F.nf.format(m.monto_inicial) : '0', half: true },
      { k: 'cuenta_id', label: 'Cuenta donde se acumula', type: 'select', value: m ? (m.cuenta_id || '') : '', opts: [{ v: '', t: '— ninguna —' }].concat(cuentas.map((c) => ({ v: c.id, t: c.nombre }))), half: true },
      { k: 'fecha_inicio', label: 'Fecha de inicio (AAAA-MM)', value: m ? m.fecha_inicio : F.hoyYM(), half: true },
      { k: 'fecha_objetivo', label: 'Fecha objetivo (AAAA-MM)', value: m ? m.fecha_objetivo : '', half: true },
    ]);
  }

  App.screens.metas = function () {
    const wrap = U.el('section', 'screen');
    wrap.append(U.head('Metas de ahorro',
      'Objetivos del hogar con fecha de inicio y fecha objetivo. El sistema divide lo que falta por los meses que quedan y te dice cuánto apartar por mes. El aporte es único entre los dos.'));

    const metas = q.metas().filter((m) => m.estado !== 'cancelada');

    const cards = metas.map((m) => {
      const acum = calc.metaAcum(m);
      const pc = m.monto_objetivo ? acum / m.monto_objetivo * 100 : 0;
      const restan = calc.metaMesesRestantes(m);
      const aporte = calc.metaAporteMensual(m);
      const c = U.el('div', 'card');
      c.append(U.el('div', null, `
        <div class="profile-top"><strong style="font-size:1rem">${m.nombre}</strong><span class="badge blue">${F.ymCorto(m.fecha_objetivo)}</span></div>
        <div class="num big">${F.money(acum, m.moneda)}</div>
        <div class="t-sub">de ${F.money(m.monto_objetivo, m.moneda)} · ${Math.round(pc)}%</div>`));
      c.append(U.meter(pc, pc >= 100 ? 'good' : ''));
      c.append(U.el('dl', 'kv', `
        <dt>Apartar por mes</dt><dd><strong>${F.money(aporte, m.moneda)}</strong></dd>
        <dt>Desde</dt><dd>${F.ymCorto(m.fecha_inicio)}</dd>
        <dt>Meses que faltan</dt><dd>${restan}</dd>`));
      const acts = U.el('div', 'card-acts');
      const bAp = U.el('button', 'btn sm', 'Registrar aporte');
      const bEd = U.el('button', 'btn ghost sm', 'Editar');
      const bDel = U.el('button', 'btn ghost sm', 'Eliminar');
      bAp.addEventListener('click', () => {
        const f = U.form([
          { k: 'monto', label: 'Monto del aporte (' + m.moneda + ')', type: 'number', value: F.nf.format(Math.round(aporte)) },
          { k: 'fecha', label: 'Fecha', type: 'date', value: F.hoyISO() },
        ]);
        U.modal('Registrar aporte — ' + m.nombre, f, { okText: 'Guardar aporte', onOk: () => { const d = f.read(); A.registrarAporte(m.id, F.parseMonto(d.monto), m.moneda, d.fecha); U.toast('Aporte registrado.'); App.render(); } });
      });
      bEd.addEventListener('click', () => {
        const f = formMeta(m);
        U.modal('Editar meta', f, { onOk: () => { const d = f.read(); if (!d.nombre.trim()) { U.toast('Poné un nombre.'); return false; }
          A.guardarMeta(m.id, { ...d, monto_objetivo: F.parseMonto(d.monto_objetivo), monto_inicial: F.parseMonto(d.monto_inicial) }); U.toast('Meta actualizada.'); App.render(); } });
      });
      bDel.addEventListener('click', () => U.confirmar('¿Eliminar la meta “' + m.nombre + '” y sus aportes?', () => { A.borrarMeta(m.id); U.toast('Meta eliminada.'); App.render(); }, 'Eliminar'));
      acts.append(bAp, bEd, bDel);
      c.append(acts);
      return c;
    });
    if (cards.length) wrap.append(U.grid(3, cards));
    else wrap.append(U.el('p', 'empty', 'Todavía no hay metas. Creá la primera abajo.'));

    // plan mensual
    if (metas.length) {
      const cPlan = U.card('Plan mensual', 'cuánto apartar este mes para cada meta');
      let totalARS = 0;
      const rows = metas.map((m) => {
        const acum = calc.metaAcum(m), restan = calc.metaMesesRestantes(m), aporte = calc.metaAporteMensual(m);
        totalARS += calc.aArs(aporte, m.moneda);
        return { m, acum, restan, aporte, pc: Math.round(m.monto_objetivo ? acum / m.monto_objetivo * 100 : 0) };
      });
      const tbl = U.table([
        { h: 'Meta', get: (r) => `<span class="t-name">${r.m.nombre}</span>` },
        { h: 'Inicio', get: (r) => F.ymCorto(r.m.fecha_inicio) },
        { h: 'Objetivo', get: (r) => F.ymCorto(r.m.fecha_objetivo) },
        { h: 'Meses rest.', num: true, get: (r) => r.restan },
        { h: 'Acumulado', num: true, get: (r) => F.money(r.acum, r.m.moneda) },
        { h: 'Objetivo', num: true, get: (r) => F.money(r.m.monto_objetivo, r.m.moneda) },
        { h: 'Apartar / mes', num: true, get: (r) => `<strong>${F.money(r.aporte, r.m.moneda)}</strong>` },
        { h: 'Progreso', get: (r) => { const w = U.el('div'); w.style.minWidth = '110px'; w.append(U.meter(r.pc)); return w; } },
      ], rows);
      tbl.querySelector('tbody').append((function () {
        const tr = U.el('tr', 'tr-total');
        tr.innerHTML = `<td colspan="6" class="num">Total a apartar este mes (en ARS)</td><td class="num"><strong>${F.money(totalARS)}</strong></td><td></td>`;
        return tr;
      })());
      cPlan.append(tbl);
      wrap.append(cPlan);
    }

    // nueva meta
    const cNew = U.card('Nueva meta');
    const f = formMeta(null);
    const b = U.el('button', 'btn', 'Crear meta'); b.type = 'button';
    b.addEventListener('click', () => {
      const d = f.read();
      if (!d.nombre.trim()) return U.toast('Poné un nombre.');
      if (!/^\d{4}-\d{2}$/.test(d.fecha_objetivo)) return U.toast('Fecha objetivo con formato AAAA-MM.');
      A.guardarMeta(null, { ...d, monto_objetivo: F.parseMonto(d.monto_objetivo), monto_inicial: F.parseMonto(d.monto_inicial) });
      U.toast('Meta creada.'); App.render();
    });
    f.append(b); cNew.append(f);
    wrap.append(cNew);

    return wrap;
  };
})(window.App = window.App || {});
