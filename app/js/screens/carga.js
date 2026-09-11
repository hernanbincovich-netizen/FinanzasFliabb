(function (App) {
  const U = App.ui, q = App.q, F = App.fmt;
  const MON = ['ARS', 'USD', 'BTC'];

  App.screens.carga = async function () {
    const p = await App.periodoView();
    const wrap = U.el('section', 'screen');
    wrap.append(U.head('Carga de gasto / ingreso',
      `Alta y edición de conceptos de ${F.periodoLargo(p)}. Se carga un total por concepto, no transacción por transacción.`));

    if (p.estado === 'inexistente') {
      wrap.append(U.crearPeriodoCard(p, 'Para cargar conceptos de este mes, creá primero el período.'));
      return wrap;
    }

    try {
      const cats = await q.categorias();
      const cuentas = await q.cuentas(true);
      const ints = await q.integrantes();

      // Formulario nuevo concepto
      const fCard = U.card('Nuevo concepto — ' + F.periodoLargo(p));
      let tipo = 'gasto';
      const tg = U.el('div', 'field');
      tg.innerHTML = '<label>Tipo</label>';
      const tgl = U.el('div', 'toggle2');
      const bi = U.el('button', '', 'Ingreso'); bi.type = 'button';
      const bg = U.el('button', '', 'Gasto'); bg.type = 'button'; bg.setAttribute('aria-pressed', 'true');
      bi.addEventListener('click', () => { tipo = 'ingreso'; bi.setAttribute('aria-pressed', 'true'); bg.removeAttribute('aria-pressed'); });
      bg.addEventListener('click', () => { tipo = 'gasto'; bg.setAttribute('aria-pressed', 'true'); bi.removeAttribute('aria-pressed'); });
      tgl.append(bi, bg); tg.append(tgl);

      const f = U.form([
        { k: 'nombre', label: 'Nombre del concepto', placeholder: 'Ej. Gimnasio' },
        { k: 'monto', label: 'Monto del mes', type: 'number', placeholder: '45.000', half: true },
        { k: 'moneda', label: 'Moneda', type: 'select', opts: MON, half: true },
        { k: 'categoria_id', label: 'Categoría', type: 'select', opts: [{ v: '', t: '— sin categoría —' }].concat(cats.map((c) => ({ v: c.id, t: c.nombre }))), half: true },
        { k: 'cuenta_id', label: 'Cuenta / medio de pago', type: 'select', opts: [{ v: '', t: '— ninguna —' }].concat(cuentas.map((c) => ({ v: c.id, t: c.nombre }))), half: true },
        { k: 'integrante_id', label: 'Integrante (informativo)', type: 'select', opts: [{ v: '', t: 'Compartido' }].concat(ints.map((i) => ({ v: i.id, t: i.nombre }))), half: true },
        { k: 'es_agrupado', label: 'Es agrupado (engloba varios gastos)', type: 'check' },
        { k: 'es_recurrente', label: 'Es recurrente (se pre-carga cada mes)', type: 'check', value: true },
      ]);
      f.insertBefore(tg, f.firstChild);

      const btnGuardar = U.el('button', 'btn', 'Guardar concepto');
      btnGuardar.type = 'button';
      btnGuardar.addEventListener('click', async () => {
        const data = f.read();
        if (!data.nombre || !data.nombre.trim()) {
          U.toast('Ingresá un nombre.');
          return;
        }
        try {
          const newConcepto = await App.api.createConcepto({
            nombre: data.nombre.trim(),
            tipo,
            categoria_id: data.categoria_id || null,
            cuenta_id: data.cuenta_id || null,
            integrante_id: data.integrante_id || null,
            moneda: data.moneda || 'ARS',
            es_agrupado: data.es_agrupado ? 1 : 0,
            es_recurrente: data.es_recurrente ? 1 : 0,
          });

          // Crear movimiento automáticamente
          if (newConcepto.id && p.id && data.monto) {
            await App.api.createMovimiento({
              periodo_id: p.id,
              concepto_id: newConcepto.id,
              monto: parseFloat(data.monto) || 0,
              moneda: data.moneda || 'ARS',
              estado: 'pagado',
              cuenta_id: data.cuenta_id || null,
            });
          }

          U.toast('Concepto y movimiento creados.');
          f.reset();
          q.invalidatePeriodoMovimientos();
          await App.render();
        } catch (err) {
          U.toast('Error: ' + err.message);
        }
      });

      f.append(btnGuardar);
      fCard.append(f);
      wrap.append(fCard);

      // Listar movimientos del período
      const movimientos = await q.movimientos(p.id);
      const mCard = U.card('Movimientos cargados', movimientos.length + ' movimientos');
      if (movimientos.length === 0) {
        mCard.append(U.el('p', 'empty', 'No hay movimientos cargados en este período.'));
      } else {
        const cols = [
          { h: 'Concepto', get: (r) => `<span class="t-name">${r.concepto}</span>` },
          { h: 'Tipo', get: (r) => r.tipo === 'ingreso' ? '+ Ingreso' : '- Gasto' },
          { h: 'Monto', num: true, get: (r) => F.money(r.monto, r.moneda) },
          { h: 'Estado', k: 'estado' },
          { h: 'Categoría', get: (r) => r.categoria || '—' },
        ];
        mCard.append(U.table(cols, movimientos));
      }
      wrap.append(mCard);
    } catch (err) {
      console.error('Error en carga:', err);
      wrap.append(U.card('Error', `Error al cargar: ${err.message}`));
    }

    return wrap;
  };
})(window.App = window.App || {});
