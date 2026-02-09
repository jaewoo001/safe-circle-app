import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// If these are missing, the app will throw that error
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase Environment Variables!");
}

export const supabase = createClient(
  supabaseUrl || '', 
  supabaseKey || ''
);