import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Supabase credentials not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.');
}

// Create Supabase client with auth configuration
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storage: require('@react-native-async-storage/async-storage').default,
    },
    global: {
        headers: {
            'Content-Type': 'application/json',
        },
    },
});

export { supabase };
