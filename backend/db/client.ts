import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY requeridas');
}

// Cliente con service role key (acceso admin, para usar en backend)
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey
);

// Cliente anon (para simular cliente frontend, si es necesario)
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
export const supabaseAnon = supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export default supabaseAdmin;
