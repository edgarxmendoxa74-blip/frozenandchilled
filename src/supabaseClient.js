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

if (!supabaseAnonKey.startsWith('eyJ')) {
    throw new Error('❌ INVALID SUPABASE KEY: Supabase anon keys should start with "eyJ" (JWT format). Current key starts with: ' + supabaseAnonKey.substring(0, 10));
}

if (supabaseAnonKey.length < 100) {
    throw new Error('❌ INVALID SUPABASE KEY: Key appears too short (should be 500+ chars). Current length: ' + supabaseAnonKey.length);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
