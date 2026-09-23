import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

// Enhanced debug logging for configuration issues
console.log('🔧 Supabase Client Configuration:');
console.log('📍 URL:', supabaseUrl || '❌ MISSING');
console.log('🔑 Key (first 10 chars):', supabaseAnonKey?.substring(0, 10) + '...' || '❌ MISSING');
console.log('🔑 Key length:', supabaseAnonKey?.length || 0);
console.log('🔑 Key starts with "eyJ":', supabaseAnonKey?.startsWith('eyJ') || false);

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ SUPABASE CONFIGURATION ERROR:');
    console.error('Missing URL or key. Check your .env file!');
    console.error('URL present:', !!supabaseUrl);
    console.error('Key present:', !!supabaseAnonKey);
} else if (!supabaseAnonKey.startsWith('eyJ')) {
    console.error('❌ INVALID SUPABASE KEY:');
    console.error('Supabase anon keys should start with "eyJ" (JWT format)');
    console.error('Current key starts with:', supabaseAnonKey.substring(0, 10));
    console.error('Key length:', supabaseAnonKey.length, '(should be 500+ chars)');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
