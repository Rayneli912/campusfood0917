import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

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

// PUT - 更新新聞（含 quantity / deadline / note）
export async function PUT(req: Request, ctx: { params: { id?: string } }) {
  try {
    const id = ctx?.params?.id
    if (!id) return NextResponse.json({ error: "缺少參數 id" }, { status: 400 })

    const body = await req.json().catch(() => ({} as any))
    const {
      title,
      location: locInBody,
      content,
      source,
      isPublished,
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

    const patch = {
      location,
      content: String(content),
      source: String(source),
      status: isPublished ? "published" : "draft",
      image_url: image_url ? String(image_url) : null,
      quantity: quantity ? String(quantity).trim() : null, // ★ 改为字符串，支持任意文本
      deadline: deadline ? String(deadline) : null,
      note: note ? String(note) : null,
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update(patch)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: "找不到指定的新聞" }, { status: 404 })

    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error: any) {
    console.error("API PUT /api/news/[id] error:", error)
    return NextResponse.json(
      { error: error?.message || "INTERNAL_ERROR" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    )
  }
}

// DELETE - 刪除新聞
export async function DELETE(_req: Request, ctx: { params: { id?: string } }) {
  try {
    const id = ctx?.params?.id
    if (!id) return NextResponse.json({ error: "缺少參數 id" }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .delete()
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: "找不到指定的新聞" }, { status: 404 })

    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error: any) {
    console.error("API DELETE /api/news/[id] error:", error)
    return NextResponse.json(
      { error: error?.message || "INTERNAL_ERROR" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    )
  }
}
