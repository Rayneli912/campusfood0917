import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

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

    // 1. 檢查店家是否存在
    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("id, name, is_disabled")
      .eq("id", storeId)
      .single()

    // 2. 獲取所有商品（不過濾）
    const { data: allProducts, error: allError } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })

    // 3. 獲取已上架商品
    const { data: availableProducts, error: availError } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("store_id", storeId)
      .eq("is_available", true)
      .gt("quantity", 0)
      .order("created_at", { ascending: false })

    return NextResponse.json({
      success: true,
      storeId,
      store: store || null,
      storeError: storeError?.message || null,
      allProducts: {
        count: allProducts?.length || 0,
        products: allProducts || [],
        error: allError?.message || null,
      },
      availableProducts: {
        count: availableProducts?.length || 0,
        products: availableProducts || [],
        error: availError?.message || null,
      },
    })
  } catch (error: any) {
    console.error("Debug API error:", error)
    return NextResponse.json(
      { success: false, message: error.message || "伺服器錯誤" },
      { status: 500 }
    )
  }
}

