(function (App) {
  const U = App.ui, q = App.q, F = App.fmt;

  App.screens.presupuesto = async function () {
    const p = await App.periodoView();
    const wrap = U.el('section', 'screen');
    wrap.append(U.head('Presupuesto de efectivo',
      'Control de billeteras de efectivo. Asigna monto y monitorea gasto'));

    try {
      const presupuestos = await q.presupuestoEfectivo(p.id);
      const card = U.card('Billeteras de efectivo', presupuestos.length + ' billeteras');

      if (presupuestos.length === 0) {
        card.append(U.el('p', 'empty', 'No hay presupuestos de efectivo para este período.'));
      } else {
        const cols = [
          { h: 'Billetera', get: (r) => `<span class="t-name">${r.cuenta_nombre}</span>` },
          { h: 'Moneda', k: 'moneda' },
          { h: 'Presupuestado', num: true, get: (r) => F.money(r.monto_presupuestado) },
          { h: 'Gastado', num: true, get: (r) => F.money(r.monto_gastado) },
        ];
        card.append(U.table(cols, presupuestos));
      }

      wrap.append(card);

      const info = U.card('Próximamente');
      info.innerHTML += '<p style="color:var(--c-text-muted);font-size:12px">Podrás asignar montos a cada billetera, registrar gastos y ver el progreso con semáforo (verde/amarillo/rojo).</p>';
      wrap.append(info);

    } catch (err) {
      console.error(err);
      const card = U.card('Error');
      card.innerHTML = `<p style="color:red">Error al cargar presupuesto: ${err.message}</p>`;
      wrap.append(card);
    }

    return wrap;
  };
})(window.App = window.App || {});
