import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

// DELETE: 管理员删除用户购物车项目
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  try {
    const { searchParams } = new URL(request.url)
    const cartItemId = searchParams.get("itemId")

    if (!cartItemId) {
      return NextResponse.json(
        { success: false, message: "缺少购物车项目 ID" },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from("cart_items")
      .delete()
      .eq("id", cartItemId)
      .eq("user_id", userId)

    if (error) {
      console.error("删除购物车项目错误:", error)
      return NextResponse.json(
        { success: false, message: "删除失败" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "删除成功",
    })
  } catch (error: any) {
    console.error("API 错误:", error)
    return NextResponse.json(
      { success: false, message: error.message || "服务器错误" },
      { status: 500 }
    )
  }
}

// PATCH: 管理员更新用户购物车项目数量
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  try {
    const body = await request.json()
    const { cartItemId, quantity } = body

    if (!cartItemId || !quantity) {
      return NextResponse.json(
        { success: false, message: "缺少必要参数" },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("cart_items")
      .update({ quantity, updated_at: new Date().toISOString() })
      .eq("id", cartItemId)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) {
      console.error("更新购物车项目错误:", error)
      return NextResponse.json(
        { success: false, message: "更新失败" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "更新成功",
      cartItem: data,
    })
  } catch (error: any) {
    console.error("API 错误:", error)
    return NextResponse.json(
      { success: false, message: error.message || "服务器错误" },
      { status: 500 }
    )
  }
}

