import { NextResponse } from "next/server"
import { UserService } from "@/lib/db/user-service"

// 獲取所有用戶
export async function GET() {
  try {
    const users = await UserService.getAllUsers()
    return NextResponse.json({ success: true, users })
  } catch (error) {
    console.error("獲取用戶列表錯誤:", error)
    return NextResponse.json(
      { success: false, message: "獲取用戶列表失敗" },
      { status: 500 }
    )
  }
}

// 刪除用戶
export async function DELETE(request: Request) {
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "缺少用戶 ID" },
        { status: 400 }
      )
    }

    const result = await UserService.deleteUser(userId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("刪除用戶錯誤:", error)
    return NextResponse.json(
      { success: false, message: "刪除用戶失敗" },
      { status: 500 }
    )
  }
}

