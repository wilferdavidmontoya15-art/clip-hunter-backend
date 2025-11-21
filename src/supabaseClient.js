import { createClient } from '@supabase/supabase-js';

// **IMPORTANTE:** Aquí nos aseguramos de que el proyecto lea las variables del archivo .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY;

// Creamos y exportamos la conexión. Si las llaves no están bien, esta línea falla.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);