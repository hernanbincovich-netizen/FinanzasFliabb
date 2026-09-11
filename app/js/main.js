/* Arranque, barra superior y navegación. */
(function (App) {
  const U = App.ui, q = App.q, F = App.fmt;
  const el = U.el, $ = U.$;

  App.state = { screen: 'dashboard', view: null, data: {} };

  // Período que se está mirando/editando (según el navegador de meses de arriba)
  App.periodoView = async function () {
    if (App.state.view) {
      const p = await q.periodoByYM(App.state.view.anio, App.state.view.mes);
      if (p) return p;
      return { id: null, anio: App.state.view.anio, mes: App.state.view.mes, estado: 'inexistente' };
    }
    return await q.periodoActual();
  };

  App.periodoActivoId = async function () {
    const p = await App.periodoView();
    return p && p.id;
  };

  App.verPeriodo = async function (anio, mes) {
    App.state.view = { anio, mes };
    // Invalidar movimientos del período anterior
    for (const key in App.state.data.movimientos) {
      delete App.state.data.movimientos[key];
    }
    q.invalidatePeriodoMovimientos();
    await App.render();
  };

  const TABS = [
    ['dashboard', 'Dashboard'],
    ['carga', 'Carga'],
    ['presupuesto', 'Presupuesto'],
    ['cuentas', 'Cuentas y perfiles'],
    ['cotizaciones', 'Cotizaciones'],
    ['metas', 'Metas de ahorro'],
    ['mescurso', 'Mes en curso'],
  ];

  App.go = function (name) { App.state.screen = name; App.render(); };

  App.render = async function () {
    const main = $('#app');
    if (!main) return;
    main.innerHTML = '';
    try {
      const screenResult = App.screens[App.state.screen]();
      const screenContent = screenResult instanceof Promise ? await screenResult : screenResult;
      main.append(screenContent);
    } catch (e) {
      console.error(e);
      main.append(el('div', 'card', `<h2>Error al dibujar la pantalla</h2><pre class="err">${(e && e.stack) || e}</pre>`));
    }
    document.querySelectorAll('#tabs .tab').forEach((t) => {
      t.toggleAttribute('aria-current', t.dataset.s === App.state.screen);
      if (t.dataset.s === App.state.screen) t.setAttribute('aria-current', 'page');
    });
    await updatePeriodoLabel();
    try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, 0); }
  };

  async function updatePeriodoLabel() {
    const lbl = $('#mLbl');
    if (!lbl) return;
    const p = await App.periodoView();
    if (!p) return;
    const suf = p.estado === 'inexistente' ? ' · sin crear' : p.estado === 'cerrado' ? ' · cerrado' : '';
    lbl.textContent = F.periodoLargo(p) + suf;
  }

  async function stepPeriodo(dir) {
    const v = App.state.view || (() => {
      const now = new Date();
      return { anio: now.getFullYear(), mes: now.getMonth() + 1 };
    })();
    let m = v.mes + dir, a = v.anio;
    if (m < 1) { m = 12; a -= 1; }
    if (m > 12) { m = 1; a += 1; }
    const hoy = new Date().getFullYear();
    if (a < 2015 || a > hoy + 3) return;
    await App.verPeriodo(a, m);
  }

  function buildTopbar() {
    const bar = el('header', 'topbar');
    bar.innerHTML = `
      <div class="brand"><span class="glyph">F</span> Finanzas del Hogar</div>
      <nav class="tabs" id="tabs" aria-label="Secciones">
        ${TABS.map(([s, t]) => `<button class="tab" data-s="${s}">${t}</button>`).join('')}
      </nav>
      <div class="bar-right">
        <div class="stepper" aria-label="Período">
          <button id="prevM" aria-label="Período anterior">‹</button>
          <span class="lbl" id="mLbl">—</span>
          <button id="nextM" aria-label="Período siguiente">›</button>
        </div>
        <button class="icon-btn" id="themeBtn" aria-label="Cambiar tema" title="Cambiar tema">◐</button>
      </div>`;
    document.body.prepend(bar);
    $('#tabs').addEventListener('click', (e) => { const b = e.target.closest('.tab'); if (b) App.go(b.dataset.s); });
    $('#prevM').addEventListener('click', () => stepPeriodo(-1));
    $('#nextM').addEventListener('click', () => stepPeriodo(1));
    $('#themeBtn').addEventListener('click', () => {
      const r = document.documentElement, cur = r.getAttribute('data-theme');
      const sysDark = matchMedia('(prefers-color-scheme:dark)').matches;
      r.setAttribute('data-theme', cur === 'dark' ? 'light' : cur === 'light' ? 'dark' : (sysDark ? 'light' : 'dark'));
    });
  }

  function start() {
    App.state.view = null;
    if (!$('.topbar')) buildTopbar();
    App.render();
  }

  async function run() {
    try {
      const appDiv = $('#app');

      if (!App.api.isLoggedIn()) {
        App.state.screen = 'login';
        App.render();
        return;
      }

      App.state.screen = 'dashboard';
      start();
    } catch (e) {
      console.error(e);
      const appDiv = $('#app');
      if (appDiv) {
        appDiv.innerHTML = '<div class="card" style="margin:2rem"><h2>Error al iniciar</h2><pre class="err">' + ((e && e.stack) || e) + '</pre></div>';
      }
    }
  }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', run);
  else run();
})(window.App = window.App || {});
