// /lib/supabase/admin.ts
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL")
if (!SERVICE_ROLE) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")

// ★ 使用直接連接 URL（如果有設定），繞過連接池快取
const connectionUrl = process.env.SUPABASE_DIRECT_URL || SUPABASE_URL

export const supabaseAdmin = createClient(connectionUrl, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: 'public' },
})
