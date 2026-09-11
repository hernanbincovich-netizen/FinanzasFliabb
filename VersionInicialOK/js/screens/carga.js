(function (App) {
  const U = App.ui, q = App.q, calc = App.calc, F = App.fmt, A = App.acciones;
  const MON = ['ARS', 'USD', 'BTC'];

  App.screens.carga = function () {
    const wrap = U.el('section', 'screen');
    const p = App.periodoView();
    wrap.append(U.head('Carga de gasto / ingreso',
      `Alta y edición de conceptos de ${F.periodoLargo(p)}. Se carga un total por concepto, no transacción por transacción. El seguimiento de pagos y el cierre de mes están en “Mes en curso”.`));

    if (p.estado === 'inexistente') {
      wrap.append(U.crearPeriodoCard(p, 'Para cargar conceptos de este mes, creá primero el período.'));
      return wrap;
    }
    const cerrado = p.estado === 'cerrado';

    const cats = q.categorias();
    const cuentas = q.cuentas(true);
    const ints = q.integrantes();

    // --- formulario nuevo concepto
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
      { k: 'estado', label: 'Estado', type: 'select', opts: [{ v: 'pendiente', t: 'Pendiente' }, { v: 'pagado', t: 'Pagado' }], half: true },
      { k: 'fecha_vencimiento', label: 'Fecha de vencimiento (opcional)', type: 'date', half: true },
      { k: 'es_agrupado', label: 'Es agrupado (engloba varios gastos, sin desglose)', type: 'check' },
      { k: 'es_recurrente', label: 'Es recurrente (se pre-carga cada mes)', type: 'check', value: true },
    ]);
    f.insertBefore(tg, f.firstChild);
    const campoVenc = f.querySelector('[data-k="fecha_vencimiento"]').closest('.field');
    campoVenc.hidden = tipo !== 'gasto';
    bi.addEventListener('click', () => { campoVenc.hidden = true; });
    bg.addEventListener('click', () => { campoVenc.hidden = false; });

    // ＋ nueva categoría, sin perder lo que ya se completó en el formulario
    const selCat = f.querySelector('[data-k="categoria_id"]');
    const btnNuevaCat = U.el('button', 'link-btn', '＋ Nueva categoría');
    btnNuevaCat.addEventListener('click', () => {
      const fc = U.form([{ k: 'nombre', label: 'Nombre de la categoría', placeholder: 'Ej. Mascotas' }]);
      U.modal('Nueva categoría de ' + (tipo === 'ingreso' ? 'ingreso' : 'gasto'), fc, {
        okText: 'Crear categoría',
        onOk: () => {
          const d = fc.read();
          const nombre = (d.nombre || '').trim();
          if (!nombre) { U.toast('Poné un nombre.'); return false; }
          let id;
          try { id = A.crearCategoria(nombre, tipo); }
          catch (e) { U.toast(e.message); return false; }
          const op = document.createElement('option'); op.value = id; op.textContent = nombre;
          selCat.appendChild(op); selCat.value = id;
          U.toast('Categoría “' + nombre + '” creada.');
        },
      });
    });
    selCat.closest('.field').append(btnNuevaCat);
    const bar = U.el('div', 'form-actions');
    const save = U.el('button', 'btn', 'Guardar concepto'); save.type = 'button';
    const clr = U.el('button', 'btn ghost', 'Limpiar'); clr.type = 'button';
    save.addEventListener('click', () => {
      const d = f.read();
      if (!d.nombre || !d.nombre.trim()) return U.toast('Poné un nombre.');
      A.crearConcepto({
        nombre: d.nombre.trim(), tipo,
        monto: F.parseMonto(d.monto), moneda: d.moneda,
        categoria_id: d.categoria_id || null, cuenta_id: d.cuenta_id || null, integrante_id: d.integrante_id || null,
        es_agrupado: d.es_agrupado, es_recurrente: d.es_recurrente, estado: d.estado,
        fecha_vencimiento: d.fecha_vencimiento || null,
      });
      U.toast('Concepto agregado a ' + F.periodoCorto(p) + '.'); App.render();
    });
    clr.addEventListener('click', () => App.render());
    bar.append(save, clr); f.append(bar);
    f.append(U.el('p', 'note', `${U.IC.info}<span>“Agrupado” es para conceptos como <strong>Tarjeta</strong>, que engloban varios gastos reales en un único total, sin desglose interno.</span>`));
    fCard.append(f);

    // --- listado del mes
    const movs = q.movimientos(p.id);
    const lCard = U.card('Conceptos cargados este mes', movs.length + ' conceptos');
    const cols = [
      { h: 'Concepto', get: (r) => `<span class="t-name">${r.concepto}</span><div class="t-sub">${r.categoria || 'Sin categoría'} · ${r.cuenta_nombre || 'sin cuenta'}</div>` },
      { h: 'Tipo', get: (r) => `<span class="badge ${r.tipo === 'ingreso' ? 'good' : 'grey'}">${r.tipo}</span>` },
      { h: '', get: (r) => `<span class="chips">${r.es_recurrente ? `<span class="ico" title="Recurrente">${U.IC.rec}</span>` : ''}${r.es_agrupado ? `<span class="ico" title="Agrupado">${U.IC.grp}</span>` : ''}</span>` },
      { h: 'Vence', get: (r) => r.tipo === 'gasto' ? `<span class="t-sub">${F.fechaCorta(r.fecha_vencimiento)}</span>` : '' },
      { h: 'Monto', num: true, get: (r) => F.money(r.monto, r.moneda) },
    ];
    if (!cerrado) cols.push({ h: '', num: true, get: (r) => {
      const w = U.el('span', 'rowacts');
      const ed = U.el('button', 'link-btn', 'Editar');
      const de = U.el('button', 'link-btn', 'Borrar');
      ed.addEventListener('click', () => abrirEdit(r));
      de.addEventListener('click', () => U.confirmar('¿Borrar “' + r.concepto + '” de este mes?', () => {
        A.borrarMovimiento(r.id, !r.es_recurrente); U.toast('Concepto borrado.'); App.render();
      }, 'Borrar'));
      w.append(ed, de); return w;
    } });
    lCard.append(U.table(cols, movs));

    if (cerrado) {
      const info = U.card('Mes cerrado');
      info.append(U.el('p', 'empty', `${F.periodoLargo(p)} está cerrado: los conceptos son de solo lectura. Reabrilo si necesitás corregir algo.`));
      const rb = U.el('button', 'btn ghost', 'Reabrir ' + F.periodoCorto(p));
      rb.addEventListener('click', () => U.confirmar('Reabrir ' + F.periodoLargo(p) + ' para editarlo. Vas a poder volver a cerrarlo después. ¿Seguir?', () => {
        A.reabrirMes(p.id); U.toast('Mes reabierto.'); App.render();
      }, 'Reabrir'));
      info.append(rb);
      wrap.append(U.grid(2, [info, lCard]));
    } else {
      wrap.append(U.grid(2, [fCard, lCard]));
    }

    function abrirEdit(r) {
      const campos = [
        { k: 'monto', label: 'Monto', type: 'number', value: F.nf.format(r.monto), half: true },
        { k: 'moneda', label: 'Moneda', type: 'select', value: r.moneda, opts: MON, half: true },
        { k: 'estado', label: 'Estado', type: 'select', value: r.estado, opts: [{ v: 'pendiente', t: 'Pendiente' }, { v: 'pagado', t: 'Pagado' }], half: true },
        { k: 'cuenta_id', label: 'Cuenta', type: 'select', value: r.cuenta_id || '', opts: [{ v: '', t: 'la del concepto' }].concat(cuentas.map((c) => ({ v: c.id, t: c.nombre }))), half: true },
        { k: 'categoria_id', label: 'Categoría', type: 'select', value: r.categoria_id || '', opts: [{ v: '', t: '— sin categoría —' }].concat(cats.map((c) => ({ v: c.id, t: c.nombre }))), half: true },
      ];
      if (r.tipo === 'gasto') campos.push({ k: 'fecha_vencimiento', label: 'Fecha de vencimiento (opcional)', type: 'date', value: r.fecha_vencimiento || '', half: true });
      campos.push({ k: 'nota', label: 'Nota', value: r.nota || '' });
      const f2 = U.form(campos);
      const selCatEdit = f2.querySelector('[data-k="categoria_id"]');
      const btnNuevaCatEdit = U.el('button', 'link-btn', '＋ Nueva categoría');
      btnNuevaCatEdit.addEventListener('click', () => {
        const fc = U.form([{ k: 'nombre', label: 'Nombre de la categoría', placeholder: 'Ej. Mascotas' }]);
        U.modal('Nueva categoría de ' + (r.tipo === 'ingreso' ? 'ingreso' : 'gasto'), fc, {
          okText: 'Crear categoría',
          onOk: () => {
            const dc = fc.read();
            const nombre = (dc.nombre || '').trim();
            if (!nombre) { U.toast('Poné un nombre.'); return false; }
            let id;
            try { id = A.crearCategoria(nombre, r.tipo); }
            catch (e) { U.toast(e.message); return false; }
            const op = document.createElement('option'); op.value = id; op.textContent = nombre;
            selCatEdit.appendChild(op); selCatEdit.value = id;
            U.toast('Categoría “' + nombre + '” creada.');
          },
        });
      });
      selCatEdit.closest('.field').append(btnNuevaCatEdit);
      U.modal('Editar — ' + r.concepto, f2, { onOk: () => {
        const d = f2.read();
        A.actualizarMovimiento(r.id, {
          monto: F.parseMonto(d.monto), moneda: d.moneda, estado: d.estado, cuenta_id: d.cuenta_id || null, nota: d.nota,
          fecha_vencimiento: r.tipo === 'gasto' ? (d.fecha_vencimiento || null) : null,
          concepto_id: r.concepto_id, categoria_id: d.categoria_id || null,
        });
        U.toast('Concepto actualizado.'); App.render();
      } });
    }

    return wrap;
  };
})(window.App = window.App || {});
