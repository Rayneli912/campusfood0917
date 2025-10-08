import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

// 创建订单
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log("📥 创建订单请求:", body)
    
    const userId = body?.userId
    const storeId = body?.storeId
    const note = body?.note || null
    const items = Array.isArray(body?.items) ? body.items : []
    const total = body?.total || 0
    const customerInfo = body?.customerInfo || {}

    // 验证必填字段
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "缺少用户 ID" },
        { status: 400 }
      )
    }

    if (!storeId) {
      return NextResponse.json(
        { success: false, message: "缺少店家 ID" },
        { status: 400 }
      )
    }

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, message: "购物车为空" },
        { status: 400 }
      )
    }

    if (!total || total <= 0) {
      return NextResponse.json(
        { success: false, message: "订单金额无效" },
        { status: 400 }
      )
    }

    // 确认店家存在
    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("id, name, location")
      .eq("id", storeId)
      .single()

    if (storeError || !store) {
      console.error("❌ 店家不存在:", storeId, storeError)
      return NextResponse.json(
        { success: false, message: "店家不存在" },
        { status: 404 }
      )
    }

    console.log("✅ 店家信息:", store)

    // ✅ 檢查庫存是否足夠
    for (const item of items) {
      if (!item.id) continue
      
      const { data: product, error: productError } = await supabaseAdmin
        .from("products")
        .select("name, quantity")
        .eq("id", item.id)
        .single()
      
      if (productError || !product) {
        console.error(`❌ 商品不存在: ${item.id}`)
        return NextResponse.json(
          { success: false, message: `商品「${item.name}」不存在` },
          { status: 400 }
        )
      }
      
      if (product.quantity < item.quantity) {
        console.error(`❌ 庫存不足: ${product.name}, 需要 ${item.quantity}, 只有 ${product.quantity}`)
        return NextResponse.json(
          { 
            success: false, 
            message: `商品「${product.name}」庫存不足（剩餘 ${product.quantity}）` 
          },
          { status: 400 }
        )
      }
      
      console.log(`✅ 庫存檢查通過: ${product.name}, 需要 ${item.quantity}, 剩餘 ${product.quantity}`)
    }

    // 生成订单 ID
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "")
    const randomStr = Math.random().toString(36).substring(2, 8)
    const orderId = `order_${dateStr}_${randomStr}`

    // 准备客户信息（JSONB 格式）
    const customerInfoJson = {
      name: customerInfo.name || "",
      phone: customerInfo.phone || "",
      email: customerInfo.email || "",
    }

    console.log("🔍 准备插入订单:")
    console.log("  - id:", orderId)
    console.log("  - user_id:", userId)
    console.log("  - store_id:", storeId)
    console.log("  - store_name:", store.name)
    console.log("  - store_location:", store.location)
    console.log("  - total:", total)
    console.log("  - status:", "pending")
    console.log("  - customer_info:", customerInfoJson)
    console.log("  - note:", note)

    // ✅ 创建订单（字段名匹配数据库表结构）
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        id: orderId,
        user_id: userId,
        store_id: storeId,
        store_name: store.name,
        store_location: store.location || null,
        total: total, // ✅ 使用 total 而不是 total_amount
        status: "pending",
        customer_info: customerInfoJson, // ✅ 使用 JSONB 格式
        note: note,
      })
      .select()
      .single()

    if (orderError) {
      console.error("❌ 创建订单错误:", orderError)
      console.error("错误详情:", {
        code: orderError.code,
        message: orderError.message,
        details: orderError.details,
        hint: orderError.hint
      })
      return NextResponse.json(
        { 
          success: false, 
          message: `创建订单失败: ${orderError.message || orderError.code || '未知错误'}`, 
          error: {
            code: orderError.code,
            message: orderError.message,
            details: orderError.details
          }
        },
        { status: 500 }
      )
    }

    console.log("✅ 订单创建成功:", order)

    // 创建订单项
    const orderItems = items.map((item: any) => ({
      order_id: orderId,
      product_id: item.id || null,
      product_name: item.name,
      price: item.price,
      quantity: item.quantity,
    }))

    console.log("🔍 准备插入订单项:", orderItems)

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(orderItems)

    if (itemsError) {
      console.error("❌ 创建订单项错误:", itemsError)
      // 回滚订单
      await supabaseAdmin.from("orders").delete().eq("id", orderId)
      return NextResponse.json(
        { 
          success: false, 
          message: `创建订单项失败: ${itemsError.message || itemsError.code || '未知错误'}`, 
          error: itemsError 
        },
        { status: 500 }
      )
    }

    console.log("✅ 订单项创建成功")

    // 清空用户购物车
    console.log("🔍 清空购物车，user_id:", userId)
    const { error: clearCartError } = await supabaseAdmin
      .from("cart_items")
      .delete()
      .eq("user_id", userId)

    if (clearCartError) {
      console.error("⚠️ 清空购物车失败（不影响订单）:", clearCartError)
    } else {
      console.log("✅ 购物车已清空")
    }

    console.log("✅✅✅ 订单完整流程成功！订单 ID:", orderId)

    return NextResponse.json(
      {
        success: true,
        message: "订单创建成功",
        order: {
          id: orderId,
          ...order,
        },
      },
      { status: 201 }
    )
  } catch (e: any) {
    console.error("❌❌❌ 创建订单严重错误:", e)
    console.error("错误堆栈:", e.stack)
    return NextResponse.json(
      { success: false, message: "服务器错误", error: e.message },
      { status: 500 }
    )
  }
}

// 获取用户订单列表
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    const storeId = searchParams.get("storeId")

    if (!userId && !storeId) {
      return NextResponse.json(
        { success: false, message: "缺少查询参数" },
        { status: 400 }
      )
    }

    // ✅ 分离查询避免 RLS 冲突
    let query = supabaseAdmin
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })

    if (userId) query = query.eq("user_id", userId)
    if (storeId) query = query.eq("store_id", storeId)

    const { data: orders, error } = await query

    if (error) {
      console.error("获取订单错误:", error)
      return NextResponse.json(
        { success: false, message: "获取订单失败" },
        { status: 500 }
      )
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ success: true, orders: [] })
    }

    // ✅ 分离获取订单项
    const orderIds = orders.map(o => o.id)
    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("*")
      .in("order_id", orderIds)

    // 组合数据
    const ordersWithItems = orders.map(order => ({
      ...order,
      order_items: items?.filter(item => item.order_id === order.id) || []
    }))

    return NextResponse.json({
      success: true,
      orders: ordersWithItems,
    })
  } catch (e) {
    console.error("获取订单错误:", e)
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 }
    )
  }
}
