import { NextRequest, NextResponse } from "next/server"
import { setDefaultResultOrder } from "dns"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
try { setDefaultResultOrder("ipv4first") } catch {}

const TABLE = "near_expiry_posts"

// 將 quantity 安全轉為 number|null（接受 number|string；不合法=>null）
function toIntOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null
  if (typeof v === "number") return Number.isFinite(v) ? Math.trunc(v) : null
  if (typeof v === "string") {
    const n = Number(v.trim())
    return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null
  }
  return null
}

// OPTIONS（預檢）
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

// GET - 取得貼文（?includeAll=true => 含草稿/已發布；否則只給已發布）
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const includeAll = searchParams.get("includeAll") === "true"

    let query = supabaseAdmin
      .from(TABLE)
      .select(
        "id, created_at, updated_at, location, content, image_url, status, source, quantity, deadline, note, post_token_hash, token_expires_at, line_user_id"
      )
      .order("created_at", { ascending: false })

    if (!includeAll) query = query.eq("status", "published")

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "no-store" } } // 避免被快取到舊資料
    )
  } catch (error: any) {
    console.error("/api/news GET error:", error)
    return NextResponse.json({ error: error?.message || "GET_FAILED" }, { status: 500 })
  }
}

// POST - 管理員建立貼文（允許無數量；自動處理字串數字）
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const {
      title,
      location: locInBody,
      content,
      source = "系統公告",
      isPublished = true,
      image_url,
      quantity,
      deadline,
      note,
    } = body || {}

    // 後台 UI 用的是 title 當地點；也容許直接傳 location
    const location = String((title ?? locInBody) ?? "").trim()
    if (!location || !content || !source) {
      return NextResponse.json(
        { error: "標題/地點、內容、來源為必填" },
        { status: 400 }
      )
    }

    const row = {
      location,
      content: String(content),
      source: String(source),
      status: isPublished ? "published" : "draft",
      image_url: image_url ? String(image_url) : null,
      quantity: toIntOrNull(quantity),
      deadline: deadline ? String(deadline).trim() || null : null,
      note: note ? String(note).trim() || null : null,
      // 管理員建立的貼文不綁 LINE 欄位
      line_user_id: null as string | null,
      post_token_hash: null as string | null,
      token_expires_at: null as string | null,
    }

    const { data, error } = await supabaseAdmin.from(TABLE).insert(row).select().single()
    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error: any) {
    console.error("/api/news POST error:", error)
    return NextResponse.json({ error: error?.message || "CREATE_FAILED" }, { status: 500 })
  }
}
