import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY requeridas en .env')
}

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
