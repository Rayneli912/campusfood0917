import { NextResponse } from "next/server"
import { UserService } from "@/lib/db/user-service"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password, name, email, phone, department } = body

    // 驗證必填欄位
    if (!username || !password || !name || !phone || !department) {
      return NextResponse.json(
        { success: false, message: "請填寫所有必填欄位" },
        { status: 400 }
      )
    }

    // 檢查帳號是否已存在
    const usernameExists = await UserService.checkUsernameExists(username)
    if (usernameExists) {
      return NextResponse.json(
        { success: false, message: "該帳號已被使用" },
        { status: 400 }
      )
    }

    // 檢查手機號碼是否已被使用
    const phoneExists = await UserService.checkPhoneExists(phone)
    if (phoneExists) {
      return NextResponse.json(
        { success: false, message: "此手機號碼已被註冊" },
        { status: 400 }
      )
    }

    // 檢查電子郵件是否已被使用（如果有填寫）
    if (email) {
      const emailExists = await UserService.checkEmailExists(email)
      if (emailExists) {
        return NextResponse.json(
          { success: false, message: "此電子郵件已被註冊" },
          { status: 400 }
        )
      }
    }

    // 註冊用戶
    const result = await UserService.register({
      username,
      password,
      name,
      email: email || "",
      phone,
      department,
    })

    if (result.success && result.user) {
      return NextResponse.json({
        success: true,
        message: "註冊成功",
        user: result.user,
      })
    } else {
      return NextResponse.json(
        { success: false, message: result.message || "註冊失敗" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("用戶註冊錯誤:", error)
    return NextResponse.json(
      { success: false, message: "註冊時發生錯誤" },
      { status: 500 }
    )
  }
}
