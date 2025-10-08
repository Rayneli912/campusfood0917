import { NextResponse } from "next/server"
import { UserService } from "@/lib/db/user-service"

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

    // 登入
    const result = await UserService.login(username, password)

    if (result.success && result.user) {
      return NextResponse.json({
        success: true,
        message: "登入成功",
        user: result.user,
      })
    } else {
      return NextResponse.json(
        { success: false, message: result.message || "登入失敗" },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error("用戶登入錯誤:", error)
    return NextResponse.json(
      { success: false, message: "登入時發生錯誤" },
      { status: 500 }
    )
  }
}
