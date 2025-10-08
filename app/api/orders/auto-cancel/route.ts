import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

/**
 * ✅ 自動取消過期訂單 API
 * 
 * 功能：
 * 1. 查詢所有狀態為 "prepared" 的訂單
 * 2. 檢查 prepared_at 時間是否超過 10 分鐘
 * 3. 自動取消過期訂單並回補庫存
 * 
 * 使用方式：
 * - 前端定期調用（例如每分鐘）
 * - 或使用 Supabase Edge Functions / Cron Jobs
 */
export async function POST(request: Request) {
  try {
    console.log("🔄 開始檢查過期訂單...")

    // ✅ 查詢所有 "prepared" 狀態的訂單
    const { data: preparedOrders, error } = await supabaseAdmin
      .from("orders")
      .select("id, prepared_at, store_id")
      .eq("status", "prepared")

    if (error) {
      console.error("❌ 查詢訂單錯誤:", error)
      return NextResponse.json(
        { success: false, message: "查詢訂單失敗" },
        { status: 500 }
      )
    }

    if (!preparedOrders || preparedOrders.length === 0) {
      console.log("✅ 沒有需要檢查的訂單")
      return NextResponse.json({
        success: true,
        message: "沒有需要檢查的訂單",
        cancelledCount: 0,
      })
    }

    const now = Date.now()
    const TEN_MINUTES = 10 * 60 * 1000
    let cancelledCount = 0

    // ✅ 檢查每個訂單是否過期
    for (const order of preparedOrders) {
      if (!order.prepared_at) continue

      const preparedTime = new Date(order.prepared_at).getTime()
      const elapsed = now - preparedTime

      // ✅ 如果超過 10 分鐘，自動取消
      if (elapsed >= TEN_MINUTES) {
        console.log(`⏰ 訂單 ${order.id} 已過期，自動取消`)

        // ✅ 更新訂單狀態為 cancelled
        const { error: updateError } = await supabaseAdmin
          .from("orders")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            cancelled_by: "system",
            reason: "逾期未取（超過10分鐘）",
          })
          .eq("id", order.id)

        if (updateError) {
          console.error(`❌ 取消訂單 ${order.id} 失敗:`, updateError)
          continue
        }

        // ✅ 回補庫存
        const { data: orderItems } = await supabaseAdmin
          .from("order_items")
          .select("product_id, quantity")
          .eq("order_id", order.id)

        if (orderItems && orderItems.length > 0) {
          for (const item of orderItems) {
            if (!item.product_id) continue

            const { data: product } = await supabaseAdmin
              .from("products")
              .select("quantity")
              .eq("id", item.product_id)
              .single()

            if (product) {
              const newQuantity = product.quantity + item.quantity
              await supabaseAdmin
                .from("products")
                .update({
                  quantity: newQuantity,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", item.product_id)

              console.log(`✅ 回補庫存：商品 ${item.product_id}，數量 +${item.quantity}`)
            }
          }
        }

        cancelledCount++
      }
    }

    console.log(`✅ 自動取消完成，共取消 ${cancelledCount} 筆訂單`)

    return NextResponse.json({
      success: true,
      message: `成功取消 ${cancelledCount} 筆過期訂單`,
      cancelledCount,
    })
  } catch (error: any) {
    console.error("❌ 自動取消訂單錯誤:", error)
    return NextResponse.json(
      { success: false, message: error.message || "服務器錯誤" },
      { status: 500 }
    )
  }
}

