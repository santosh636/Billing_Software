// frontend/services/SupabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bdwoiwrpqmxymqdbbfcw.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkd29pd3JwcW14eW1xZGJiZmN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NTc1OTQsImV4cCI6MjA2NzIzMzU5NH0.ZEDa9m9WCOCg4aFomvSHxXMXzIhIvelvjEtpH1ZnUoo'
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
