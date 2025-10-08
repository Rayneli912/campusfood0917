import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import bcrypt from "bcryptjs"

// GET: 获取用户资料
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "缺少用户 ID" },
        { status: 400 }
      )
    }

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", userId)
      .single()

    if (error || !user) {
      return NextResponse.json(
        { success: false, message: "找不到用户" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user,
    })
  } catch (error: any) {
    console.error("获取用户资料错误:", error)
    return NextResponse.json(
      { success: false, message: error.message || "服务器错误" },
      { status: 500 }
    )
  }
}

// PATCH: 更新用户资料
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, ...updates } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "缺少用户 ID" },
        { status: 400 }
      )
    }

    console.log("📝 更新用户资料:", { userId, updates })

    // 如果更新用户名，检查是否已存在
    if (updates.username) {
      const { data: existingUser } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("username", updates.username)
        .neq("id", userId)
        .single()

      if (existingUser) {
        return NextResponse.json(
          { success: false, message: "此帐号已被使用" },
          { status: 400 }
        )
      }
    }

    // 如果更新密码，需要加密
    if (updates.password) {
      updates.password_hash = await bcrypt.hash(updates.password, 10)
      // 保留明文密码（测试用）
      // delete updates.password
    }

    // 更新用户资料
    const { data: updatedUser, error } = await supabaseAdmin
      .from("users")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
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

    console.log("✅ 用户资料更新成功")

    return NextResponse.json({
      success: true,
      message: "更新成功",
      user: updatedUser,
    })
  } catch (error: any) {
    console.error("❌ 更新用户资料错误:", error)
    return NextResponse.json(
      { success: false, message: error.message || "服务器错误" },
      { status: 500 }
    )
  }
}

