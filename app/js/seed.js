/* Bootstrap y datos de ejemplo para una base nueva. */
window.App = window.App || {};

/* Mínimo indispensable para que la app funcione en una base "de cero":
   settings, integrantes, categorías base y el período del mes actual abierto. */
window.App.bootstrapMinimo = function (db) {
  const CATS = [
    ['Sueldos', 'ingreso'], ['Inversiones', 'ingreso'], ['Varios', 'ambos'],
    ['Vivienda', 'gasto'], ['Educación', 'gasto'], ['Salud', 'gasto'],
    ['Transporte', 'gasto'], ['Supermercado', 'gasto'], ['Tarjeta', 'gasto'], ['Ocio y salud', 'gasto'],
  ];
  db.tx(() => {
    [['moneda_base', 'ARS'], ['pct_efectivo_objetivo', '0.05'], ['version_esquema', '1']]
      .forEach(([k, v]) => db.run('INSERT OR IGNORE INTO settings(clave,valor) VALUES(?,?)', [k, v]));
    if (!db.get('SELECT 1 FROM integrantes LIMIT 1')) {
      db.run('INSERT INTO integrantes(nombre,orden) VALUES(?,0)', ['Hernan']);
      db.run('INSERT INTO integrantes(nombre,orden) VALUES(?,1)', ['Xime']);
    }
    if (!db.get('SELECT 1 FROM categorias LIMIT 1')) {
      CATS.forEach(([n, t], i) => db.run('INSERT INTO categorias(nombre,tipo,orden) VALUES(?,?,?)', [n, t, i]));
    }
    if (!db.get('SELECT 1 FROM periodos LIMIT 1')) {
      const d = new Date();
      db.run("INSERT INTO periodos(anio,mes,estado) VALUES(?,?,'abierto')", [d.getFullYear(), d.getMonth() + 1]);
      db.run("INSERT OR REPLACE INTO settings(clave,valor) VALUES('periodo_actual_id',?)", [String(db.lastId())]);
    }
  });
};

window.App.seedDemo = function (db) {
  const ISO = (a, m) => a + '-' + String(m).padStart(2, '0') + '-28';
  const ym = (idx) => { const t = 2025 * 12 + 10 + idx; return { anio: Math.floor((t - 1) / 12), mes: ((t - 1) % 12) + 1 }; };

  const ING = [2650000, 2700000, 3050000, 2820000, 2900000, 3180000, 3260000, 3400000, 3520000, 3610000, 3740000, 3835400];
  const GAS = [2180000, 2320000, 2610000, 2400000, 2250000, 2480000, 2530000, 2470000, 2680000, 2410000, 2590000, 2581500];

  db.tx(() => {
    /* settings */
    const S = [
      ['moneda_base', 'ARS'],
      ['pct_efectivo_objetivo', '0.05'],
      ['version_esquema', '1'],
    ];
    S.forEach(([k, v]) => db.run('INSERT INTO settings(clave,valor) VALUES(?,?)', [k, v]));

    /* integrantes */
    db.run('INSERT INTO integrantes(nombre,orden) VALUES(?,?)', ['Hernan', 0]);
    db.run('INSERT INTO integrantes(nombre,orden) VALUES(?,?)', ['Xime', 1]);
    const IH = db.get("SELECT id FROM integrantes WHERE nombre='Hernan'").id;
    const IX = db.get("SELECT id FROM integrantes WHERE nombre='Xime'").id;

    /* categorías */
    const CATS = [
      ['Sueldos', 'ingreso'], ['Inversiones', 'ingreso'], ['Varios', 'ambos'],
      ['Vivienda', 'gasto'], ['Educación', 'gasto'], ['Salud', 'gasto'],
      ['Transporte', 'gasto'], ['Supermercado', 'gasto'], ['Tarjeta', 'gasto'], ['Ocio y salud', 'gasto'],
    ];
    CATS.forEach(([n, t], i) => db.run('INSERT INTO categorias(nombre,tipo,orden) VALUES(?,?,?)', [n, t, i]));
    const cat = (n) => db.get('SELECT id FROM categorias WHERE nombre=?', [n]).id;

    /* períodos: 11 cerrados + septiembre 2026 abierto */
    let acum = 0;
    for (let i = 0; i < 11; i++) {
      const { anio, mes } = ym(i);
      const ah = ING[i] - GAS[i]; acum += ah;
      db.run(
        `INSERT INTO periodos(anio,mes,estado,fecha_cierre,ingresos_mes,gastos_mes,ahorro_mes,ahorro_acumulado,cotiz_usd_ars_cierre,cotiz_btc_usd_cierre)
         VALUES(?,?,'cerrado',?,?,?,?,?,?,?)`,
        [anio, mes, ISO(anio, mes), ING[i], GAS[i], ah, acum, 1200 + i * 25, 58000 + i * 400]
      );
    }
    const cur = ym(11);
    db.run("INSERT INTO periodos(anio,mes,estado) VALUES(?,?,'abierto')", [cur.anio, cur.mes]);
    const PID = db.get('SELECT id FROM periodos WHERE anio=? AND mes=?', [cur.anio, cur.mes]).id;
    db.run('INSERT INTO settings(clave,valor) VALUES(?,?)', ['periodo_actual_id', String(PID)]);

    /* cuentas */
    const CUE = [
      ['Cuenta sueldo Galicia', 'caja_ahorro', IH, 'gastos_mes', 'ARS', 430000],
      ['Cuenta sueldo Santander', 'cuenta_sueldo', IX, 'gastos_mes', 'ARS', 512000],
      ['Efectivo Hernan', 'billetera_efectivo', IH, 'efectivo_mes', 'ARS', 30000],
      ['Efectivo Xime', 'billetera_efectivo', IX, 'efectivo_mes', 'ARS', 6000],
      ['Caja de ahorro USD', 'caja_ahorro', IH, 'ahorro_metas', 'USD', 2400],
      ['Fondo (plazo fijo)', 'inversion', null, 'fondo_emergencia', 'ARS', 1680000],
      ['Reserva BTC', 'billetera_cripto', null, 'ahorro_largo_plazo', 'BTC', 0.045],
      ['Tarjeta Visa', 'tarjeta_credito', null, 'otro', 'ARS', -780000],
    ];
    CUE.forEach(([n, t, tit, pr, mo, saldo], i) => {
      db.run('INSERT INTO cuentas(nombre,tipo,titular_id,proposito,moneda,orden) VALUES(?,?,?,?,?,?)', [n, t, tit, pr, mo, i]);
      const cidv = db.get('SELECT id FROM cuentas WHERE nombre=?', [n]).id;
      db.run('INSERT INTO saldos_cuenta(cuenta_id,periodo_id,fecha,saldo,nota) VALUES(?,?,?,?,?)', [cidv, PID, '2026-09-02', saldo, 'saldo inicial de ejemplo']);
    });
    const cid = (n) => db.get('SELECT id FROM cuentas WHERE nombre=?', [n]).id;

    /* presupuesto de efectivo del período actual */
    db.run('INSERT INTO presupuesto_efectivo(periodo_id,cuenta_id,asignado) VALUES(?,?,?)', [PID, cid('Efectivo Hernan'), 110000]);
    db.run('INSERT INTO presupuesto_efectivo(periodo_id,cuenta_id,asignado) VALUES(?,?,?)', [PID, cid('Efectivo Xime'), 82000]);

    /* cotizaciones vigentes */
    db.run('INSERT INTO cotizaciones(par,valor,fecha,periodo_id) VALUES(?,?,?,?)', ['USD_ARS', 1470, '2026-09-01', PID]);
    db.run('INSERT INTO cotizaciones(par,valor,fecha,periodo_id) VALUES(?,?,?,?)', ['BTC_USD', 62000, '2026-09-01', PID]);

    /* conceptos + movimientos del período actual */
    const C = [
      ['Sueldo Hernan', 'ingreso', 'Sueldos', 'Cuenta sueldo Galicia', IH, 'ARS', 0, 1, 1850000, 'pagado'],
      ['Sueldo Xime', 'ingreso', 'Sueldos', 'Cuenta sueldo Santander', IX, 'ARS', 0, 1, 1420000, 'pagado'],
      ['Renta depto Córdoba', 'ingreso', 'Inversiones', 'Caja de ahorro USD', null, 'USD', 0, 1, 320, 'pagado'],
      ['Otros ingresos', 'ingreso', 'Varios', 'Efectivo Hernan', IH, 'ARS', 0, 0, null, 'pendiente'],
      ['Alquiler', 'gasto', 'Vivienda', 'Cuenta sueldo Galicia', null, 'ARS', 0, 1, 650000, 'pagado'],
      ['Expensas', 'gasto', 'Vivienda', 'Cuenta sueldo Galicia', null, 'ARS', 0, 1, 118000, 'pagado'],
      ['Luz, gas y agua', 'gasto', 'Vivienda', 'Cuenta sueldo Santander', null, 'ARS', 0, 1, 96000, 'pagado'],
      ['Internet y cable', 'gasto', 'Vivienda', 'Tarjeta Visa', null, 'ARS', 0, 1, 28000, 'pagado'],
      ['Colegio de los chicos', 'gasto', 'Educación', 'Cuenta sueldo Santander', null, 'ARS', 0, 1, 240000, 'pagado'],
      ['Obra social', 'gasto', 'Salud', 'Cuenta sueldo Galicia', null, 'ARS', 0, 1, 145000, 'pagado'],
      ['Farmacia', 'gasto', 'Salud', 'Efectivo Xime', IX, 'ARS', 0, 0, null, 'pagado'],
      ['Nafta', 'gasto', 'Transporte', 'Efectivo Hernan', IH, 'ARS', 0, 0, null, 'pendiente'],
      ['Supermercado', 'gasto', 'Supermercado', 'Cuenta sueldo Santander', null, 'ARS', 0, 0, null, 'pendiente'],
      ['Gimnasio', 'gasto', 'Ocio y salud', 'Tarjeta Visa', IH, 'ARS', 0, 1, 38000, 'pagado'],
      ['Streaming (Netflix, Spotify)', 'gasto', 'Ocio y salud', 'Tarjeta Visa', null, 'ARS', 0, 1, 14500, 'pagado'],
      ['Tarjeta', 'gasto', 'Tarjeta', 'Tarjeta Visa', null, 'ARS', 1, 1, 780000, 'pendiente'],
    ];
    C.forEach(([n, tipo, ct, cu, integ, mo, agr, rec, ref, estado]) => {
      db.run(
        `INSERT INTO conceptos(nombre,tipo,categoria_id,cuenta_id,integrante_id,moneda,es_agrupado,es_recurrente,monto_referencia)
         VALUES(?,?,?,?,?,?,?,?,?)`,
        [n, tipo, cat(ct), cid(cu), integ, mo, agr, rec, ref]
      );
      const coid = db.get('SELECT id FROM conceptos WHERE nombre=?', [n]).id;
      const monto = ref != null ? ref : (n === 'Otros ingresos' ? 95000 : n === 'Farmacia' ? 42000 : n === 'Nafta' ? 110000 : n === 'Supermercado' ? 320000 : 0);
      db.run(
        `INSERT INTO movimientos(periodo_id,concepto_id,monto,moneda,estado,vino_de_recurrente)
         VALUES(?,?,?,?,?,?)`,
        [PID, coid, monto, mo, estado, rec]
      );
    });

    /* metas */
    const M = [
      ['Vacaciones Brasil', 'USD', 3000, 1150, '2026-01', '2027-01', 'Caja de ahorro USD'],
      ['Fondo de emergencia', 'ARS', 3000000, 1680000, '2026-03', '2026-12', 'Fondo (plazo fijo)'],
      ['Colegio 2027', 'ARS', 2800000, 800000, '2026-07', '2027-02', null],
    ];
    M.forEach(([n, mo, obj, ini, fi, fo, cu]) => {
      db.run(
        `INSERT INTO metas(nombre,moneda,monto_objetivo,monto_inicial,fecha_inicio,fecha_objetivo,cuenta_id)
         VALUES(?,?,?,?,?,?,?)`,
        [n, mo, obj, ini, fi, fo, cu ? cid(cu) : null]
      );
    });
  });
};
