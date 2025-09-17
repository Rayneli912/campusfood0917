import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

// PUT - 更新新聞
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const { title, content, source, isPublished, image_url, quantity, deadline, note } = body

    if (!title || !content || !source) {
      return NextResponse.json(
        { error: "標題、內容和來源為必填項目" },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("near_expiry_posts")
      .update({
        location: title,
        content,
        source,
        status: isPublished ? "published" : "draft",
        image_url: image_url || null,
      })
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      console.error("更新新聞失敗:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "找不到指定的新聞" }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("API 錯誤:", error)
    return NextResponse.json({ error: "內部服務器錯誤" }, { status: 500 })
  }
}

// DELETE - 刪除新聞
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabaseAdmin
      .from("near_expiry_posts")
      .delete()
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      console.error("刪除新聞失敗:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "找不到指定的新聞" }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("API 錯誤:", error)
    return NextResponse.json({ error: "內部服務器錯誤" }, { status: 500 })
  }
}
