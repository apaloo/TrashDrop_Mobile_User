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
  // 1. Try direct environment variables first (Vite/Node)
  if (typeof import.meta !== 'undefined' && import.meta.env?.[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key];
  }

  // 2. Try window variables
  if (typeof window !== 'undefined' && window[key]) {
    return window[key];
  }

  // 3. Try meta tags with different naming conventions
  if (typeof document !== 'undefined') {
    // Try exact match first
    let meta = document.querySelector(`meta[name="${key}"]`);
    if (meta) return meta.getAttribute('content');
    
    // Try kebab-case (SUPABASE_URL -> supabase-url)
    const kebabKey = key.toLowerCase().replace(/_/g, '-');
    meta = document.querySelector(`meta[name="${kebabKey}"]`);
    if (meta) return meta.getAttribute('content');
    
    // Try lowercase
    meta = document.querySelector(`meta[name="${key.toLowerCase()}"]`);
    if (meta) return meta.getAttribute('content');
  }

  return '';
}

const SUPABASE_URL = getSupabaseEnv('SUPABASE_URL');
const SUPABASE_KEY = getSupabaseEnv('SUPABASE_ANON_KEY');

// Debug: Log the values being read
console.log('[Supabase Debug] SUPABASE_URL:', SUPABASE_URL);
console.log('[Supabase Debug] SUPABASE_KEY:', SUPABASE_KEY ? '***KEY PRESENT***' : 'MISSING');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('[Supabase] URL / Key missing – API calls will fail.');
  console.warn('[Supabase] Check if meta tags are properly set in the HTML head');
  
  // Try to find any meta tags for debugging
  const metaTags = document.getElementsByTagName('meta');
  console.log('[Supabase Debug] Found meta tags:', Array.from(metaTags).map(tag => ({
    name: tag.name || tag.getAttribute('name'),
    content: tag.content ? '***' + tag.content.slice(-10) : 'empty'
  })));
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
});

export default supabase;
