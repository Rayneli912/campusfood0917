import { NextResponse } from "next/server"
import { StoreService } from "@/lib/db/store-service"

// 獲取待審核店家列表
export async function GET() {
  try {
    const pendingStores = await StoreService.getAllPendingStores()
    return NextResponse.json({ success: true, pendingStores })
  } catch (error) {
    console.error("獲取待審核店家列表錯誤:", error)
    return NextResponse.json(
      { success: false, message: "獲取待審核店家列表失敗" },
      { status: 500 }
    )
  }
}
