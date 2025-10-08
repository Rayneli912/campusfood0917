import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

// 获取店家设置
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get("storeId")

    if (!storeId) {
      return NextResponse.json(
        { success: false, message: "缺少店家 ID" },
        { status: 400 }
      )
    }

    // 获取店家信息
    const { data: store, error } = await supabaseAdmin
      .from("stores")
      .select("*")
      .eq("id", storeId)
      .single()

    if (error || !store) {
      return NextResponse.json(
        { success: false, message: "找不到店家" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      store,
    })
  } catch (error) {
    console.error("获取店家设置错误:", error)
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 }
    )
  }
}

// 更新店家设置
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    console.log("📥 收到更新店家設定請求:", body)
    
    const { storeId, businessHours, ...rest } = body

    if (!storeId) {
      return NextResponse.json(
        { success: false, message: "缺少店家 ID" },
        { status: 400 }
      )
    }

    // ✅ 轉換欄位名稱（駝峰 → 蛇形）
    const updateData: any = { ...rest }
    if (businessHours !== undefined) {
      updateData.business_hours = businessHours
    }

    // 如果更新用户名，检查是否已存在
    if (updateData.username) {
      const { data: existingStore } = await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("username", updateData.username)
        .neq("id", storeId)
        .single()

      if (existingStore) {
        return NextResponse.json(
          { success: false, message: "此店家帐号已被使用" },
          { status: 400 }
        )
      }
    }

    // 如果更新密码，需要加密
    if (updateData.password) {
      const bcrypt = require("bcryptjs")
      updateData.password_hash = await bcrypt.hash(updateData.password, 10)
      // 保留明文密码（测试用）
      // updateData.password 保持不变
    }

    console.log("🔄 準備更新店家資料:", { storeId, updateData })

    // 更新店家信息
    const { data: updatedStore, error } = await supabaseAdmin
      .from("stores")
      .update(updateData)
      .eq("id", storeId)
      .select()
      .single()

    if (error) {
      console.error("❌ 更新店家信息错误:", error)
      return NextResponse.json(
        { success: false, message: `更新失败: ${error.message}` },
        { status: 500 }
      )
    }

    console.log("✅ 店家資料更新成功:", updatedStore)

    return NextResponse.json({
      success: true,
      message: "更新成功",
      store: updatedStore,
    })
  } catch (error: any) {
    console.error("❌ 更新店家设置错误:", error)
    return NextResponse.json(
      { success: false, message: error.message || "服务器错误" },
      { status: 500 }
    )
  }
}

