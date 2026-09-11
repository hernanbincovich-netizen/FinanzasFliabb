(function (App) {
  const U = App.ui, q = App.q, calc = App.calc, F = App.fmt, A = App.acciones;

  App.screens.presupuesto = function () {
    const wrap = U.el('section', 'screen');
    const p = App.periodoView();
    const pct = calc.pctEfectivo();

    wrap.append(U.head('Presupuesto de efectivo',
      `El gasto en efectivo del hogar entre los dos debería rondar el ${(pct * 100).toFixed(0)}% de los ingresos de ${F.periodoLargo(p)}. ` +
      'Cada billetera se controla con un semáforo. El gasto se deduce del saldo que cargás en “Cuentas y perfiles”.'));

    if (p.estado === 'inexistente') { wrap.append(U.crearPeriodoCard(p)); return wrap; }
    const cerrado = p.estado === 'cerrado';
    const ing = calc.ingresos(p.id);
    const objetivo = calc.objetivoEfectivo(p.id);

    // billeteras de efectivo del período + asignaciones
    const wallets = q.cuentas(true).filter((c) => c.tipo === 'billetera_efectivo');
    const asign = {}; q.presupuestoEfectivo(p.id).forEach((x) => (asign[x.cuenta_id] = x.asignado));
    const asignadoTot = wallets.reduce((a, w) => a + (asign[w.id] || 0), 0);
    const gastadoTot = wallets.reduce((a, w) => a + calc.gastadoEfectivo(w.id, p.id, asign[w.id] || 0), 0);

    wrap.append(U.grid(3, [
      U.statCard('Objetivo (' + (pct * 100).toFixed(0) + '% de ingresos)', F.money(objetivo), 'sobre ' + F.money(ing) + ' de ingresos'),
      U.statCard('Asignado a las billeteras', F.money(asignadoTot), ing ? (asignadoTot / ing * 100).toFixed(1).replace('.', ',') + '% de los ingresos' : ''),
      U.statCard('Gastado a la fecha', F.money(gastadoTot), asignadoTot ? Math.round(gastadoTot / asignadoTot * 100) + '% de lo asignado' : '', gastadoTot > asignadoTot ? 'down' : ''),
    ]));

    const c = U.card('Billeteras de efectivo', 'semáforo: verde hasta 70% · amarillo 70–90% · rojo +90%');
    if (!wallets.length) {
      c.append(U.el('p', 'empty', 'No hay cuentas de tipo “billetera de efectivo”. Creá una en Cuentas y perfiles.'));
    }
    const box = U.el('div', 'meter-list');
    wallets.forEach((w) => {
      const a = asign[w.id] || 0;
      const saldoP = q.saldoPeriodo(w.id, p.id);
      const gastado = calc.gastadoEfectivo(w.id, p.id, a);
      const pc = a ? gastado / a * 100 : 0;
      const st = U.semaforo(pc);
      const row = U.el('div', 'meter-row');
      row.append(U.el('div', 'ln',
        `<span>${U.lights(st)} <strong>${w.nombre}</strong> <span class="badge ${st} dot">${a ? Math.round(pc) + '%' : 'sin asignar'}</span></span>` +
        `<span class="r">${a ? `gastó ${F.money(gastado)} de ${F.money(a)}` : F.money(0) + ' asignado'}</span>`));
      row.append(U.meter(pc, st));
      const foot = U.el('div', 'meter-foot');
      foot.innerHTML = `<span class="t-sub">Saldo de la billetera en ${F.periodoCorto(p)}: ${saldoP == null ? '<em>sin cargar</em>' : `<span class="num">${F.money(saldoP)}</span>`}</span>`;
      const bSaldo = U.el('button', 'link-btn', 'Actualizar saldo');
      const bAsig = U.el('button', 'link-btn', a ? 'Editar asignado' : 'Asignar monto');
      bSaldo.addEventListener('click', () => {
        const f = U.form([
          { k: 'saldo', label: 'Saldo actual de ' + w.nombre + ' (ARS)', type: 'number', value: saldoP == null ? '' : F.nf.format(saldoP) },
          { k: 'fecha', label: 'Fecha', type: 'date', value: F.hoyISO() },
        ]);
        U.modal('Actualizar saldo — ' + w.nombre, f, { okText: 'Guardar', onOk: () => { const d = f.read(); A.actualizarSaldo(w.id, F.parseMonto(d.saldo), d.fecha); U.toast('Saldo actualizado.'); App.render(); } });
      });
      bAsig.addEventListener('click', () => {
        const f = U.form([{ k: 'asig', label: 'Monto asignado a ' + w.nombre + ' este mes (ARS)', type: 'number', value: a ? F.nf.format(a) : '' }]);
        U.modal('Asignación de efectivo — ' + w.nombre, f, { okText: 'Guardar', onOk: () => { const d = f.read(); A.guardarAsignadoEfectivo(p.id, w.id, F.parseMonto(d.asig)); U.toast('Asignación guardada.'); App.render(); } });
      });
      if (!cerrado) foot.append(bSaldo, bAsig);
      row.append(foot);
      box.append(row);
    });
    c.append(box);
    c.append(U.el('p', 'note', `${U.IC.info}<span>Gastado = <span class="num">asignado − saldo actual</span>. Cuando actualizás el saldo de la billetera, el semáforo se mueve solo.</span>`));
    wrap.append(c);
    return wrap;
  };
})(window.App = window.App || {});
