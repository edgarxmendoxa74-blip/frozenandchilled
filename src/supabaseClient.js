import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

// Enhanced debug logging for configuration issues
console.log('🔧 Supabase Client Configuration:');
console.log('📍 URL:', supabaseUrl ? '✅ Present' : '❌ MISSING');
console.log('🔑 Key:', supabaseAnonKey ? '✅ Present' : '❌ MISSING');

// Strict validation - throw errors to prevent silent failures
if (!supabaseUrl) {
    throw new Error('❌ SUPABASE CONFIGURATION ERROR: Missing VITE_SUPABASE_URL. Check your .env file!');
}

if (!supabaseAnonKey) {
    throw new Error('❌ SUPABASE CONFIGURATION ERROR: Missing VITE_SUPABASE_ANON_KEY. Check your .env file!');
}

// Accept both the legacy JWT anon key ("eyJ...") and the new publishable key ("sb_publishable_...").
if (!supabaseAnonKey.startsWith('eyJ') && !supabaseAnonKey.startsWith('sb_publishable_')) {
    throw new Error('❌ INVALID SUPABASE KEY: use the anon (eyJ...) or publishable (sb_publishable_...) key, never the secret/service key.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
