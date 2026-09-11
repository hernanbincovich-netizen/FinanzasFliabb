(function (App) {
  const U = App.ui, q = App.q, F = App.fmt;

  App.screens.cotizaciones = async function () {
    const wrap = U.el('section', 'screen');
    wrap.append(U.head('Cotizaciones',
      'Dólar y Bitcoin. Carga los valores para que el sistema calcule equivalentes'));

    try {
      const cotizaciones = await q.cotizaciones();
      const card = U.card('Cotizaciones', cotizaciones.length + ' registros');

      if (cotizaciones.length === 0) {
        card.append(U.el('p', 'empty', 'No hay cotizaciones registradas'));
      } else {
        const cols = [
          { h: 'Par', k: 'par' },
          { h: 'Valor', num: true, get: (r) => F.nf.format(r.valor) },
          { h: 'Fecha', k: 'fecha' }
        ];
        card.append(U.table(cols, cotizaciones.slice(0, 20)));
      }

      wrap.append(card);

      const info = U.card('Próximamente');
      info.innerHTML += '<p style="color:var(--c-text-muted);font-size:12px">Podrás agregar cotizaciones USD/ARS y BTC/USD para que el sistema calcule automáticamente los equivalentes en otras monedas.</p>';
      wrap.append(info);

    } catch (err) {
      console.error(err);
      const card = U.card('Error');
      card.innerHTML = `<p style="color:red">Error al cargar cotizaciones: ${err.message}</p>`;
      wrap.append(card);
    }

    return wrap;
  };
})(window.App = window.App || {});
