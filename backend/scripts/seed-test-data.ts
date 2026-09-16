import 'dotenv/config.js';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Faltan variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function seedTestData() {
  try {
    console.log('🌱 Iniciando seed de datos de prueba...\n');

    // 1. Crear usuario de prueba
    console.log('📝 Creando usuario de prueba...');
    const testEmail = 'prueba@finanzas.com';
    const testPassword = 'Prueba123!';

    // Crear auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });

    if (authError) {
      console.log(`⚠️  Usuario ya existe: ${testEmail}`);
    } else {
      console.log(`✅ Usuario creado: ${testEmail}`);
    }

    const userId = authUser?.user?.id || (await supabase.auth.signInWithPassword({ email: testEmail, password: testPassword })).data.user?.id;

    if (!userId) {
      console.error('❌ No se pudo obtener userId');
      return;
    }

    // 2. Crear cuentas
    console.log('\n💰 Creando cuentas de prueba...');
    const cuentas = [
      { nombre: 'Banco Santander', tipo: 'banco', moneda: 'ARS', saldo_inicial: 50000 },
      { nombre: 'Tarjeta Crédito', tipo: 'tarjeta', moneda: 'ARS', saldo_inicial: 0 },
      { nombre: 'Efectivo', tipo: 'efectivo', moneda: 'ARS', saldo_inicial: 10000 },
    ];

    for (const cuenta of cuentas) {
      await supabase.from('cuentas').insert({
        usuario_id: userId,
        ...cuenta,
        saldo_actual: cuenta.saldo_inicial,
      });
    }
    console.log(`✅ ${cuentas.length} cuentas creadas`);

    // 3. Crear conceptos
    console.log('\n📋 Creando conceptos de prueba...');
    const conceptos = [
      { nombre: 'Sueldo', tipo: 'ingreso', es_recurrente: true },
      { nombre: 'Freelance', tipo: 'ingreso', es_recurrente: false },
      { nombre: 'Supermercado', tipo: 'gasto', es_recurrente: true },
      { nombre: 'Servicios', tipo: 'gasto', es_recurrente: true },
      { nombre: 'Entretenimiento', tipo: 'gasto', es_recurrente: false },
    ];

    const conceptosCreados = [];
    for (const concepto of conceptos) {
      const { data, error } = await supabase.from('conceptos').insert({
        ...concepto,
      }).select();
      if (error) {
        console.error(`❌ Error creando concepto ${concepto.nombre}:`, error.message);
      } else if (data) {
        conceptosCreados.push(data[0]);
      }
    }
    console.log(`✅ ${conceptosCreados.length} conceptos creados`);

    // 4. Crear períodos
    console.log('\n📅 Creando períodos de prueba...');
    const ahora = new Date();
    const periodos = [];

    for (let i = 2; i >= 0; i--) {
      const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const mes = fecha.getMonth() + 1;
      const anio = fecha.getFullYear();

      const { data, error } = await supabase.from('periodos').insert({
        usuario_id: userId,
        mes,
        anio,
        estado: i === 0 ? 'abierto' : 'cerrado',
      }).select();

      if (error) {
        console.error(`❌ Error creando período ${mes}/${anio}:`, error.message);
      } else if (data) {
        periodos.push(data[0]);
      }
    }
    console.log(`✅ ${periodos.length} períodos creados`);

    // 5. Crear movimientos de prueba
    console.log('\n💸 Creando movimientos de prueba...');
    const periodoActual = periodos[periodos.length - 1];

    if (periodoActual && conceptosCreados.length > 0) {
      const movimientos = [
        {
          periodo_id: periodoActual.id,
          concepto_id: conceptosCreados[0].id, // Sueldo
          monto: 50000,
          moneda: 'ARS',
          estado: 'pagado',
          nota: 'Sueldo mensual',
        },
        {
          periodo_id: periodoActual.id,
          concepto_id: conceptosCreados[2].id, // Supermercado
          monto: 5000,
          moneda: 'ARS',
          estado: 'pagado',
          nota: 'Compra semanal',
        },
        {
          periodo_id: periodoActual.id,
          concepto_id: conceptosCreados[3].id, // Servicios
          monto: 3500,
          moneda: 'ARS',
          estado: 'pendiente',
          nota: 'Servicios del mes',
        },
        {
          periodo_id: periodoActual.id,
          concepto_id: conceptosCreados[4].id, // Entretenimiento
          monto: 2000,
          moneda: 'ARS',
          estado: 'pagado',
          nota: 'Cine y salidas',
        },
      ];

      for (const mov of movimientos) {
        await supabase.from('movimientos').insert({
          usuario_id: userId,
          ...mov,
        });
      }
      console.log(`✅ ${movimientos.length} movimientos creados`);
    }

    // 6. Crear presupuestos
    console.log('\n📊 Creando presupuestos de prueba...');
    if (periodoActual && conceptosCreados.length > 0) {
      const presupuestos = [
        {
          periodo_id: periodoActual.id,
          concepto_id: conceptosCreados[2].id, // Supermercado
          monto_presupuestado: 8000,
        },
        {
          periodo_id: periodoActual.id,
          concepto_id: conceptosCreados[3].id, // Servicios
          monto_presupuestado: 3500,
        },
      ];

      for (const pres of presupuestos) {
        await supabase.from('presupuestos').insert({
          usuario_id: userId,
          ...pres,
        });
      }
      console.log(`✅ ${presupuestos.length} presupuestos creados`);
    }

    // 7. Crear metas
    console.log('\n🎯 Creando metas de prueba...');
    const metas = [
      {
        nombre: 'Viaje a Europa',
        descripcion: 'Ahorro para viaje de verano',
        monto_objetivo: 100000,
        monto_actual: 25000,
        fecha_objetivo: new Date(2026, 6, 1).toISOString().split('T')[0],
        estado: 'activa',
      },
      {
        nombre: 'Nuevo Laptop',
        descripcion: 'Ahorrar para una laptop gaming',
        monto_objetivo: 80000,
        monto_actual: 10000,
        fecha_objetivo: new Date(2025, 11, 31).toISOString().split('T')[0],
        estado: 'activa',
      },
    ];

    for (const meta of metas) {
      await supabase.from('metas').insert({
        usuario_id: userId,
        ...meta,
      });
    }
    console.log(`✅ ${metas.length} metas creadas`);

    // 8. Crear cotizaciones
    console.log('\n💱 Creando cotizaciones de prueba...');
    const cotizaciones = [
      {
        moneda_origen: 'ARS',
        moneda_destino: 'USD',
        tasa_cambio: 0.0025,
        fecha_vigencia: new Date().toISOString().split('T')[0],
        es_vigente: true,
      },
      {
        moneda_origen: 'USD',
        moneda_destino: 'ARS',
        tasa_cambio: 400,
        fecha_vigencia: new Date().toISOString().split('T')[0],
        es_vigente: true,
      },
      {
        moneda_origen: 'ARS',
        moneda_destino: 'BTC',
        tasa_cambio: 0.00000006,
        fecha_vigencia: new Date().toISOString().split('T')[0],
        es_vigente: true,
      },
    ];

    for (const cot of cotizaciones) {
      await supabase.from('cotizaciones').insert({
        usuario_id: userId,
        ...cot,
      });
    }
    console.log(`✅ ${cotizaciones.length} cotizaciones creadas`);

    console.log('\n✨ ¡Seed de datos de prueba completado!\n');
    console.log('📧 Email: prueba@finanzas.com');
    console.log('🔑 Contraseña: Prueba123!');
    console.log('\nPuede iniciar sesión en la app ahora.');
  } catch (error) {
    console.error('❌ Error en seed:', error);
    process.exit(1);
  }
}

seedTestData();
