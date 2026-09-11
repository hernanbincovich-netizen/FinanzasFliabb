/* Formato de montos, fechas y parsing de inputs. Sin dependencias. */
(function (App) {
  const nf = new Intl.NumberFormat('es-AR');
  const nf2 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const SIM = { ARS: '$', USD: 'US$', BTC: '₿' };

  function money(v, mon = 'ARS') {
    v = Number(v) || 0;
    if (mon === 'BTC') return SIM.BTC + ' ' + v.toLocaleString('es-AR', { minimumFractionDigits: 4, maximumFractionDigits: 8 });
    return SIM[mon] + ' ' + nf.format(Math.round(v));
  }
  // monto con signo explícito (para balances)
  function moneySigned(v, mon = 'ARS') {
    const s = v < 0 ? '− ' : '+ ';
    return s + money(Math.abs(v), mon);
  }
  function pct(v, dec = 0) {
    return (Number(v) || 0).toFixed(dec).replace('.', ',') + '%';
  }
  // Convención es-AR: el punto es separador de miles, la coma es el decimal.
  // "1.234.567,89" -> 1234567.89 · "45.000" -> 45000 · "0,045" -> 0.045
  function parseMonto(str) {
    if (typeof str === 'number') return str;
    if (str == null || str === '') return 0;
    let s = String(str).trim().replace(/[^\d.,-]/g, '');
    const neg = /^-/.test(s);
    s = s.replace(/-/g, '').replace(/\./g, '');   // fuera los puntos (miles)
    s = s.replace(/,(\d*)$/, '.$1').replace(/,/g, ''); // última coma = decimal
    const n = parseFloat(s);
    return (isNaN(n) ? 0 : n) * (neg ? -1 : 1);
  }

  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MES3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  const periodoLargo = (p) => MESES[p.mes - 1] + ' ' + p.anio;
  const periodoCorto = (p) => MES3[p.mes - 1] + ' ' + p.anio;
  // 'YYYY-MM' -> 'sep 2026'
  function ymCorto(ym) {
    const [y, m] = String(ym).split('-').map(Number);
    return (MES3[(m || 1) - 1] || '?') + ' ' + (y || '');
  }
  // meses entre 'YYYY-MM' A y B (B - A)
  function mesesEntreYM(a, b) {
    const [ay, am] = String(a).split('-').map(Number);
    const [by, bm] = String(b).split('-').map(Number);
    return (by - ay) * 12 + (bm - am);
  }
  const hoyYM = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  const hoyISO = () => new Date().toISOString().slice(0, 10);
  // 'YYYY-MM-DD' -> 'DD/MM/AAAA'
  function fechaCorta(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return d + '/' + m + '/' + y;
  }
  // corre una fecha ISO 'deltaMeses' meses, conservando el día (recortado al último día del mes destino)
  function shiftFechaMes(iso, deltaMeses) {
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    let ny = y, nm = m + deltaMeses;
    while (nm > 12) { nm -= 12; ny++; }
    while (nm < 1) { nm += 12; ny--; }
    const ultimoDia = new Date(ny, nm, 0).getDate();
    const nd = Math.min(d, ultimoDia);
    return ny + '-' + String(nm).padStart(2, '0') + '-' + String(nd).padStart(2, '0');
  }

  App.fmt = { nf, nf2, money, moneySigned, pct, parseMonto, MESES, MES3, periodoLargo, periodoCorto, ymCorto, mesesEntreYM, hoyYM, hoyISO, fechaCorta, shiftFechaMes };
  App.screens = App.screens || {};
})(window.App = window.App || {});
