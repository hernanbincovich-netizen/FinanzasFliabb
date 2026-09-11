#!/usr/bin/env node

/**
 * Script de migración: SQLite (VersionInicialOK/finanzas.sqlite) → Supabase (PostgreSQL)
 *
 * Uso:
 *   node scripts/migrate.js --source ./path/to/finanzas.sqlite --dry-run
 *   node scripts/migrate.js --source ./path/to/finanzas.sqlite --execute
 *
 * Características:
 * - Idempotente: puede correrse varias veces sin duplicar datos
 * - Respeta dependencias de FK (integrantes → categorias → cuentas → ...)
 * - Preserva IDs originales (no crea mapeo)
 * - Modo --dry-run para previsualizaciones
 * - Modo --reset para truncate de tablas (usar con cuidado)
 */

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { createClient } from '@supabase/supabase-js';

// Config
const args = process.argv.slice(2);
const sourceFile = args.includes('--source')
  ? args[args.indexOf('--source') + 1]
  : './VersionInicialOK/finanzas.sqlite';
const dryRun = args.includes('--dry-run');
const reset = args.includes('--reset');
const execute = args.includes('--execute') || (!dryRun && !reset);

console.log(`
╔════════════════════════════════════════╗
║   MIGRACIÓN SQLite → Supabase         ║
╚════════════════════════════════════════╝

Archivo origen: ${sourceFile}
Modo: ${dryRun ? 'DRY-RUN (sin escribir)' : execute ? 'EXECUTE (escribir)' : 'PREVIEW'}
Reset primero: ${reset ? 'SÍ' : 'NO'}
`);

// Verificar archivo origen existe
if (!fs.existsSync(sourceFile)) {
  console.error(`❌ Archivo no encontrado: ${sourceFile}`);
  process.exit(1);
}

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY requeridas en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Abrir BD origen
const sqlite = new Database(sourceFile, { readonly: true });

async function migrateData() {
  try {
    // Reset si se pide
    if (reset && !dryRun) {
      console.log('🗑️  Truncando tablas de negocio...');
      const tablesToTruncate = [
        'meta_aportes', 'metas', 'cotizaciones', 'presupuesto_efectivo',
        'movimientos', 'saldos_cuenta', 'conceptos', 'cuentas', 'periodos',
        'categorias', 'integrantes', 'settings'
      ];
      for (const table of tablesToTruncate) {
        await supabase.from(table).delete().neq('id', -1);
        console.log(`   ✓ ${table} truncado`);
      }
    }

    // Orden de migración (respetar FK)
    const migrationOrder = [
      'settings',
      'integrantes',
      'categorias',
      'cuentas',
      'periodos',
      'conceptos',
      'movimientos',
      'saldos_cuenta',
      'cotizaciones',
      'metas',
      'meta_aportes',
      'presupuesto_efectivo'
    ];

    let totalRows = 0;

    for (const table of migrationOrder) {
      const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();

      if (rows.length === 0) {
        console.log(`📋 ${table}: 0 filas (vacío)`);
        continue;
      }

      console.log(`📋 ${table}: ${rows.length} filas`);

      if (dryRun) {
        console.log(`   (DRY-RUN: no se escribiría nada)`);
        totalRows += rows.length;
        continue;
      }

      // Migrar filas
      for (const row of rows) {
        // Convertir campos booleanos (SQLite: 0/1 → Postgres: boolean)
        const convertedRow = convertBooleans(table, row);

        // Upsert: si el ID existe, actualiza; si no, inserta
        const { error } = await supabase
          .from(table)
          .upsert([convertedRow], { onConflict: 'id' });

        if (error) {
          console.error(`   ❌ Error en ${table} ID ${row.id}:`, error.message);
          // Continuar de todas formas
        }
      }

      console.log(`   ✓ ${rows.length} filas migradas`);
      totalRows += rows.length;
    }

    console.log(`
✅ Migración completada
   Total de filas: ${totalRows}
   ${dryRun ? '(DRY-RUN: no se escribió nada)' : '(datos escribidos en Supabase)'}
    `);

  } catch (err) {
    console.error('❌ Error durante migración:', err);
    process.exit(1);
  } finally {
    sqlite.close();
  }
}

/**
 * Convertir campos booleanos de SQLite (0/1) a Postgres (boolean)
 */
function convertBooleans(table, row) {
  const booleanFields = {
    cuentas: ['activa'],
    conceptos: ['es_agrupado', 'es_recurrente', 'activo'],
    movimientos: ['vino_de_recurrente'],
    // Agregar otros si es necesario
  };

  const fields = booleanFields[table] || [];
  const converted = { ...row };

  for (const field of fields) {
    if (field in converted) {
      converted[field] = converted[field] === 1 ? true : false;
    }
  }

  return converted;
}

// Ejecutar
migrateData().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
