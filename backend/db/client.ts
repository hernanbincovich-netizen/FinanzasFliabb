import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseAdminInstance: SupabaseClient | null = null;
let supabaseAnonInstance: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminInstance) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY requeridas');
    }

    supabaseAdminInstance = createClient(url, key);
  }
  return supabaseAdminInstance;
}

export function getSupabaseAnon(): SupabaseClient | null {
  if (supabaseAnonInstance === undefined) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;

    if (url && key) {
      supabaseAnonInstance = createClient(url, key);
    } else {
      supabaseAnonInstance = null;
    }
  }
  return supabaseAnonInstance;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get: (target, prop) => {
    return (getSupabaseAdmin() as any)[prop];
  },
});

export const supabaseAnon = new Proxy({} as SupabaseClient | null, {
  get: (target, prop) => {
    const anon = getSupabaseAnon();
    return anon ? (anon as any)[prop] : undefined;
  },
});

export default supabaseAdmin;
