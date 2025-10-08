import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

// 获取用户近期浏览
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || req.nextUrl.searchParams.get("userId")
    
    if (!userId) {
      return NextResponse.json({ items: [] })
    }

    const { data, error } = await supabaseAdmin
      .from("recent_views")
      .select("*")
      .eq("user_id", userId)
      .order("viewed_at", { ascending: false })
      .limit(20)

    if (error) {
      console.error("获取近期浏览错误:", error)
      return NextResponse.json({ items: [] })
    }

    // ✅ 获取店家名称
    const storeIds = [...new Set((data || []).map((item: any) => item.store_id))]
    const { data: stores } = await supabaseAdmin
      .from("stores")
      .select("id, name")
      .in("id", storeIds)

    const items = (data || []).map((item: any) => {
      const store = stores?.find((s: any) => s.id === item.store_id)
      return {
        id: item.store_id,
        type: "store",
        name: store?.name || "",
        viewedAt: item.viewed_at,
      }
    })

    return NextResponse.json({ items })
  } catch (e) {
    console.error("获取近期浏览错误:", e)
    return NextResponse.json({ items: [] })
  }
}

// 添加近期浏览
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const userId = req.headers.get("x-user-id")
    
    if (!userId || !body.id) {
      return NextResponse.json({ items: [] }, { status: 400 })
    }

    // 删除旧记录（避免重复）
    await supabaseAdmin
      .from("recent_views")
      .delete()
      .eq("user_id", userId)
      .eq("store_id", body.id)

    // 插入新记录
    await supabaseAdmin
      .from("recent_views")
      .insert({
        user_id: userId,
        store_id: body.id,
        viewed_at: new Date().toISOString(),
      })

    // 保持最多20条
    const { data: all } = await supabaseAdmin
      .from("recent_views")
      .select("id")
      .eq("user_id", userId)
      .order("viewed_at", { ascending: false })

    if (all && all.length > 20) {
      const idsToDelete = all.slice(20).map((item: any) => item.id)
      await supabaseAdmin
        .from("recent_views")
        .delete()
        .in("id", idsToDelete)
    }

    // 返回更新后的列表
    const { data } = await supabaseAdmin
      .from("recent_views")
      .select("*")
      .eq("user_id", userId)
      .order("viewed_at", { ascending: false })
      .limit(20)

    // ✅ 获取店家名称
    const storeIds = [...new Set((data || []).map((item: any) => item.store_id))]
    const { data: stores } = await supabaseAdmin
      .from("stores")
      .select("id, name")
      .in("id", storeIds)

    const items = (data || []).map((item: any) => {
      const store = stores?.find((s: any) => s.id === item.store_id)
      return {
        id: item.store_id,
        type: "store",
        name: store?.name || "",
        viewedAt: item.viewed_at,
      }
    })

    return NextResponse.json({ items })
  } catch (e) {
    console.error("添加近期浏览错误:", e)
    return NextResponse.json({ items: [] }, { status: 500 })
  }
}

// 清空近期浏览
export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id")
    
    if (!userId) {
      return NextResponse.json({ items: [] }, { status: 400 })
    }

    await supabaseAdmin
      .from("recent_views")
      .delete()
      .eq("user_id", userId)

    return NextResponse.json({ items: [] })
  } catch (e) {
    console.error("清空近期浏览错误:", e)
    return NextResponse.json({ items: [] }, { status: 500 })
  }
}
