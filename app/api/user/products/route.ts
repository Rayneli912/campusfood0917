import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get("storeId")

    if (!storeId) {
      return NextResponse.json(
        { success: false, message: "缺少店家 ID" },
        { status: 400 }
      )
    }

    // 獲取已上架的商品
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("store_id", storeId)
      .eq("is_available", true)
      .gt("quantity", 0)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching products:", error)
      return NextResponse.json(
        { success: false, message: "無法載入商品" },
        { status: 500 }
      )
    }

    // 轉換為前端格式
    const products = (data || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      image: item.image_url,
      originalPrice: item.original_price || 0,
      discountPrice: item.discount_price,
      price: item.discount_price,
      quantity: item.quantity,
      isListed: item.is_available,
      storeId: item.store_id,
      category: item.category || "其他",
      description: item.description || "",
      expiryTime: item.expiry_date,
      isPopular: false, // 可以根據需求調整
    }))

    return NextResponse.json({
      success: true,
      products,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { success: false, message: "伺服器錯誤" },
      { status: 500 }
    )
  }
}

