import { NextResponse } from "next/server"
import { StoreService } from "@/lib/db/store-service"

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
    const result = await StoreService.login(username, password)

    if (result.success && result.store) {
      console.log("✅ 登入成功，准备设置 cookie:", {
        storeId: result.store.id,
        storeName: result.store.name,
        nodeEnv: process.env.NODE_ENV
      })

      // ✅ 创建响应并设置 httpOnly cookie
      const response = NextResponse.json({
        success: true,
        message: "登入成功",
        store: result.store,
      })

      // ✅ 设置会话 cookie（httpOnly，secure，7天过期）
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        maxAge: 60 * 60 * 24 * 7, // 7天
        path: "/",
      }
      
      console.log("🍪 Cookie 配置:", cookieOptions)
      response.cookies.set("store_session", result.store.id, cookieOptions)
      console.log("✅ Cookie 已设置")

      return response
    } else {
      return NextResponse.json(
        { success: false, message: result.message || "登入失敗" },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error("店家登入錯誤:", error)
    return NextResponse.json(
      { success: false, message: "登入時發生錯誤" },
      { status: 500 }
    )
  }
}
