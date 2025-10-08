import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        { success: false, message: "沒有上傳文件" },
        { status: 400 }
      )
    }

    // 驗證文件類型
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { success: false, message: "只能上傳圖片文件" },
        { status: 400 }
      )
    }

    // 驗證文件大小（5MB）
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: "圖片大小不能超過 5MB" },
        { status: 400 }
      )
    }

    // 生成唯一文件名
    const fileExt = file.name.split(".").pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `products/${fileName}`

    // 將 File 轉換為 ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 上傳到 Supabase Storage
    const { data, error } = await supabase.storage
      .from("product-images")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error("上傳錯誤:", error)
      return NextResponse.json(
        { success: false, message: `圖片上傳失敗: ${error.message}` },
        { status: 500 }
      )
    }

    // 獲取公開 URL
    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath)

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: filePath,
      message: "圖片上傳成功",
    })
  } catch (error: any) {
    console.error("API 錯誤:", error)
    return NextResponse.json(
      { success: false, message: `伺服器錯誤: ${error.message}` },
      { status: 500 }
    )
  }
}
