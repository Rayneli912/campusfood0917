import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const TABLE = "near_expiry_posts"

// 轉型工具：quantity -> number|null
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

// PUT - 更新新聞
export async function PUT(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const id = ctx?.params?.id
    if (!id) return NextResponse.json({ error: "缺少參數 id" }, { status: 400 })

    const body = await req.json().catch(() => ({}))
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
      quantity: toIntOrNull(quantity),
      deadline: deadline ? String(deadline).trim() || null : null,
      note: note ? String(note).trim() || null : null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update(patch)
      .eq("id", id)
      .select()
      .maybeSingle()

    if (error) {
      console.error("[PUT /api/news/:id] supabase error:", error, "patch:", patch)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) return NextResponse.json({ error: "找不到指定的新聞" }, { status: 404 })

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error("[PUT /api/news/:id] fatal:", error)
    return NextResponse.json({ error: "內部服務器錯誤" }, { status: 500 })
  }
}

// DELETE - 刪除新聞
export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const id = ctx?.params?.id
    if (!id) return NextResponse.json({ error: "缺少參數 id" }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .delete()
      .eq("id", id)
      .select()
      .maybeSingle()

    if (error) {
      console.error("[DELETE /api/news/:id] supabase error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) return NextResponse.json({ error: "找不到指定的新聞" }, { status: 404 })

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error("[DELETE /api/news/:id] fatal:", error)
    return NextResponse.json({ error: "內部服務器錯誤" }, { status: 500 })
  }
}
