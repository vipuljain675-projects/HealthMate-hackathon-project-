import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kywqmkjnavtbpkiarwxt.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_6sV0j01bazYGTYzqJpDSXg_DeThY8Hk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
