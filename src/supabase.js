import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("🔍 URL Check:", supabaseUrl);
console.log("🔑 Key Check:", supabaseKey ? "Key is loaded!" : "KEY IS UNDEFINED!");

export const supabase = createClient(supabaseUrl, supabaseKey);