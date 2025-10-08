import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

// 获取用户收藏
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "缺少用户 ID" },
        { status: 400 }
      )
    }

    // 获取收藏店家，包含店家详情
    const { data, error } = await supabaseAdmin
      .from("favorites")
      .select(`
        id,
        user_id,
        store_id,
        created_at,
        stores (
          id,
          name,
          description,
          location,
          category,
          rating,
          cover_image,
          is_disabled
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching favorites:", error)
      return NextResponse.json(
        { success: false, message: "无法载入收藏" },
        { status: 500 }
      )
    }

    // 转换为前端格式
    const favorites = (data || []).map((item: any) => ({
      id: item.store_id,
      name: item.stores?.name || "",
      description: item.stores?.description || "",
      location: item.stores?.location || "",
      category: item.stores?.category || "餐厅",
      rating: item.stores?.rating || 4.5,
      coverImage: item.stores?.cover_image,
      addedAt: item.created_at,
    }))

    return NextResponse.json({
      success: true,
      favorites,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 }
    )
  }
}

// 添加收藏
export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("📥 收藏 API - 收到请求 body:", body)
    
    const { userId, storeId } = body
    console.log("📥 收藏 API - userId:", userId, "storeId:", storeId)

    if (!userId || !storeId) {
      console.error("❌ 缺少必填参数 - userId:", userId, "storeId:", storeId)
      return NextResponse.json(
        { success: false, message: `缺少必填参数 (userId: ${!!userId}, storeId: ${!!storeId})` },
        { status: 400 }
      )
    }

    // 检查店家是否存在
    console.log("🔍 检查店家是否存在:", storeId)
    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("id", storeId)
      .single()

    if (storeError) {
      console.error("❌ 查询店家错误:", storeError)
    }

    if (!store) {
      console.error("❌ 店家不存在:", storeId)
      return NextResponse.json(
        { success: false, message: "店家不存在" },
        { status: 404 }
      )
    }
    
    console.log("✅ 店家存在:", store)

    // 使用 upsert 插入（避免重复）
    console.log("🔍 插入收藏记录 - user_id:", userId, "store_id:", storeId)
    const { error } = await supabaseAdmin
      .from("favorites")
      .upsert({
        user_id: userId,
        store_id: storeId,
      }, {
        onConflict: 'user_id,store_id',
        ignoreDuplicates: true
      })

    if (error) {
      console.error("❌ 添加收藏错误:", error)
      console.error("错误详情 - code:", error.code, "message:", error.message, "details:", error.details)
      return NextResponse.json(
        { 
          success: false, 
          message: `添加收藏失败: ${error.message || error.code || '未知错误'}`, 
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          }
        },
        { status: 500 }
      )
    }
    
    console.log("✅ 收藏插入成功")

    // 返回更新后的收藏列表
    const { data } = await supabaseAdmin
      .from("favorites")
      .select(`
        id,
        store_id,
        created_at,
        stores (
          id,
          name,
          description,
          location,
          category,
          rating,
          cover_image
        )
      `)
      .eq("user_id", userId)

    const favorites = (data || []).map((item: any) => ({
      id: item.store_id,
      name: item.stores?.name || "",
      description: item.stores?.description || "",
      location: item.stores?.location || "",
      category: item.stores?.category || "餐厅",
      rating: item.stores?.rating || 4.5,
      coverImage: item.stores?.cover_image,
      addedAt: item.created_at,
    }))

    return NextResponse.json({
      success: true,
      message: "已添加到收藏",
      favorites,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 }
    )
  }
}

// 取消收藏
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const storeId = searchParams.get("storeId")

    if (!userId || !storeId) {
      return NextResponse.json(
        { success: false, message: "缺少必填参数" },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("store_id", storeId)

    if (error) {
      console.error("Error removing favorite:", error)
      return NextResponse.json(
        { success: false, message: "取消收藏失败" },
        { status: 500 }
      )
    }

    // 返回更新后的收藏列表
    const { data } = await supabaseAdmin
      .from("favorites")
      .select(`
        id,
        store_id,
        created_at,
        stores (
          id,
          name,
          description,
          location,
          category,
          rating,
          cover_image
        )
      `)
      .eq("user_id", userId)

    const favorites = (data || []).map((item: any) => ({
      id: item.store_id,
      name: item.stores?.name || "",
      description: item.stores?.description || "",
      location: item.stores?.location || "",
      category: item.stores?.category || "餐厅",
      rating: item.stores?.rating || 4.5,
      coverImage: item.stores?.cover_image,
      addedAt: item.created_at,
    }))

    return NextResponse.json({
      success: true,
      message: "已取消收藏",
      favorites,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 }
    )
  }
}

