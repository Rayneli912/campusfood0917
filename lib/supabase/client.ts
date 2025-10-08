// /lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

// 這個 client 專門給前端（匿名訪客）使用
// 使用 anon key ＋ RLS 保護
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: { persistSession: false }, // 不要在瀏覽器存 session
  }
)
