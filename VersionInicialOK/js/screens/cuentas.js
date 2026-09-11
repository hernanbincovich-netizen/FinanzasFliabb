(function (App) {
  const U = App.ui, q = App.q, calc = App.calc, F = App.fmt, A = App.acciones;

  const TIPOS = ['caja_ahorro', 'cuenta_sueldo', 'billetera_efectivo', 'billetera_cripto', 'inversion', 'tarjeta_credito', 'otro'];
  const TIPO_T = { caja_ahorro: 'Caja de ahorro', cuenta_sueldo: 'Cuenta sueldo', billetera_efectivo: 'Billetera efectivo', billetera_cripto: 'Billetera cripto', inversion: 'Inversión', tarjeta_credito: 'Tarjeta de crédito', otro: 'Otro' };
  const PROP = ['gastos_mes', 'efectivo_mes', 'ahorro_metas', 'fondo_emergencia', 'ahorro_largo_plazo', 'otro'];
  const PROP_T = { gastos_mes: 'Gastos del mes', efectivo_mes: 'Gastos en efectivo del mes', ahorro_metas: 'Ahorro / metas', fondo_emergencia: 'Fondo de emergencia', ahorro_largo_plazo: 'Ahorro largo plazo', otro: 'Otro' };
  const MON = ['ARS', 'USD', 'BTC'];

  function formCuenta(c) {
    const ints = q.integrantes();
    return U.form([
      { k: 'nombre', label: 'Nombre', value: c ? c.nombre : '', placeholder: 'Ej. Caja de ahorro USD' },
      { k: 'tipo', label: 'Tipo', type: 'select', value: c ? c.tipo : 'caja_ahorro', opts: TIPOS.map((t) => ({ v: t, t: TIPO_T[t] })), half: true },
      { k: 'moneda', label: 'Moneda', type: 'select', value: c ? c.moneda : 'ARS', opts: MON, half: true },
      { k: 'titular_id', label: 'Titular', type: 'select', value: c ? (c.titular_id || '') : '', opts: [{ v: '', t: 'Compartida' }].concat(ints.map((i) => ({ v: i.id, t: i.nombre }))), half: true },
      { k: 'proposito', label: 'Propósito', type: 'select', value: c ? c.proposito : 'gastos_mes', opts: PROP.map((p) => ({ v: p, t: PROP_T[p] })), half: true },
      { k: 'activa', label: 'Cuenta activa', type: 'check', value: c ? !!c.activa : true },
    ]);
  }

  App.screens.cuentas = function () {
    const wrap = U.el('section', 'screen');
    wrap.append(U.head('Cuentas y perfiles del hogar',
      'Dónde está la plata del hogar y para qué es cada cuenta. Acá se carga y actualiza el saldo de cada una — incluidas las billeteras de efectivo que alimentan el Presupuesto.'));

    const arsParaMes = calc.plataParaMes();
    const arsParaAhorro = calc.plataParaAhorro();
    const arsTarjeta = calc.tarjetaAPagar();
    const usdRate = calc.usdArs();
    wrap.append(U.grid(3, [
      U.statCard('Plata para el mes', F.money(arsParaMes), `US$ ${F.nf.format(Math.round(arsParaMes / usdRate))} · cuentas y efectivo de gastos`),
      U.statCard('Plata para ahorro', F.money(arsParaAhorro), `US$ ${F.nf.format(Math.round(arsParaAhorro / usdRate))} · metas, fondo y BTC`),
      U.statCard('Tarjeta a pagar', F.money(arsTarjeta), `US$ ${F.nf.format(Math.round(arsTarjeta / usdRate))} · se salda con la plata del mes`, 'down'),
    ]));

    // perfiles
    const pact = q.periodoActual();
    const pe = q.presupuestoEfectivo(pact.id);
    const perfiles = q.integrantes().map((it) => {
      const bill = q.cuentas(false).find((c) => c.tipo === 'billetera_efectivo' && c.titular_id === it.id);
      const asign = bill ? (pe.find((x) => x.cuenta_id === bill.id) || {}).asignado : null;
      const propias = q.cuentas(false).filter((c) => c.titular_id === it.id).length;
      const c = U.el('div', 'card');
      c.append(U.el('div', 'profile', `
        <div class="avatar">${it.nombre[0]}</div>
        <div style="flex:1">
          <div class="profile-top"><strong>${it.nombre}</strong><span class="badge blue">Acceso completo</span></div>
          <dl class="kv">
            <dt>Billetera de efectivo</dt><dd>${bill ? F.money(q.saldoActual(bill.id)) : '—'}${asign != null ? ` <span class="t-sub">/ asignado ${F.money(asign)}</span>` : ''}</dd>
            <dt>Cuentas a su nombre</dt><dd>${propias}</dd>
          </dl>
        </div>`));
      return c;
    });
    wrap.append(U.grid(2, perfiles));

    // tabla de cuentas
    const cT = U.card('Cuentas y medios de pago', q.cuentas(false).length + ' cuentas');
    const btnNew = U.el('button', 'btn ghost sm', '＋ Nueva cuenta');
    btnNew.addEventListener('click', () => {
      const f = formCuenta(null);
      U.modal('Nueva cuenta', f, { okText: 'Crear cuenta', onOk: () => {
        const d = f.read(); if (!d.nombre.trim()) { U.toast('Poné un nombre.'); return false; }
        A.guardarCuenta(null, d); U.toast('Cuenta creada.'); App.render();
      } });
    });
    cT.querySelector('.card-head').append(btnNew);

    const rows = q.cuentas(false);
    cT.append(U.table([
      { h: 'Cuenta', get: (r) => `<span class="t-name">${r.nombre}</span>${r.activa ? '' : ' <span class="badge grey">inactiva</span>'}` },
      { h: 'Tipo', get: (r) => TIPO_T[r.tipo] || r.tipo },
      { h: 'Titular', get: (r) => (r.titular_id ? q.integranteNombre(r.titular_id) : '<span class="badge grey">Compartida</span>') },
      { h: 'Propósito', get: (r) => PROP_T[r.proposito] || r.proposito },
      { h: 'Moneda', k: 'moneda' },
      { h: 'Saldo', num: true, get: (r) => { const s = q.saldoActual(r.id); return `<span style="${s < 0 ? 'color:var(--bad)' : ''}">${s < 0 ? '− ' : ''}${F.money(Math.abs(s), r.moneda)}</span>`; } },
      { h: 'Equiv. ARS', num: true, get: (r) => { const s = calc.aArs(q.saldoActual(r.id), r.moneda); return `<span class="t-sub">${s < 0 ? '− ' : ''}${F.money(Math.abs(s))}</span>`; } },
      { h: '', num: true, get: (r) => {
          const w = U.el('span', 'rowacts');
          const up = U.el('button', 'link-btn', 'Actualizar'); const ed = U.el('button', 'link-btn', 'Editar');
          up.addEventListener('click', () => abrirSaldo(r));
          ed.addEventListener('click', () => {
            const f = formCuenta(r);
            U.modal('Editar cuenta', f, { onOk: () => { const d = f.read(); if (!d.nombre.trim()) { U.toast('Poné un nombre.'); return false; } A.guardarCuenta(r.id, d); U.toast('Cuenta actualizada.'); App.render(); } });
          });
          w.append(up, ed); return w;
        } },
    ], rows));
    wrap.append(cT);

    function abrirSaldo(r) {
      const f = U.form([
        { k: 'saldo', label: 'Nuevo saldo (' + r.moneda + ')', type: 'number', value: F.nf.format(q.saldoActual(r.id)) },
        { k: 'fecha', label: 'Fecha', type: 'date', value: F.hoyISO() },
      ]);
      U.modal('Actualizar saldo — ' + r.nombre, f, { okText: 'Guardar saldo', onOk: () => {
        const d = f.read(); A.actualizarSaldo(r.id, F.parseMonto(d.saldo), d.fecha); U.toast('Saldo actualizado.'); App.render();
      } });
    }

    return wrap;
  };
})(window.App = window.App || {});
