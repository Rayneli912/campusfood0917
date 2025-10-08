import { NextRequest, NextResponse } from "next/server"
import { ProductService } from "@/lib/db/product-service"

// 獲取店家商品列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const storeId = searchParams.get("storeId")

    if (!storeId) {
      return NextResponse.json(
        { success: false, message: "缺少店家 ID" },
        { status: 400 }
      )
    }

    const products = await ProductService.getStoreProducts(storeId)
    return NextResponse.json({ success: true, products })
  } catch (error) {
    console.error("獲取商品列表錯誤:", error)
    return NextResponse.json(
      { success: false, message: "獲取商品列表失敗" },
      { status: 500 }
    )
  }
}

// 創建商品
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { store_id, name, description, original_price, discount_price, quantity, expiry_date, image_url, category } = body

    // 驗證必填欄位
    if (!store_id || !name || discount_price === undefined || quantity === undefined) {
      return NextResponse.json(
        { success: false, message: "請填寫所有必填欄位" },
        { status: 400 }
      )
    }

    const result = await ProductService.createProduct({
      store_id,
      name,
      description,
      original_price,
      discount_price,
      quantity,
      expiry_date,
      image_url,
      category,
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "商品創建成功",
        product: result.product,
      })
    } else {
      return NextResponse.json(
        { success: false, message: result.message || "創建商品失敗" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("創建商品錯誤:", error)
    return NextResponse.json(
      { success: false, message: "創建商品時發生錯誤" },
      { status: 500 }
    )
  }
}

// 更新商品
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, ...updates } = body

    if (!productId) {
      return NextResponse.json(
        { success: false, message: "缺少商品 ID" },
        { status: 400 }
      )
    }

    const result = await ProductService.updateProduct(productId, updates)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "商品更新成功",
      })
    } else {
      return NextResponse.json(
        { success: false, message: result.message || "更新商品失敗" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("更新商品錯誤:", error)
    return NextResponse.json(
      { success: false, message: "更新商品時發生錯誤" },
      { status: 500 }
    )
  }
}

// PATCH 方法（與 PUT 相同，為了相容性）
export async function PATCH(request: NextRequest) {
  return PUT(request)
}

// 刪除商品
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get("productId")

    if (!productId) {
      return NextResponse.json(
        { success: false, message: "缺少商品 ID" },
        { status: 400 }
      )
    }

    const result = await ProductService.deleteProduct(productId)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "商品刪除成功",
      })
    } else {
      return NextResponse.json(
        { success: false, message: result.message || "刪除商品失敗" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("刪除商品錯誤:", error)
    return NextResponse.json(
      { success: false, message: "刪除商品時發生錯誤" },
      { status: 500 }
    )
  }
}
