import { NextResponse } from "next/server"
import { StoreService } from "@/lib/db/store-service"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password, storeName, description, address, phone, email } = body

    // 驗證必填欄位
    if (!username || !password || !storeName || !phone) {
      return NextResponse.json(
        { success: false, message: "請填寫所有必填欄位" },
        { status: 400 }
      )
    }

    // 檢查帳號是否已存在
    const usernameExists = await StoreService.checkUsernameExists(username)
    if (usernameExists) {
      return NextResponse.json(
        { success: false, message: "該帳號已被使用" },
        { status: 400 }
      )
    }

    // 提交註冊申請
    const result = await StoreService.submitRegistration({
      username,
      password,
      name: storeName,
      description: description || "",
      location: address || "",
      phone,
      email: email || "",
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "註冊申請已提交，請等待管理員審核",
      })
    } else {
      return NextResponse.json(
        { success: false, message: result.message || "註冊失敗" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("店家註冊錯誤:", error)
    return NextResponse.json(
      { success: false, message: "註冊時發生錯誤" },
      { status: 500 }
    )
  }
}
