import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dlremwjxduwfnpuotzqz.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_swIABgiSKGs4ZPyXfyUfXg_Z-Pcfj0R';

export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
