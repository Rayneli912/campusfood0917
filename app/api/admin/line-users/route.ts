import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

// 獲取所有 LINE 用戶
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("line_user_settings")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("獲取 LINE 用戶列表錯誤:", error)
      throw error
    }

    return NextResponse.json({
      success: true,
      users: data || [],
    })
  } catch (error: any) {
    console.error("獲取 LINE 用戶列表錯誤:", error)
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "獲取 LINE 用戶列表失敗",
      },
      { status: 500 }
    )
  }
}

// 更新用戶通知設定
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { userId, notifyNewPost, bulkUpdate, enableAll } = body

    // 批量更新
    if (bulkUpdate) {
      const { error } = await supabaseAdmin
        .from("line_user_settings")
        .update({ notify_new_post: enableAll })
        .eq("followed", true)

      if (error) throw error

      return NextResponse.json({
        success: true,
        message: `已${enableAll ? "開啟" : "關閉"}所有追蹤用戶的即食通知`,
      })
    }

    // 單個用戶更新
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "缺少用戶 ID" },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from("line_user_settings")
      .update({ notify_new_post: notifyNewPost })
      .eq("user_id", userId)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: `已${notifyNewPost ? "開啟" : "關閉"}該用戶的即食通知`,
    })
  } catch (error: any) {
    console.error("更新 LINE 用戶設定錯誤:", error)
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "更新設定失敗",
      },
      { status: 500 }
    )
  }
}

