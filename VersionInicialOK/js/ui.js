/* Componentes de interfaz y gráficos. Sin estado de negocio. */
(function (App) {
  const F = App.fmt;
  const nf = F.nf;

  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (tag === 'button') e.type = 'button'; // nunca submit por defecto
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const IC = {
    rec: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 8a5.5 5.5 0 0 1 9.2-4.1M13.5 8a5.5 5.5 0 0 1-9.2 4.1"/><path d="M11.5 1.2v2.7H8.8M4.5 14.8v-2.7h2.7"/></svg>',
    grp: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1.8 14.5 5 8 8.2 1.5 5 8 1.8Z"/><path d="M1.5 8 8 11.2 14.5 8M1.5 11 8 14.2 14.5 11"/></svg>',
    info: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6.4"/><path d="M8 7.2v4M8 4.9h.01"/></svg>',
  };

  function toast(msg) {
    let t = $('#toast');
    if (!t) { t = el('div', 'toast'); t.id = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('on');
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), 2600);
  }

  function head(title, desc, right) {
    const h = el('div', 'screen-head');
    h.append(el('div', null, `<h1>${title}</h1>${desc ? `<p>${desc}</p>` : ''}`));
    if (right) { const r = el('div', 'screen-head-right'); r.append(right); h.append(r); h.classList.add('with-right'); }
    return h;
  }
  function card(title, meta) {
    const c = el('div', 'card');
    if (title != null) {
      const hd = el('div', 'card-head');
      hd.append(el('h2', null, title || ''));
      if (meta != null) hd.append(el('span', 'meta', meta));
      c.append(hd);
    }
    return c;
  }
  function statCard(label, n, d, dir) {
    const c = el('div', 'card');
    c.append(el('div', 'stat', `<span class="l">${label}</span><span class="n">${n}</span>${d ? `<span class="d ${dir || ''}">${d}</span>` : ''}`));
    return c;
  }
  function legend(items) {
    const l = el('div', 'legend');
    items.forEach(([t, c]) => l.append(el('span', null, `<i style="background:${c}"></i>${t}`)));
    return l;
  }
  const semaforo = (pct) => (pct > 90 ? 'bad' : pct >= 70 ? 'warn' : 'good');
  const lights = (state) => `<span class="lights ${state}"><i></i><i></i><i></i></span>`;

  function meter(pct, state) {
    const m = el('div', 'meter'); const i = el('i', state || ''); i.style.width = Math.max(0, Math.min(pct, 100)) + '%'; m.append(i); return m;
  }

  function grid(cols, nodes) {
    const g = el('div', 'grid-' + cols);
    nodes.filter(Boolean).forEach((n) => g.append(n));
    return g;
  }

  function table(cols, rows) {
    const w = el('div', 'table-wrap');
    const t = el('table');
    t.innerHTML = '<thead><tr>' + cols.map((c) => `<th class="${c.num ? 'num' : ''}">${c.h || ''}</th>`).join('') + '</tr></thead>';
    const tb = el('tbody');
    rows.forEach((r) => {
      const tr = el('tr');
      cols.forEach((c) => {
        const td = el('td', c.num ? 'num' : (c.cls || ''));
        const v = typeof c.get === 'function' ? c.get(r) : r[c.k];
        if (v instanceof Node) td.append(v); else td.innerHTML = v == null ? '' : v;
        tr.append(td);
      });
      tb.append(tr);
    });
    t.append(tb); w.append(t);
    return w;
  }

  /* ---------- modal ---------- */
  function modal(title, bodyNode, opts = {}) {
    const back = el('div', 'modal-back');
    const box = el('div', 'modal');
    box.append(el('div', 'modal-head', `<h3>${title}</h3><button class="modal-x" aria-label="Cerrar">✕</button>`));
    const body = el('div', 'modal-body'); body.append(bodyNode); box.append(body);
    const foot = el('div', 'modal-foot');
    const cancel = el('button', 'btn ghost', opts.cancelText || 'Cancelar');
    const ok = el('button', 'btn', opts.okText || 'Guardar');
    foot.append(cancel, ok); box.append(foot);
    back.append(box); document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
    box.querySelector('.modal-x').addEventListener('click', close);
    cancel.addEventListener('click', close);
    ok.addEventListener('click', () => { if (!opts.onOk || opts.onOk() !== false) close(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
    return { close, box };
  }
  function confirmar(msg, onYes, okText) {
    modal('Confirmar', el('p', 'modal-msg', msg), { okText: okText || 'Sí, continuar', onOk: () => { onYes(); } });
  }

  // Tarjeta para cuando el mes que se está mirando todavía no existe.
  function crearPeriodoCard(view, extra) {
    const nombre = F.MESES[view.mes - 1] + ' ' + view.anio;
    const c = card(null);
    c.append(el('div', 'empty-hero', `<h2>${nombre[0].toUpperCase() + nombre.slice(1)} todavía no está creado</h2>
      <p>${extra || 'Creá el período para empezar a cargar sus ingresos y gastos.'}</p>`));
    const b = el('button', 'btn', 'Crear ' + nombre);
    b.addEventListener('click', () => { App.acciones.crearPeriodo(view.anio, view.mes); toast('Período ' + nombre + ' creado.'); App.render(); });
    c.append(b);
    return c;
  }

  /* ---------- form builder ---------- */
  // campos: [{k, label, type:'text|number|select|check|date', opts:[{v,t}]|['a','b'], value}]
  function form(campos) {
    const f = el('form', 'formgrid');
    f.addEventListener('submit', (e) => e.preventDefault());
    campos.forEach((c) => {
      if (c.type === 'check') {
        const w = el('label', 'check');
        w.innerHTML = `<input type="checkbox" ${c.value ? 'checked' : ''}> ${c.label}`;
        w.querySelector('input').dataset.k = c.k;
        f.append(w);
        return;
      }
      const field = el('div', 'field' + (c.half ? ' half' : ''));
      field.append(el('label', null, c.label));
      let input;
      if (c.type === 'select') {
        input = el('select');
        (c.opts || []).forEach((o) => {
          const v = o.v !== undefined ? o.v : o;
          const t = o.t !== undefined ? o.t : o;
          const op = el('option'); op.value = v; op.textContent = t;
          if (String(c.value) === String(v)) op.selected = true;
          input.append(op);
        });
      } else {
        input = el('input');
        input.type = c.type === 'number' ? 'text' : (c.type || 'text');
        if (c.type === 'number') input.classList.add('num');
        if (c.value != null) input.value = c.value;
        if (c.placeholder) input.placeholder = c.placeholder;
        if (c.inputmode) input.inputMode = c.inputmode;
      }
      input.dataset.k = c.k;
      if (c.disabled) input.disabled = true;
      field.append(input);
      f.append(field);
    });
    f.read = () => {
      const out = {};
      $$('[data-k]', f).forEach((i) => {
        out[i.dataset.k] = i.type === 'checkbox' ? i.checked : i.value;
      });
      return out;
    };
    return f;
  }

  /* ================= gráficos ================= */
  function barlist(items, fmt) {
    const max = Math.max(1, ...items.map((i) => i.value));
    const bl = el('div', 'barlist');
    items.forEach((it) => {
      const b = el('div', 'b');
      const tr = el('div', 'track'); const i = el('i'); i.style.width = (it.value / max * 100).toFixed(1) + '%'; tr.append(i);
      b.append(el('span', 'lbl', it.label), tr, el('span', 'val', fmt ? fmt(it.value) : nf.format(it.value)));
      bl.append(b);
    });
    return bl;
  }

  function lineChart(labels, s1, s2, names) {
    const W = 620, H = 210, pL = 54, pR = 14, pT = 10, pB = 26, iw = W - pL - pR, ih = H - pT - pB;
    const all = [...s1, ...s2];
    const step = 250000;
    const maxV = Math.ceil(Math.max(...all) / step) * step;
    const minV = Math.max(0, Math.floor(Math.min(...all) / step) * step);
    const x = (i) => pL + i * (iw / (labels.length - 1));
    const y = (v) => pT + ih - ((v - minV) / (maxV - minV || 1)) * ih;
    const path = (arr) => arr.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
    const hold = el('div', 'chart-hold');
    const gl = [0, .25, .5, .75, 1].map((f) => {
      const yy = (pT + ih - f * ih).toFixed(1);
      return `<line x1="${pL}" y1="${yy}" x2="${W - pR}" y2="${yy}" stroke="var(--c-grid)" stroke-width="1"/>
        <text x="${pL - 8}" y="${+yy + 3.5}" text-anchor="end" font-size="9" fill="var(--ink-faint)" font-family="IBM Plex Mono">${nf.format((minV + (maxV - minV) * f) / 1000)}k</text>`;
    }).join('');
    const xl = labels.map((m, i) => (i % 2 ? '' : `<text x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="9" fill="var(--ink-faint)">${m}</text>`)).join('');
    const dots = s1.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="2.4" fill="var(--c-ingreso)"/>`).join('');
    const li = s1.length - 1;
    hold.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="chart-svg" role="img" aria-label="${(names || []).join(' vs ')}">
      ${gl}${xl}
      <path d="${path(s2)}" fill="none" stroke="var(--c-gasto)" stroke-width="2" stroke-linejoin="round"/>
      <path d="${path(s1)}" fill="none" stroke="var(--c-ingreso)" stroke-width="2" stroke-linejoin="round"/>
      ${dots}
      <circle cx="${x(li).toFixed(1)}" cy="${y(s1[li]).toFixed(1)}" r="3.4" fill="var(--c-ingreso)"/>
      <circle cx="${x(li).toFixed(1)}" cy="${y(s2[li]).toFixed(1)}" r="3.4" fill="var(--c-gasto)"/>
    </svg><div class="tip" id="tipc"></div>`;
    const svg = hold.querySelector('svg'), tip = hold.querySelector('#tipc');
    svg.addEventListener('mousemove', (ev) => {
      const r = svg.getBoundingClientRect();
      let i = Math.round(((ev.clientX - r.left) / r.width * W - pL) / (iw / (labels.length - 1)));
      i = Math.max(0, Math.min(labels.length - 1, i));
      tip.style.left = (x(i) / W * 100) + '%'; tip.style.top = (y(Math.max(s1[i], s2[i])) / H * 100) + '%';
      tip.innerHTML = `<strong>${labels[i]}</strong><br>${(names && names[0]) || 'A'} <span class="num">${F.money(s1[i])}</span><br>${(names && names[1]) || 'B'} <span class="num">${F.money(s2[i])}</span>`;
      tip.style.opacity = '1';
    });
    svg.addEventListener('mouseleave', () => (tip.style.opacity = '0'));
    return hold;
  }

  function areaChart(labels, serie, color) {
    const W = 620, H = 210, pL = 58, pR = 14, pT = 10, pB = 26, iw = W - pL - pR, ih = H - pT - pB;
    const maxV = Math.max(1, Math.ceil(Math.max(...serie) / 1000000) * 1000000);
    const x = (i) => pL + i * (iw / (labels.length - 1));
    const y = (v) => pT + ih - (v / maxV) * ih;
    const line = serie.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
    const area = `M${x(0).toFixed(1)} ${y(0).toFixed(1)} ` + serie.map((v, i) => 'L' + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ') + ` L${x(serie.length - 1).toFixed(1)} ${y(0).toFixed(1)} Z`;
    const hold = el('div', 'chart-hold');
    const gl = [0, .5, 1].map((f) => {
      const yy = (pT + ih - f * ih).toFixed(1);
      return `<line x1="${pL}" y1="${yy}" x2="${W - pR}" y2="${yy}" stroke="var(--c-grid)" stroke-width="1"/>
        <text x="${pL - 8}" y="${+yy + 3.5}" text-anchor="end" font-size="9" fill="var(--ink-faint)" font-family="IBM Plex Mono">${nf.format(maxV * f / 1000000)}M</text>`;
    }).join('');
    const xl = labels.map((m, i) => (i % 2 ? '' : `<text x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="9" fill="var(--ink-faint)">${m}</text>`)).join('');
    const li = serie.length - 1;
    hold.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="chart-svg" role="img" aria-label="Ahorro acumulado">
      ${gl}${xl}
      <path d="${area}" fill="${color}" opacity="0.14"/>
      <path d="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="${x(li).toFixed(1)}" cy="${y(serie[li]).toFixed(1)}" r="3.4" fill="${color}"/>
      <text x="${x(li).toFixed(1)}" y="${y(serie[li]) - 8}" text-anchor="end" font-size="10" font-family="IBM Plex Mono" fill="var(--ink)">${F.money(serie[li])}</text>
    </svg>`;
    return hold;
  }

  App.ui = { el, $, $$, IC, toast, head, card, statCard, legend, semaforo, lights, meter, grid, table, modal, confirmar, crearPeriodoCard, form, barlist, lineChart, areaChart };
})(window.App = window.App || {});
