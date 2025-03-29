import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

export const supabase = createClient(
    window._env_.SUPABASE_URL,
    window._env_.SUPABASE_KEY
); 