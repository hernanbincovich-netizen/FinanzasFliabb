(function (App) {
  const U = App.ui, q = App.q, calc = App.calc, F = App.fmt, A = App.acciones;

  App.screens.cotizaciones = function () {
    const wrap = U.el('section', 'screen');
    wrap.append(U.head('Cotizaciones',
      'Un único lugar para cargar el valor del dólar y del Bitcoin. Todo el sistema (cuentas, metas, dashboard) toma estos valores para convertir a pesos.'));

    const usd = q.cotizacionVigente('USD_ARS');
    const btc = q.cotizacionVigente('BTC_USD');

    // --- dólar
    const cUsd = U.card('Dólar', usd ? 'último: ' + usd.fecha : 'sin cargar');
    const fUsd = U.form([
      { k: 'valor', label: '1 USD en ARS', type: 'number', value: usd ? F.nf.format(usd.valor) : '', half: true },
      { k: 'fecha', label: 'Fecha del valor', type: 'date', value: F.hoyISO(), half: true },
    ]);
    const bUsd = U.el('button', 'btn', 'Guardar cotización'); bUsd.type = 'button';
    bUsd.addEventListener('click', () => {
      const d = fUsd.read();
      const v = F.parseMonto(d.valor);
      if (v <= 0) return U.toast('Ingresá un valor válido.');
      A.setCotizacion('USD_ARS', v, d.fecha); U.toast('Cotización del dólar guardada.'); App.render();
    });
    fUsd.append(bUsd); cUsd.append(fUsd);

    // --- bitcoin
    const cBtc = U.card('Bitcoin', btc ? 'último: ' + btc.fecha : 'sin cargar');
    const fBtc = U.form([
      { k: 'valor', label: '1 BTC en USD', type: 'number', value: btc ? F.nf.format(btc.valor) : '', half: true },
      { k: 'fecha', label: 'Fecha del valor', type: 'date', value: F.hoyISO(), half: true },
      { k: 'derivado', label: '1 BTC en ARS (derivado)', type: 'text', value: F.nf.format(Math.round(calc.btcArs())), disabled: true },
    ]);
    const bBtc = U.el('button', 'btn', 'Guardar cotización'); bBtc.type = 'button';
    bBtc.addEventListener('click', () => {
      const d = fBtc.read();
      const v = F.parseMonto(d.valor);
      if (v <= 0) return U.toast('Ingresá un valor válido.');
      A.setCotizacion('BTC_USD', v, d.fecha); U.toast('Cotización del Bitcoin guardada.'); App.render();
    });
    fBtc.append(bBtc); cBtc.append(fBtc);

    wrap.append(U.grid(2, [cUsd, cBtc]));

    // --- cómo se aplica
    const filas = [];
    q.cuentas(true).filter((c) => c.moneda !== 'ARS').forEach((c) => {
      filas.push({ item: c.nombre, origen: 'Saldo de cuenta', v: q.saldoActual(c.id), mon: c.moneda });
    });
    q.metas().filter((m) => m.moneda !== 'ARS').forEach((m) => {
      filas.push({ item: 'Meta · ' + m.nombre, origen: 'Acumulado', v: calc.metaAcum(m), mon: m.moneda });
    });
    const cAp = U.card('Cómo se está aplicando ahora', 'saldos y metas en otra moneda, convertidos con estos valores');
    cAp.append(filas.length ? U.table(
      [{ h: 'Ítem', get: (r) => `<span class="t-name">${r.item}</span>` },
       { h: 'Origen', get: (r) => `<span class="t-sub">${r.origen}</span>` },
       { h: 'Monto', num: true, get: (r) => F.money(r.v, r.mon) },
       { h: 'Tipo de cambio', num: true, get: (r) => '× ' + F.nf.format(r.mon === 'USD' ? calc.usdArs() : Math.round(calc.btcArs())) },
       { h: 'Equivalente ARS', num: true, get: (r) => F.money(calc.aArs(r.v, r.mon)) }],
      filas
    ) : U.el('p', 'empty', 'No hay cuentas ni metas en otra moneda.'));
    wrap.append(cAp);

    // --- historial
    const hist = q.cotizaciones('USD_ARS').slice(0, 6).map((r) => ({ ...r, tipo: 'Dólar (USD→ARS)' }))
      .concat(q.cotizaciones('BTC_USD').slice(0, 6).map((r) => ({ ...r, tipo: 'Bitcoin (BTC→USD)' })))
      .sort((a, b) => (b.fecha < a.fecha ? -1 : 1));
    if (hist.length) {
      const cH = U.card('Historial de cotizaciones', '');
      cH.append(U.table(
        [{ h: 'Par', k: 'tipo' }, { h: 'Fecha', get: (r) => `<span class="t-sub">${r.fecha}</span>` }, { h: 'Valor', num: true, get: (r) => F.nf.format(r.valor) }],
        hist.slice(0, 10)
      ));
      wrap.append(cH);
    }
    return wrap;
  };
})(window.App = window.App || {});
