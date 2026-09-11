/* Capa de base de datos: SQLite (sql.js / WASM) en el navegador,
   con persistencia a un archivo local (File System Access API) y
   respaldo automático en IndexedDB. */
(function (App) {
  let SQL = null;      // módulo sql.js
  let db = null;       // instancia de base abierta
  let fileHandle = null;
  let saveTimer = null;
  const listeners = [];

  /* ---------- IndexedDB mínimo (respaldo + handle del archivo) ---------- */
  function idb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('finanzas-hogar', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function idbGet(key) {
    const d = await idb();
    return new Promise((res, rej) => {
      const t = d.transaction('kv', 'readonly').objectStore('kv').get(key);
      t.onsuccess = () => res(t.result);
      t.onerror = () => rej(t.error);
    });
  }
  async function idbSet(key, val) {
    const d = await idb();
    return new Promise((res, rej) => {
      const t = d.transaction('kv', 'readwrite').objectStore('kv').put(val, key);
      t.onsuccess = () => res();
      t.onerror = () => rej(t.error);
    });
  }
  async function idbDel(key) {
    const d = await idb();
    return new Promise((res) => {
      const t = d.transaction('kv', 'readwrite').objectStore('kv').delete(key);
      t.onsuccess = () => res();
      t.onerror = () => res();
    });
  }

  /* ---------- init sql.js ---------- */
  async function initSQL() {
    if (SQL) return SQL;
    const b64 = window.SQL_WASM_BASE64;
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    SQL = await window.initSqlJs({ wasmBinary: bin });
    return SQL;
  }

  /* ---------- helpers de consulta ---------- */
  function all(sql, params = []) {
    const stmt = db.prepare(sql);
    try {
      stmt.bind(params);
      const out = [];
      while (stmt.step()) out.push(stmt.getAsObject());
      return out;
    } finally { stmt.free(); }
  }
  function get(sql, params = []) {
    const r = all(sql, params);
    return r.length ? r[0] : null;
  }
  function run(sql, params = []) {
    const stmt = db.prepare(sql);
    try { stmt.bind(params); stmt.step(); } finally { stmt.free(); }
    return lastId();
  }
  function lastId() {
    const r = db.exec('SELECT last_insert_rowid() AS id');
    return r.length ? r[0].values[0][0] : null;
  }
  function exec(sql) { db.exec(sql); }
  function tx(fn) {
    db.exec('BEGIN');
    try { fn(); db.exec('COMMIT'); }
    catch (e) { try { db.exec('ROLLBACK'); } catch (_) {} throw e; }
  }

  /* ---------- ciclo de vida ---------- */
  // Migraciones idempotentes: agregan columnas nuevas a bases viejas.
  // Si la columna ya existe, ALTER TABLE tira error y se ignora.
  function migrar() {
    const tryExec = (sql) => { try { db.exec(sql); } catch (e) { /* ya existe */ } };
    tryExec('ALTER TABLE movimientos ADD COLUMN fecha_vencimiento TEXT');
  }
  function afterOpen() {
    db.exec('PRAGMA foreign_keys = ON');
    migrar();
  }

  async function createNew(withSeed) {
    await initSQL();
    db = new SQL.Database();
    db.exec(window.SCHEMA_SQL);
    afterOpen();
    if (withSeed && App.seedDemo) App.seedDemo(API);
    else if (App.bootstrapMinimo) App.bootstrapMinimo(API);
    await persistNow();
  }

  async function openBytes(bytes) {
    await initSQL();
    db = new SQL.Database(new Uint8Array(bytes));
    afterOpen();
  }

  /* ---------- persistencia ---------- */
  const hasFS = () => typeof window.showSaveFilePicker === 'function';

  function exportBytes() { return db.export(); }

  async function writeHandle() {
    if (!fileHandle) return false;
    const w = await fileHandle.createWritable();
    await w.write(exportBytes());
    await w.close();
    return true;
  }

  async function persistNow() {
    if (!db) return;
    try { await idbSet('snapshot', exportBytes()); } catch (e) { console.warn('idb snapshot', e); }
    try { await writeHandle(); } catch (e) { console.warn('write file', e); }
  }
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persistNow, 400);
  }
  // llamar después de cada mutación
  function markDirty() {
    scheduleSave();
    listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
  }
  function onChange(fn) { listeners.push(fn); }

  /* ---------- selección de archivo ---------- */
  async function pickExisting() {
    const [h] = await window.showOpenFilePicker({
      types: [{ description: 'Base de finanzas', accept: { 'application/x-sqlite3': ['.sqlite', '.db'] } }],
    });
    fileHandle = h;
    await idbSet('fileHandle', h);
    const f = await h.getFile();
    await openBytes(await f.arrayBuffer());
  }
  async function pickNew(withSeed) {
    const h = await window.showSaveFilePicker({
      suggestedName: 'finanzas.sqlite',
      types: [{ description: 'Base de finanzas', accept: { 'application/x-sqlite3': ['.sqlite'] } }],
    });
    fileHandle = h;
    await idbSet('fileHandle', h);
    await createNew(withSeed);
  }
  async function attachAndSave(h) {
    fileHandle = h;
    await idbSet('fileHandle', h);
    await persistNow();
  }
  async function restoreHandle() {
    try {
      const h = await idbGet('fileHandle');
      if (!h) return false;
      const perm = await h.queryPermission({ mode: 'readwrite' });
      fileHandle = h;
      return perm; // 'granted' | 'prompt' | 'denied'
    } catch (e) { return false; }
  }
  async function reconnect() {
    if (!fileHandle) return false;
    const p = await fileHandle.requestPermission({ mode: 'readwrite' });
    if (p !== 'granted') return false;
    const f = await fileHandle.getFile();
    await openBytes(await f.arrayBuffer());
    return true;
  }
  const fileName = () => (fileHandle ? fileHandle.name : null);

  /* ---------- import / export manual ---------- */
  function downloadCopy() {
    const blob = new Blob([exportBytes()], { type: 'application/x-sqlite3' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (fileName() || 'finanzas') + '.sqlite';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  async function loadFromFileInput(file) {
    await openBytes(await file.arrayBuffer());
    await persistNow();
  }

  /* ---------- arranque: intenta restaurar ---------- */
  async function boot() {
    let opened = false;
    // 1) respaldo rápido en IndexedDB (para abrir al instante)
    try {
      const snap = await idbGet('snapshot');
      if (snap && snap.byteLength) { await openBytes(snap); opened = true; }
    } catch (e) { /* sigue */ }

    // 2) archivo elegido antes (autoritativo si hay permiso)
    if (hasFS()) {
      const perm = await restoreHandle();
      if (perm === 'granted') {
        try {
          const f = await fileHandle.getFile();
          await openBytes(await f.arrayBuffer());
          return { status: 'ok', via: 'file', name: fileName() };
        } catch (e) { if (opened) return { status: 'ok', via: 'idb', needsReconnect: true, name: fileName() }; }
      } else if (perm === 'prompt' && opened) {
        return { status: 'ok', via: 'idb', needsReconnect: true, name: fileName() };
      }
    }
    if (opened) return { status: 'ok', via: 'idb' };
    return { status: 'empty' };
  }

  async function reset() {
    await idbDel('snapshot');
    await idbDel('fileHandle');
    fileHandle = null; db = null;
  }

  const API = {
    all, get, run, exec, tx, lastId,
    initSQL, createNew, openBytes, boot, reset,
    hasFS, pickExisting, pickNew, reconnect, restoreHandle, attachAndSave,
    persistNow, markDirty, onChange,
    exportBytes, downloadCopy, loadFromFileInput, fileName,
    isOpen: () => !!db,
  };
  App.db = API;
})(window.App = window.App || {});
