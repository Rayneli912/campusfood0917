import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

// GET - 獲取新聞
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const includeAll = searchParams.get('includeAll') === 'true' // 管理員可以看到所有貼文
    
    let query = supabaseAdmin
      .from("near_expiry_posts")
      .select("id, created_at, location, content, image_url, status, source")
      .order("created_at", { ascending: false })
    
    // 如果不是管理員請求，只顯示已發布的貼文
    if (!includeAll) {
      query = query.eq('status', 'published')
    }

    const { data, error } = await query

    if (error) {
      console.error("獲取新聞失敗:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("API 錯誤:", error)
    return NextResponse.json({ error: "內部服務器錯誤" }, { status: 500 })
  }
}

// POST - 創建新聞
export async function POST(req: NextRequest) {
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
      .insert({
        location: title,
        content,
        source,
        status: isPublished ? "published" : "draft",
        image_url: image_url || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("創建新聞失敗:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("API 錯誤:", error)
    return NextResponse.json({ error: "內部服務器錯誤" }, { status: 500 })
  }
}
