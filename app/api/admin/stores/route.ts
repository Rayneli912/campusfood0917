import { NextResponse } from "next/server"
import { StoreService } from "@/lib/db/store-service"

// 獲取所有店家
export async function GET() {
  try {
    const stores = await StoreService.getAllStores()
    return NextResponse.json({ success: true, stores })
  } catch (error) {
    console.error("獲取店家列表錯誤:", error)
    return NextResponse.json(
      { success: false, message: "獲取店家列表失敗" },
      { status: 500 }
    )
  }
}

// 刪除店家
export async function DELETE(request: Request) {
  try {
    const { storeId } = await request.json()
    
    if (!storeId) {
      return NextResponse.json(
        { success: false, message: "缺少店家 ID" },
        { status: 400 }
      )
    }

    const result = await StoreService.deleteStore(storeId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("刪除店家錯誤:", error)
    return NextResponse.json(
      { success: false, message: "刪除店家失敗" },
      { status: 500 }
    )
  }
}

