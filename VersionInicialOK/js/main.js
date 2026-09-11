/* Arranque, barra superior y navegación. */
(function (App) {
  const U = App.ui, q = App.q, F = App.fmt;
  const el = U.el, $ = U.$;

  App.state = { screen: 'dashboard', view: null };

  // Período que se está mirando/editando (según el navegador de meses de arriba).
  // Puede ser un mes que todavía no existe: devuelve {id:null, estado:'inexistente'}.
  App.periodoView = function () {
    const v = App.state.view;
    if (v) {
      const p = q.periodoByYM(v.anio, v.mes);
      if (p) return p;
      return { id: null, anio: v.anio, mes: v.mes, estado: 'inexistente' };
    }
    return q.periodoActual();
  };
  App.periodoActivoId = function () { const p = App.periodoView(); return p && p.id; };
  App.verPeriodo = function (anio, mes) { App.state.view = { anio, mes }; App.render(); };

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
  App.render = function () {
    const main = $('#app'); if (!main) return;
    main.innerHTML = '';
    try {
      main.append(App.screens[App.state.screen]());
    } catch (e) {
      console.error(e);
      main.append(el('div', 'card', `<h2>Error al dibujar la pantalla</h2><pre class="err">${(e && e.stack) || e}</pre>`));
    }
    document.querySelectorAll('#tabs .tab').forEach((t) => {
      t.toggleAttribute('aria-current', t.dataset.s === App.state.screen);
      if (t.dataset.s === App.state.screen) t.setAttribute('aria-current', 'page');
    });
    updatePeriodoLabel();
    try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, 0); }
  };

  function updatePeriodoLabel() {
    const lbl = $('#mLbl'); if (!lbl) return;
    const p = App.periodoView();
    const suf = p.estado === 'inexistente' ? ' · sin crear' : p.estado === 'cerrado' ? ' · cerrado' : '';
    lbl.textContent = F.periodoLargo(p) + suf;
  }
  function stepPeriodo(dir) {
    const v = App.state.view || (() => { const a = q.periodoActual(); return { anio: a.anio, mes: a.mes }; })();
    let m = v.mes + dir, a = v.anio;
    if (m < 1) { m = 12; a -= 1; }
    if (m > 12) { m = 1; a += 1; }
    const hoy = new Date().getFullYear();
    if (a < 2015 || a > hoy + 3) return;
    App.state.view = { anio: a, mes: m };
    App.render();
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
        <button class="icon-btn" id="fileBtn" title="Archivo de datos">💾</button>
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
    $('#fileBtn').addEventListener('click', menuArchivo);
  }

  function menuArchivo() {
    const box = el('div', 'formgrid');
    const name = App.db.fileName();
    box.append(el('p', 'modal-msg', name
      ? `Archivo actual: <strong>${name}</strong>. Los cambios se guardan solos.`
      : 'Todavía no elegiste un archivo. Los datos viven en el navegador y se pueden perder si lo limpiás.'));
    const acts = el('div', 'menu-acts');
    if (App.db.hasFS()) {
      const b1 = el('button', 'btn', name ? 'Cambiar archivo de guardado' : 'Elegir archivo para guardar');
      b1.addEventListener('click', async () => {
        try {
          const h = await window.showSaveFilePicker({ suggestedName: name || 'finanzas.sqlite', types: [{ description: 'Base de finanzas', accept: { 'application/x-sqlite3': ['.sqlite'] } }] });
          await App.db.attachAndSave(h); U.toast('Archivo conectado. Ya se guarda solo.'); m.close();
        } catch (e) { /* cancelado */ }
      });
      acts.append(b1);
    }
    const b2 = el('button', 'btn ghost', 'Descargar copia (.sqlite)');
    b2.addEventListener('click', () => { App.db.downloadCopy(); U.toast('Descargando copia.'); });
    acts.append(b2);
    const b3 = el('button', 'btn ghost', 'Importar archivo…');
    b3.addEventListener('click', () => {
      const inp = el('input'); inp.type = 'file'; inp.accept = '.sqlite,.db';
      inp.addEventListener('change', async () => { if (inp.files[0]) { await App.db.loadFromFileInput(inp.files[0]); const a = q.periodoActual(); App.state.view = a ? { anio: a.anio, mes: a.mes } : null; U.toast('Base importada.'); m.close(); App.render(); } });
      inp.click();
    });
    acts.append(b3);
    box.append(acts);
    const m = U.modal('Archivo de datos', box, { okText: 'Cerrar', cancelText: '', onOk: () => {} });
    m.box.querySelector('.modal-foot .btn.ghost').style.display = 'none';
  }

  /* ---------- pantalla de inicio ---------- */
  function overlay(nodes) {
    const b = el('div', 'onboard-back');
    const box = el('div', 'onboard');
    box.append(el('div', 'brand big', `<span class="glyph">F</span> Finanzas del Hogar`));
    nodes.forEach((n) => box.append(n));
    b.append(box); document.body.appendChild(b);
    return { remove: () => b.remove() };
  }

  async function showOnboarding() {
    const p = el('p', 'ob-lead', 'Es la primera vez. ¿Cómo querés empezar?');
    const acts = el('div', 'ob-acts');
    const fs = App.db.hasFS();

    const mk = (txt, sub, fn, primary) => {
      const b = el('button', 'ob-btn' + (primary ? ' primary' : ''));
      b.innerHTML = `<strong>${txt}</strong><span>${sub}</span>`;
      b.addEventListener('click', fn);
      return b;
    };
    acts.append(mk('Empezar con datos de ejemplo',
      fs ? 'Elegís dónde guardar finanzas.sqlite y arranca con datos de muestra.' : 'Arranca con datos de muestra (se guardan en el navegador).',
      async () => { try { if (fs) await App.db.pickNew(true); else await App.db.createNew(true); ob.remove(); start(); } catch (e) { U.toast('Cancelado.'); } }, true));
    acts.append(mk('Empezar de cero',
      fs ? 'Base vacía en el archivo que elijas.' : 'Base vacía (se guarda en el navegador).',
      async () => { try { if (fs) await App.db.pickNew(false); else await App.db.createNew(false); ob.remove(); start(); } catch (e) { U.toast('Cancelado.'); } }));
    acts.append(mk('Abrir una base existente',
      'Tenés un archivo .sqlite de antes.',
      async () => {
        try {
          if (fs) { await App.db.pickExisting(); ob.remove(); start(); }
          else {
            const inp = el('input'); inp.type = 'file'; inp.accept = '.sqlite,.db';
            inp.addEventListener('change', async () => { if (inp.files[0]) { await App.db.loadFromFileInput(inp.files[0]); ob.remove(); start(); } });
            inp.click();
          }
        } catch (e) { U.toast('Cancelado.'); }
      }));

    const nodes = [p, acts];
    if (!fs) nodes.push(el('p', 'ob-note', 'Tu navegador no permite guardar en un archivo local automáticamente (funciona en Chrome o Edge). Podés usar la app igual: los datos se guardan en el navegador y podés descargar/importar una copia .sqlite cuando quieras.'));
    const ob = overlay(nodes);
  }

  function showReconnect(name) {
    const p = el('p', 'ob-lead', `Encontré tu archivo <strong>${name || 'finanzas.sqlite'}</strong> pero el navegador necesita que confirmes el acceso.`);
    const acts = el('div', 'ob-acts');
    const b1 = el('button', 'ob-btn primary'); b1.innerHTML = `<strong>Reconectar archivo</strong><span>Seguí trabajando sobre tu archivo</span>`;
    b1.addEventListener('click', async () => { const ok = await App.db.reconnect(); if (ok) { ob.remove(); start(); } else U.toast('No se pudo reconectar.'); });
    const b2 = el('button', 'ob-btn'); b2.innerHTML = `<strong>Seguir con el respaldo del navegador</strong><span>Después podés reconectar el archivo desde 💾</span>`;
    b2.addEventListener('click', () => { ob.remove(); start(); });
    acts.append(b1, b2);
    const ob = overlay([p, acts]);
  }

  function start() {
    try { App.acciones.asegurarBase(); } catch (e) { console.warn('asegurarBase', e); }
    const a = q.periodoActual();
    App.state.view = a ? { anio: a.anio, mes: a.mes } : null;
    if (!$('.topbar')) buildTopbar();
    App.db.onChange(() => { App.render(); });
    App.render();
  }

  async function run() {
    try {
      const r = await App.db.boot();
      if (r.status === 'empty') return showOnboarding();
      if (r.needsReconnect) return showReconnect(r.name);
      start();
    } catch (e) {
      console.error(e);
      document.body.innerHTML = '<div class="card" style="margin:2rem"><h2>No se pudo iniciar</h2><pre class="err">' + ((e && e.stack) || e) + '</pre></div>';
    }
  }
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', run);
  else run();
})(window.App = window.App || {});
