(function (App) {
  const U = App.ui, q = App.q, F = App.fmt;

  App.screens.mescurso = async function () {
    const wrap = U.el('section', 'screen');
    wrap.append(U.head('Mes en curso',
      'Seguimiento de pagos y cierre de mes'));

    try {
      const periodos = await q.periodos();
      const card = U.card('Períodos', periodos.length + ' períodos');

      if (periodos.length === 0) {
        card.append(U.el('p', 'empty', 'No hay períodos creados'));
      } else {
        const cols = [
          { h: 'Período', get: (r) => `${r.anio}-${String(r.mes).padStart(2, '0')}` },
          { h: 'Estado', get: (r) => r.estado || 'abierto' },
          { h: 'Fecha cierre', get: (r) => r.fecha_cierre || '—' }
        ];
        card.append(U.table(cols, periodos.slice(0, 12)));
      }

      wrap.append(card);

      const info = U.card('Próximamente');
      info.innerHTML += '<p style="color:var(--c-text-muted);font-size:12px">Podrás marcar pagos, cerrar mes, traer recurrentes automáticamente y ver análisis del mes.</p>';
      wrap.append(info);

    } catch (err) {
      console.error(err);
      const card = U.card('Error');
      card.innerHTML = `<p style="color:red">Error al cargar mes en curso: ${err.message}</p>`;
      wrap.append(card);
    }

    return wrap;
  };
})(window.App = window.App || {});
