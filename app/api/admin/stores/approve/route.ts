import { NextResponse } from "next/server"
import { StoreService } from "@/lib/db/store-service"

// 通過店家審核
export async function POST(request: Request) {
  try {
    const { pendingStoreId } = await request.json()
    
    if (!pendingStoreId) {
      return NextResponse.json(
        { success: false, message: "缺少店家 ID" },
        { status: 400 }
      )
    }

    const result = await StoreService.approveStore(pendingStoreId)
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "店家審核通過",
        store: result.store,
      })
    } else {
      return NextResponse.json(
        { success: false, message: result.message || "審核失敗" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("店家審核錯誤:", error)
    return NextResponse.json(
      { success: false, message: "店家審核時發生錯誤" },
      { status: 500 }
    )
  }
}
