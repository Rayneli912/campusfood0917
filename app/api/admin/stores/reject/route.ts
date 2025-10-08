import { NextResponse } from "next/server"
import { StoreService } from "@/lib/db/store-service"

// 拒絕店家審核
export async function POST(request: Request) {
  try {
    const { pendingStoreId } = await request.json()
    
    if (!pendingStoreId) {
      return NextResponse.json(
        { success: false, message: "缺少店家 ID" },
        { status: 400 }
      )
    }

    const result = await StoreService.rejectStore(pendingStoreId)
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "已拒絕店家申請",
      })
    } else {
      return NextResponse.json(
        { success: false, message: result.message || "拒絕失敗" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("拒絕店家審核錯誤:", error)
    return NextResponse.json(
      { success: false, message: "拒絕店家審核時發生錯誤" },
      { status: 500 }
    )
  }
}
