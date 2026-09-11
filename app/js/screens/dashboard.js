(function (App) {
  const U = App.ui, q = App.q, calc = App.calc, F = App.fmt;

  App.screens.dashboard = async function () {
    const p = await App.periodoView();
    const wrap = U.el('section', 'screen');

    if (!p) {
      wrap.append(U.head('Dashboard', 'Tu resumen financiero'));
      wrap.append(U.card('Sin períodos', 'No hay períodos creados aún. Crea el primero para ver tu dashboard.'));
      return wrap;
    }

    wrap.append(U.head('Dashboard',
      `Cómo viene ${F.periodoLargo(p)} y cómo evoluciona el ahorro del hogar. Montos en pesos, con las cotizaciones vigentes.`));

    if (p.estado === 'inexistente') {
      wrap.append(U.crearPeriodoCard(p, 'Este mes no tiene datos. Creá el período para verlo en el dashboard.'));
      return wrap;
    }

    try {
      const ing = await calc.ingresos(p.id);
      const gas = await calc.gastos(p.id);
      const ahorro = ing - gas;
      const acum = await calc.acumHasta(p);

      wrap.append(U.grid(4, [
        U.statCard('Ingresos del mes', F.money(ing)),
        U.statCard('Gastos del mes', F.money(gas)),
        U.statCard('Ahorro del mes', F.moneySigned(ahorro), ing ? (ahorro / ing * 100).toFixed(0) + '% de los ingresos' : '', ahorro >= 0 ? 'up' : 'down'),
        U.statCard('Ahorro acumulado', F.money(acum), (p.estado === 'abierto' ? F.moneySigned(ahorro) + ' este mes' : 'hasta ' + F.periodoCorto(p)), acum >= 0 ? 'up' : 'down'),
      ]));

      const cats = await calc.gastosPorCategoria(p.id);
      const cCat = U.card('Gastos por categoría', cats.length + ' categorías');
      cCat.append(cats.length
        ? U.barlist(cats.map((c) => ({ label: c.nombre, value: c.total })), (v) => F.money(v))
        : U.el('p', 'empty', 'Sin gastos cargados en este período.'));

      const ev = await calc.evolucion(12);
      const rango = ev.length === 1 ? 'este mes' : 'últimos ' + ev.length + ' meses';
      const cAcum = U.card('Evolución del ahorro acumulado', rango);
      cAcum.append(U.areaChart(ev.map((e) => e.label), ev.map((e) => e.acum), 'var(--c-ahorro)'));

      wrap.append(U.grid(2, [cCat, cAcum]));

      const cIG = U.card('Ingresos vs. gastos', rango);
      cIG.append(U.legend([['Ingresos', 'var(--c-ingreso)'], ['Gastos', 'var(--c-gasto)']]));
      cIG.append(U.lineChart(ev.map((e) => e.label), ev.map((e) => e.ingresos), ev.map((e) => e.gastos), ['Ingresos', 'Gastos']));
      wrap.append(cIG);
    } catch (err) {
      console.error('Error en dashboard:', err);
      wrap.append(U.card('Error', `Error al cargar datos: ${err.message}`));
    }

    return wrap;
  };
})(window.App = window.App || {});
