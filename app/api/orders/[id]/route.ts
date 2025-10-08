import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

// 获取单个订单详情
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ Next.js 15: await params
    const { id: orderId } = await params

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "缺少订单 ID" },
        { status: 400 }
      )
    }

    console.log("📥 GET /api/orders/[id] - orderId:", orderId)

    // ✅ 先获取订单基本信息
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single()

    if (error) {
      console.error("❌ 获取订单详情错误:", error)
      return NextResponse.json(
        { success: false, message: `订单不存在: ${error.message}` },
        { status: 404 }
      )
    }

    console.log("✅ 获取订单基本信息:", order.id)

    // ✅ 获取订单项
    const { data: orderItems } = await supabaseAdmin
      .from("order_items")
      .select("*")
      .eq("order_id", orderId)

    console.log(`✅ 获取到 ${orderItems?.length || 0} 个订单项`)

    // 转换数据格式以匹配前端期望
    const transformedOrder = {
      id: order.id,
      userId: order.user_id,
      storeId: order.store_id,
      storeName: order.store_name,
      storeLocation: order.store_location,
      status: order.status,
      total: order.total,
      customerInfo: order.customer_info,
      note: order.note,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      acceptedAt: order.accepted_at,
      preparedAt: order.prepared_at,
      completedAt: order.completed_at,
      cancelledAt: order.cancelled_at,
      rejectedAt: order.rejected_at,
      items: (orderItems || []).map((item: any) => ({
        id: item.product_id,
        name: item.product_name,
        price: item.price,
        quantity: item.quantity,
      })),
    }

    return NextResponse.json({
      success: true,
      order: transformedOrder,
    })
  } catch (e: any) {
    console.error("获取订单详情错误:", e)
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 }
    )
  }
}

// 更新订单状态
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ Next.js 15: await params
    const { id: orderId } = await params
    const body = await req.json()

    console.log("📥 更新订单状态:", orderId, body)

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "缺少订单 ID" },
        { status: 400 }
      )
    }

    // ✅ 獲取當前訂單狀態（用於判斷是否需要回補庫存）
    const { data: currentOrder } = await supabaseAdmin
      .from("orders")
      .select("status, store_id")
      .eq("id", orderId)
      .single()

    const previousStatus = currentOrder?.status
    
    // 允许更新的字段
    const updateData: any = {}
    const newStatus = body.status

    if (body.status !== undefined) updateData.status = body.status
    if (body.note !== undefined) updateData.note = body.note
    if (body.reason !== undefined) updateData.reason = body.reason
    if (body.cancelledBy !== undefined) updateData.cancelled_by = body.cancelledBy

    // ✅ 根据状态自动设置时间戳
    const now = new Date().toISOString()
    if (newStatus === 'accepted') updateData.accepted_at = now
    else if (newStatus === 'prepared') updateData.prepared_at = now
    else if (newStatus === 'completed') updateData.completed_at = now
    else if (newStatus === 'cancelled') updateData.cancelled_at = now
    else if (newStatus === 'rejected') {
      updateData.rejected_at = now
      updateData.cancelled_at = now
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, message: "没有需要更新的字段" },
        { status: 400 }
      )
    }

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .select()
      .single()

    if (error) {
      console.error("❌ 更新订单错误:", error)
      return NextResponse.json(
        { success: false, message: `更新订单失败: ${error.message}` },
        { status: 500 }
      )
    }

    console.log("✅ 订单状态更新成功:", order)

    // ✅ 庫存管理邏輯
    const { data: orderItems } = await supabaseAdmin
      .from("order_items")
      .select("product_id, quantity")
      .eq("order_id", orderId)

    if (orderItems && orderItems.length > 0) {
      // ✅ 如果從 pending 變為 accepted：扣減庫存
      if (newStatus === 'accepted' && previousStatus === 'pending') {
        for (const item of orderItems) {
          if (!item.product_id) continue
          
          const { data: product } = await supabaseAdmin
            .from("products")
            .select("quantity")
            .eq("id", item.product_id)
            .single()
          
          if (product) {
            const newQuantity = Math.max(0, product.quantity - item.quantity)
            await supabaseAdmin
              .from("products")
              .update({ 
                quantity: newQuantity,
                updated_at: new Date().toISOString()
              })
              .eq("id", item.product_id)

            console.log(`✅ 扣減庫存成功：商品 ${item.product_id}，數量 -${item.quantity}`)
          }
        }
      }
      
      // ✅ 如果訂單被取消或拒絕：恢復庫存（僅當之前已接受）
      if ((newStatus === 'cancelled' || newStatus === 'rejected') && 
          (previousStatus === 'accepted' || previousStatus === 'prepared')) {
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
                updated_at: new Date().toISOString()
              })
              .eq("id", item.product_id)

            console.log(`✅ 恢復庫存成功：商品 ${item.product_id}，數量 +${item.quantity}`)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "订单状态更新成功",
      order,
    })
  } catch (e: any) {
    console.error("❌ 更新订单错误:", e)
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 }
    )
  }
}
