import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body

    // 驗證必填欄位
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "請填寫帳號和密碼" },
        { status: 400 }
      )
    }

    // 從資料庫獲取管理員資料
    const { data: admin, error } = await supabaseAdmin
      .from("admins")
      .select("*")
      .eq("username", username)
      .single()

    if (error || !admin) {
      return NextResponse.json(
        { success: false, message: "帳號或密碼錯誤" },
        { status: 401 }
      )
    }

    // 驗證密碼
    const passwordMatch = await bcrypt.compare(password, admin.password_hash)

    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, message: "帳號或密碼錯誤" },
        { status: 401 }
      )
    }

    // 登入成功，不返回密碼
    const { password_hash: _, ...adminData } = admin

    return NextResponse.json({
      success: true,
      message: "登入成功",
      admin: adminData,
    })
  } catch (error) {
    console.error("管理員登入錯誤:", error)
    return NextResponse.json(
      { success: false, message: "登入時發生錯誤" },
      { status: 500 }
    )
  }
}
