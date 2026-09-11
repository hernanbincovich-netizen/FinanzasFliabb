(function (App) {
  const U = App.ui, q = App.q, calc = App.calc, F = App.fmt, A = App.acciones;

  App.screens.mescurso = function () {
    const wrap = U.el('section', 'screen');
    const p = App.periodoView();

    wrap.append(U.head('Mes en curso — ' + F.periodoLargo(p),
      p.estado === 'inexistente'
        ? 'Este mes todavía no existe.'
        : p.estado === 'abierto'
          ? 'Marcá cada concepto como pagado o pendiente. Cuando termine el mes, cerralo. Con ‹ › (arriba) te movés a cualquier mes; si no existe, lo podés crear acá.'
          : 'Período cerrado (solo lectura). Podés reabrirlo para corregir algo.'));

    if (p.estado === 'inexistente') {
      wrap.append(U.crearPeriodoCard(p, 'Creá el período para empezar a cargar sus ingresos y gastos, marcar pagos y cerrarlo como cualquier otro mes.'));
      // igual mostramos el navegador de períodos existentes
      wrap.append(selectorCard(p));
      return wrap;
    }

    const editable = p.estado === 'abierto';
    const movs = q.movimientos(p.id);
    const gastos = movs.filter((m) => m.tipo === 'gasto');
    // mes cerrado sin detalle de movimientos: usar el total congelado
    const totG = (!movs.length && p.estado === 'cerrado' && p.gastos_mes != null)
      ? p.gastos_mes
      : gastos.reduce((a, m) => a + calc.aArs(m.monto, m.moneda), 0);
    const pagG = gastos.filter((m) => m.estado === 'pagado').reduce((a, m) => a + calc.aArs(m.monto, m.moneda), 0);
    const pendCount = gastos.filter((m) => m.estado !== 'pagado').length;

    wrap.append(U.grid(4, [
      U.statCard('Período', F.periodoCorto(p), p.estado === 'abierto' ? 'mes abierto' : 'cerrado ' + (p.fecha_cierre || '')),
      U.statCard('Gastos del mes', F.money(totG)),
      U.statCard('Pagado', F.money(pagG), totG ? Math.round(pagG / totG * 100) + '% del mes' : '', 'up'),
      U.statCard('Pendiente', F.money(totG - pagG), pendCount + ' conceptos', 'down'),
    ]));

    const c = U.el('div', 'card');
    const bar = U.el('div', 'toolbar');
    bar.append(selectorInline(p));

    const acts = U.el('div', 'inline');
    if (editable) {
      // traer recurrentes que falten
      const recFaltan = q.conceptos(true).filter((x) => x.es_recurrente).filter((x) => !movs.some((m) => m.concepto_id === x.id)).length;
      if (recFaltan) {
        const tr = U.el('button', 'btn ghost sm', 'Traer recurrentes (' + recFaltan + ')');
        tr.addEventListener('click', () => {
          const n = A.traerRecurrentes(p.id);
          U.toast(n ? n + ' conceptos agregados.' : 'No había recurrentes para traer.'); App.render();
        });
        acts.append(tr);
      }
      // eliminar período vacío
      if (!movs.length) {
        const del = U.el('button', 'btn ghost sm', 'Eliminar período');
        del.addEventListener('click', () => U.confirmar('Eliminar el período ' + F.periodoLargo(p) + ' (está vacío). ¿Seguir?', () => {
          try { A.eliminarPeriodo(p.id); U.toast('Período eliminado.'); App.go('mescurso'); } catch (e) { U.toast(e.message); }
        }, 'Eliminar'));
        acts.append(del);
      }
      const ult = q.periodos().slice(-1)[0];
      const esUltimo = ult && ult.id === p.id;
      const cerrar = U.el('button', 'btn', esUltimo ? 'Cerrar ' + F.periodoCorto(p) + ' y abrir el siguiente' : 'Cerrar ' + F.periodoCorto(p));
      cerrar.addEventListener('click', () => {
        U.confirmar(
          `Al cerrar ${F.periodoLargo(p)} se congela su ahorro. ` +
          (esUltimo ? 'Los conceptos recurrentes se copian al mes siguiente en estado pendiente (los puntuales no) y se copian las asignaciones de efectivo. ' : '') +
          '¿Confirmás?',
          () => { try { A.cerrarMes(); U.toast('Mes cerrado.'); App.go('mescurso'); } catch (e) { U.toast(e.message); } },
          'Cerrar mes'
        );
      });
      acts.append(cerrar);
    } else {
      const rb = U.el('button', 'btn ghost', 'Reabrir ' + F.periodoCorto(p));
      rb.addEventListener('click', () => U.confirmar('Reabrir ' + F.periodoLargo(p) + ' para editarlo. ¿Seguir?', () => {
        A.reabrirMes(p.id); U.toast('Mes reabierto.'); App.render();
      }, 'Reabrir'));
      acts.append(rb);
    }
    bar.append(acts);
    c.append(bar);

    if (!movs.length) {
      c.append(U.el('p', 'empty', 'Sin conceptos en este mes. Cargalos en “Carga”' + (editable ? ' o traé los recurrentes con el botón de arriba.' : '.')));
    } else {
      c.append(U.table([
        { h: 'Concepto', get: (r) => `<span class="t-name">${r.concepto}</span>` },
        { h: 'Tipo', get: (r) => `<span class="badge ${r.tipo === 'ingreso' ? 'good' : 'grey'}">${r.tipo}</span>` },
        { h: 'Categoría', get: (r) => r.categoria || '—' },
        { h: 'Cuenta', get: (r) => r.cuenta_nombre || '—' },
        { h: 'Recurrente', get: (r) => (r.es_recurrente ? `<span class="ico" title="Recurrente">${U.IC.rec}</span>` : '<span class="t-sub">puntual</span>') },
        { h: 'Vence', get: (r) => r.tipo === 'gasto' ? `<span class="t-sub">${F.fechaCorta(r.fecha_vencimiento)}</span>` : '' },
        { h: 'Período', get: () => `<span class="t-sub">${F.periodoCorto(p)}</span>` },
        { h: 'Monto', num: true, get: (r) => F.money(r.monto, r.moneda) },
        { h: 'Estado', get: (r) => {
            if (!editable) return `<span class="badge ${r.estado === 'pagado' ? 'good' : 'warn'} dot">${r.estado}</span>`;
            const b = U.el('button', 'badge dot ' + (r.estado === 'pagado' ? 'good' : 'warn'), r.estado);
            b.addEventListener('click', () => { A.setEstadoMovimiento(r.id, r.estado === 'pagado' ? 'pendiente' : 'pagado'); App.render(); });
            return b;
          } },
      ], movs));
    }
    wrap.append(c);
    return wrap;
  };

  function selectorInline(p) {
    const sel = U.el('select', 'period-sel');
    q.periodos().slice().reverse().forEach((pp) => {
      const o = U.el('option'); o.value = pp.id;
      o.textContent = F.periodoLargo(pp) + (pp.estado === 'abierto' ? ' — abierto' : ' — cerrado');
      if (pp.id === p.id) o.selected = true;
      sel.append(o);
    });
    sel.addEventListener('change', () => { const pp = q.periodo(+sel.value); if (pp) App.verPeriodo(pp.anio, pp.mes); });
    const w = U.el('div', 'inline'); w.append(U.el('span', 't-sub', 'Ir a: '), sel);
    return w;
  }
  function selectorCard(p) {
    const c = U.card('Meses ya creados');
    c.append(selectorInline(p));
    return c;
  }
})(window.App = window.App || {});
