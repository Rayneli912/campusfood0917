import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

// 获取用户购物车
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "缺少用户 ID" },
        { status: 400 }
      )
    }

    // 获取购物车商品，包含商品详情
    const { data, error } = await supabaseAdmin
      .from("cart_items")
      .select(`
        id,
        user_id,
        product_id,
        quantity,
        created_at,
        updated_at,
        products (
          id,
          name,
          discount_price,
          original_price,
          quantity,
          image_url,
          store_id,
          is_available,
          stores (
            id,
            name
          )
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching cart:", error)
      return NextResponse.json(
        { success: false, message: "无法载入购物车" },
        { status: 500 }
      )
    }

    // 转换为前端格式
    const cartItems = (data || []).map((item: any) => ({
      id: item.product_id,
      name: item.products.name,
      price: item.products.discount_price || item.products.original_price,
      quantity: item.quantity,
      image: item.products.image_url,
      storeId: item.products.store_id,
      storeName: item.products.stores?.name || "",
      maxQuantity: item.products.quantity,
      isAvailable: item.products.is_available,
    }))

    return NextResponse.json({
      success: true,
      cart: cartItems,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 }
    )
  }
}

// 添加商品到购物车
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, productId, quantity } = body

    if (!userId || !productId || !quantity) {
      return NextResponse.json(
        { success: false, message: "缺少必填参数" },
        { status: 400 }
      )
    }

    // 检查商品是否存在且可用
    const { data: product } = await supabaseAdmin
      .from("products")
      .select("id, quantity, is_available")
      .eq("id", productId)
      .single()

    if (!product || !product.is_available || product.quantity < quantity) {
      return NextResponse.json(
        { success: false, message: "商品不可用或库存不足" },
        { status: 400 }
      )
    }

    // 使用 upsert 插入或更新
    const { error } = await supabaseAdmin
      .from("cart_items")
      .upsert({
        user_id: userId,
        product_id: productId,
        quantity: quantity,
      }, {
        onConflict: 'user_id,product_id'
      })

    if (error) {
      console.error("Error adding to cart:", error)
      return NextResponse.json(
        { success: false, message: "添加失败" },
        { status: 500 }
      )
    }

    // 返回更新后的购物车
    const { data: cartData } = await supabaseAdmin
      .from("cart_items")
      .select(`
        id,
        product_id,
        quantity,
        products (
          id,
          name,
          discount_price,
          original_price,
          quantity,
          image_url,
          store_id,
          is_available,
          stores (
            id,
            name
          )
        )
      `)
      .eq("user_id", userId)

    const cartItems = (cartData || []).map((item: any) => ({
      id: item.product_id,
      name: item.products.name,
      price: item.products.discount_price || item.products.original_price,
      quantity: item.quantity,
      image: item.products.image_url,
      storeId: item.products.store_id,
      storeName: item.products.stores?.name || "",
      maxQuantity: item.products.quantity,
      isAvailable: item.products.is_available,
    }))

    return NextResponse.json({
      success: true,
      message: "已添加到购物车",
      cart: cartItems,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 }
    )
  }
}

// 更新购物车商品数量
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { userId, productId, quantity } = body

    if (!userId || !productId) {
      return NextResponse.json(
        { success: false, message: "缺少必填参数" },
        { status: 400 }
      )
    }

    if (quantity <= 0) {
      // 数量为 0 则删除
      const { error } = await supabaseAdmin
        .from("cart_items")
        .delete()
        .eq("user_id", userId)
        .eq("product_id", productId)

      if (error) throw error
    } else {
      // 更新数量
      const { error } = await supabaseAdmin
        .from("cart_items")
        .update({ quantity })
        .eq("user_id", userId)
        .eq("product_id", productId)

      if (error) throw error
    }

    // 返回更新后的购物车
    const { data: cartData } = await supabaseAdmin
      .from("cart_items")
      .select(`
        id,
        product_id,
        quantity,
        products (
          id,
          name,
          discount_price,
          original_price,
          quantity,
          image_url,
          store_id,
          is_available,
          stores (
            id,
            name
          )
        )
      `)
      .eq("user_id", userId)

    const cartItems = (cartData || []).map((item: any) => ({
      id: item.product_id,
      name: item.products.name,
      price: item.products.discount_price || item.products.original_price,
      quantity: item.quantity,
      image: item.products.image_url,
      storeId: item.products.store_id,
      storeName: item.products.stores?.name || "",
      maxQuantity: item.products.quantity,
      isAvailable: item.products.is_available,
    }))

    return NextResponse.json({
      success: true,
      message: "已更新购物车",
      cart: cartItems,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 }
    )
  }
}

// 清空购物车
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "缺少用户 ID" },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from("cart_items")
      .delete()
      .eq("user_id", userId)

    if (error) {
      console.error("Error clearing cart:", error)
      return NextResponse.json(
        { success: false, message: "清空购物车失败" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "购物车已清空",
      cart: [],
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 }
    )
  }
}

