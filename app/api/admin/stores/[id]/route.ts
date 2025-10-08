import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import bcrypt from "bcryptjs"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: storeId } = await params
  try {

    if (!storeId) {
      return NextResponse.json(
        { success: false, message: "缺少店家 ID" },
        { status: 400 }
      )
    }

    // 載入店家基本資料
    const { data: storeData, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("*")
      .eq("id", storeId)
      .single()

    if (storeError) {
      console.error("獲取店家資料錯誤:", storeError)
      return NextResponse.json(
        { success: false, message: "找不到店家" },
        { status: 404 }
      )
    }

    // 載入商品列表
    const { data: productData } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })

    // 載入訂單記錄
    const { data: orderData } = await supabaseAdmin
      .from("orders")
      .select("*, users(name)")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })

    return NextResponse.json({
      success: true,
      store: storeData,
      products: productData || [],
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

// PATCH: 管理员更新店家资料
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: storeId } = await params
  try {
    const body = await request.json()
    const {
      username,
      password,
      name,
      description,
      location,
      phone,
      email,
      business_hours,
      store_code,
      status,
    } = body

    console.log("📝 管理员更新店家资料:", { storeId, body })

    // 检查店家是否存在
    const { data: existingStore } = await supabaseAdmin
      .from("stores")
      .select("id, username")
      .eq("id", storeId)
      .single()

    if (!existingStore) {
      return NextResponse.json(
        { success: false, message: "找不到店家" },
        { status: 404 }
      )
    }

    // 如果更新用户名，检查是否已存在
    if (username && username !== existingStore.username) {
      const { data: duplicateStore } = await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("username", username)
        .neq("id", storeId)
        .single()

      if (duplicateStore) {
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
    if (description !== undefined) updateData.description = description
    if (location !== undefined) updateData.location = location
    if (phone !== undefined) updateData.phone = phone
    if (email !== undefined) updateData.email = email
    if (business_hours !== undefined) updateData.business_hours = business_hours
    if (store_code !== undefined) updateData.store_code = store_code
    if (status !== undefined) updateData.status = status

    // 如果更新密码，需要加密
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10)
      updateData.password = password // 保留明文（测试用）
    }

    // 更新店家资料
    const { data: updatedStore, error } = await supabaseAdmin
      .from("stores")
      .update(updateData)
      .eq("id", storeId)
      .select()
      .single()

    if (error) {
      console.error("❌ 更新店家资料错误:", error)
      return NextResponse.json(
        { success: false, message: `更新失败: ${error.message}` },
        { status: 500 }
      )
    }

    console.log("✅ 管理员更新店家资料成功")

    return NextResponse.json({
      success: true,
      message: "更新成功",
      store: updatedStore,
    })
  } catch (error: any) {
    console.error("❌ API 错误:", error)
    return NextResponse.json(
      { success: false, message: error.message || "服务器错误" },
      { status: 500 }
    )
  }
}
