import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import bcrypt from "bcryptjs"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params
  try {

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "缺少用戶 ID" },
        { status: 400 }
      )
    }

    // 載入用戶基本資料
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", userId)
      .single()

    if (userError) {
      console.error("獲取用戶資料錯誤:", userError)
      return NextResponse.json(
        { success: false, message: "找不到用戶" },
        { status: 404 }
      )
    }

    // 載入我的最愛
    const { data: favData } = await supabaseAdmin
      .from("favorites")
      .select("*, stores(name)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    // 載入近期瀏覽
    const { data: viewData } = await supabaseAdmin
      .from("recent_views")
      .select("*, stores(name)")
      .eq("user_id", userId)
      .order("viewed_at", { ascending: false })
      .limit(20)

    // 載入購物車
    const { data: cartData } = await supabaseAdmin
      .from("cart_items")
      .select("*, products(name, discount_price)")
      .eq("user_id", userId)

    // 載入訂單記錄
    const { data: orderData } = await supabaseAdmin
      .from("orders")
      .select("*, stores(name)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    return NextResponse.json({
      success: true,
      user: userData,
      favorites: favData || [],
      recentViews: viewData || [],
      cartItems: cartData || [],
      orders: orderData || [],
    })
  } catch (error) {
    console.error("API 錯誤:", error)
    return NextResponse.json(
      { success: false, message: "伺服器錯誤" },
      { status: 500 }
    )
  }
}

// PATCH: 管理员更新用户资料
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params
  try {
    const body = await request.json()
    const { username, password, name, email, phone, department, is_disabled } = body

    console.log("📝 管理员更新用户资料:", { userId, body })

    // 检查用户是否存在
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id, username")
      .eq("id", userId)
      .single()

    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: "找不到用户" },
        { status: 404 }
      )
    }

    // 如果更新用户名，检查是否已存在
    if (username && username !== existingUser.username) {
      const { data: duplicateUser } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("username", username)
        .neq("id", userId)
        .single()

      if (duplicateUser) {
        return NextResponse.json(
          { success: false, message: "此帐号已被使用" },
          { status: 400 }
        )
      }
    }

    // 准备更新数据
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (username !== undefined) updateData.username = username
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (department !== undefined) updateData.department = department
    if (is_disabled !== undefined) updateData.is_disabled = is_disabled

    // 如果更新密码，需要加密
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10)
      updateData.password = password // 保留明文（测试用）
    }

    // 更新用户资料
    const { data: updatedUser, error } = await supabaseAdmin
      .from("users")
      .update(updateData)
      .eq("id", userId)
      .select()
      .single()

    if (error) {
      console.error("❌ 更新用户资料错误:", error)
      return NextResponse.json(
        { success: false, message: `更新失败: ${error.message}` },
        { status: 500 }
      )
    }

    console.log("✅ 管理员更新用户资料成功")

    return NextResponse.json({
      success: true,
      message: "更新成功",
      user: updatedUser,
    })
  } catch (error: any) {
    console.error("❌ API 错误:", error)
    return NextResponse.json(
      { success: false, message: error.message || "服务器错误" },
      { status: 500 }
    )
  }
}
