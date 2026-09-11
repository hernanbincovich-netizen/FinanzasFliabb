(function (App) {
  const U = App.ui, q = App.q, F = App.fmt;

  App.screens.metas = async function () {
    const wrap = U.el('section', 'screen');
    wrap.append(U.head('Metas de ahorro',
      'Objetivos financieros con fecha de inicio y objetivo'));

    try {
      const metas = await q.metas();
      const card = U.card('Metas', metas.length + ' metas');

      if (metas.length === 0) {
        card.append(U.el('p', 'empty', 'No hay metas creadas. Crea la primera.'));
      } else {
        const cols = [
          { h: 'Meta', get: (r) => `<span class="t-name">${r.nombre}</span>` },
          { h: 'Objetivo', num: true, get: (r) => F.money(r.monto_objetivo, r.moneda) },
          { h: 'Acumulado', num: true, get: (r) => F.money(r.monto_inicial, r.moneda) },
          { h: 'Fecha', k: 'fecha_objetivo' },
          { h: 'Estado', get: (r) => r.estado || 'activa' }
        ];
        card.append(U.table(cols, metas));
      }

      wrap.append(card);

      const info = U.card('Próximamente');
      info.innerHTML += '<p style="color:var(--c-text-muted);font-size:12px">Podrás crear metas, registrar aportes y ver el progreso hacia cada objetivo.</p>';
      wrap.append(info);

    } catch (err) {
      console.error(err);
      const card = U.card('Error');
      card.innerHTML = `<p style="color:red">Error al cargar metas: ${err.message}</p>`;
      wrap.append(card);
    }

    return wrap;
  };
})(window.App = window.App || {});
