import { createClient } from '@supabase/supabase-js';

// Valores fixos para desenvolvimento, caso as variáveis de ambiente não estejam disponíveis
const fallbackUrl = 'https://pgxhgbjtrcokvvriynng.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBneGhnYmp0cmNva3Z2cml5bm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyMTA1NjksImV4cCI6MjA1Nzc4NjU2OX0.r-RHsILsNSCEfH3UUFT21wDmYUKP8Bs1EvfnmcO6oMU';

// Tentar obter das variáveis de ambiente primeiro
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallbackUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || fallbackKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Variáveis de ambiente do Supabase não encontradas, usando valores padrão');
}

// Remover espaços ou quebras de linha que possam estar nas variáveis de ambiente
const cleanUrl = supabaseUrl.trim();
const cleanKey = supabaseAnonKey.trim();

console.log('Inicializando Supabase com URL:', cleanUrl);

export const supabase = createClient(cleanUrl, cleanKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'musicsheet-auth-token',
    flowType: 'pkce',
    debug: true
  }
});

// URL do serviço de conversão no Render.com
export const CONVERSION_API_URL = import.meta.env.VITE_CONVERSION_API_URL || 'https://sheet-conversion-api.onrender.com';