(function (App) {
  const U = App.ui, q = App.q, F = App.fmt;

  App.screens.cuentas = async function () {
    const wrap = U.el('section', 'screen');
    wrap.append(U.head('Cuentas y perfiles',
      'Tus cuentas bancarias, billeteras y perfiles de titular'));

    try {
      const cuentas = await q.cuentas(false);
      const card = U.card('Cuentas', cuentas.length + ' cuentas');

      if (cuentas.length === 0) {
        card.append(U.el('p', 'empty', 'No hay cuentas creadas. Crea la primera.'));
      } else {
        const cols = [
          { h: 'Cuenta', get: (r) => `<span class="t-name">${r.nombre}</span>` },
          { h: 'Tipo', get: (r) => r.tipo || '—' },
          { h: 'Moneda', k: 'moneda' },
          { h: 'Propósito', get: (r) => r.proposito || '—' },
          { h: 'Estado', get: (r) => r.activa ? '✓ Activa' : '✗ Inactiva' }
        ];
        card.append(U.table(cols, cuentas));
      }

      wrap.append(card);

      const info = U.card('Próximamente');
      info.innerHTML += '<p style="color:var(--c-text-muted);font-size:12px">Podrás crear cuentas, editar, registrar saldos y gestionar titulares.</p>';
      wrap.append(info);

    } catch (err) {
      console.error(err);
      const card = U.card('Error');
      card.innerHTML = `<p style="color:red">Error al cargar cuentas: ${err.message}</p>`;
      wrap.append(card);
    }

    return wrap;
  };
})(window.App = window.App || {});
