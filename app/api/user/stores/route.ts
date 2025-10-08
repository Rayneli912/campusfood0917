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

    // 獲取店家資訊
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("id", storeId)
      .eq("is_disabled", false)
      .single()

    if (error) {
      console.error("Error fetching store:", error)
      return NextResponse.json(
        { success: false, message: "找不到店家" },
        { status: 404 }
      )
    }

    // 轉換為前端格式
    const restaurant = {
      id: data.id,
      name: data.name,
      description: data.description || "提供各種餐點選擇",
      category: data.category || "餐廳",
      cuisine: data.category || "餐廳",
      rating: data.rating || 4.5,
      deliveryTime: "30-45 分鐘",
      distance: "2.5 km",
      minimumOrder: 50,
      deliveryFee: 30,
      isNew: false,
      address: data.location || "山海樓",
      phone: data.phone || "07-525-6585",
      email: data.email || "",
      openTime: "08:00",
      closeTime: "21:00",
      location: data.location || "",
      contact: data.phone || "",
      status: data.is_disabled ? "inactive" : "active",
      coverImage: data.cover_image || null,
      openingHours: "週一至週日 08:00-21:00",
    }

    return NextResponse.json({
      success: true,
      restaurant,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { success: false, message: "伺服器錯誤" },
      { status: 500 }
    )
  }
}

