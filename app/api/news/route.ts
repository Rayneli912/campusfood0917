import { NextRequest, NextResponse } from "next/server"
import { setDefaultResultOrder } from "dns"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

try { setDefaultResultOrder("ipv4first") } catch {}

const TABLE = "near_expiry_posts"

function toIntOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null
  if (typeof v === "number") return Number.isFinite(v) ? Math.trunc(v) : null
  if (typeof v === "string") {
    const n = Number(v.trim())
    return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null
  }
  return null
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "no-store",
    },
  })
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const includeAll = searchParams.get("includeAll") === "true"

    let query = supabaseAdmin
      .from(TABLE)
      .select([
        "id",
        "created_at",
        "published_at",   // ★ 新增
        "location",
        "content",
        "image_url",
        "status",
        "source",
        "quantity",
        "deadline",
        "note",
        "post_token_hash",
        "token_expires_at",
        "line_user_id",
      ].join(","))
      .order("published_at", { ascending: false, nullsFirst: false }) // ★ 先看發佈時間
      .order("created_at", { ascending: false })

    if (!includeAll) query = query.eq("status", "published")

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error: any) {
    console.error("/api/news GET error:", error)
    return NextResponse.json(
      { error: error?.message || "GET_FAILED" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    )
  }
}

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
      quantity: quantity ? String(quantity).trim() : null, // ★ 改为字符串，支持任意文本
      deadline: deadline ? String(deadline) : null,
      note: note ? String(note) : null,
      line_user_id: null as string | null,
      post_token_hash: null as string | null,
      token_expires_at: null as string | null,
      published_at: isPublished ? new Date().toISOString() : null, // ★
    }

    const { data, error } = await supabaseAdmin.from(TABLE).insert(row).select().single()
    if (error) throw error

    return NextResponse.json(
      { data },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    )
  } catch (error: any) {
    console.error("/api/news POST error:", error)
    return NextResponse.json(
      { error: error?.message || "CREATE_FAILED" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    )
  }
}
