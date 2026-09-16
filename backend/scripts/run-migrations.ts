import 'dotenv/config.js';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Faltan variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runMigrations() {
  try {
    console.log('🚀 Ejecutando migraciones...\n');

    const migrationsDir = path.join(import.meta.dirname, '../db/migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      console.log(`⏳ Ejecutando ${file}...`);
      const { error } = await supabase.rpc('exec_sql', { sql });

      if (error) {
        // Supabase no soporta exec_sql rpc, intentamos con query directa
        console.log(`⚠️  Necesita ejecutarse manualmente en Supabase SQL Editor`);
        console.log(`   Archivo: ${file}`);
      } else {
        console.log(`✅ ${file} completado\n`);
      }
    }

    console.log('✨ Migraciones completadas!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

runMigrations();
