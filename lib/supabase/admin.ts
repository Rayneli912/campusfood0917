// /lib/supabase/admin.ts
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL")
if (!SERVICE_ROLE) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")

export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: 'public' },
  global: {
    headers: {
      'x-connection-encrypted': 'true',
    },
  },
})
