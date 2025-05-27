/*
  Supabase Client Initialization
  This module centralizes the Supabase client so that all services share a single
  instance. The URL and anonymous key are injected at build / deploy time using
  environment variables (recommended) or at runtime via <meta> tags (fallback).

  Usage:
    import supabase from './supabaseClient.js';
    const { data, error } = await supabase.from('profiles').select('*');
*/

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';

function getSupabaseEnv(key) {
  // 1. Vite / modern bundlers (import.meta.env)
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }

  // 2. Node / SSR process.env (during server-side rendering)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }

  // 3. Global variable injected on window (legacy)
  if (typeof window !== 'undefined' && window[key]) {
    return window[key];
  }

  // 4. <meta name="supabase-url" content="..."> fallback for static hosting
  const meta = (typeof document !== 'undefined') ? document.querySelector(`meta[name="${key.replace(/_/g, '-').toLowerCase()}"]`) : null;
  return meta ? meta.getAttribute('content') : '';
}

const SUPABASE_URL = getSupabaseEnv('SUPABASE_URL');
const SUPABASE_KEY = getSupabaseEnv('SUPABASE_ANON_KEY');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('[Supabase] URL / Key missing – API calls will fail.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
});

export default supabase;
