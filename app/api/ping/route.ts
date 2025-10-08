// app/api/ping/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => cookieStore.get(key)?.value,
        set: (key, value, options) => cookieStore.set(key, value, options),
        remove: (key, options) => cookieStore.set(key, '', { ...options, maxAge: 0 }),
      },
    }
  )

  const { error, count } = await supabase
    .from('stores')
    .select('*', { count: 'exact', head: true })

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, count: count ?? 0 })
}
