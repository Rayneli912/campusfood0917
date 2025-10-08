// API 端點：批量同步所有 LINE 用戶的暱稱
// 路徑：/api/line/sync-names

import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN

// 獲取單個用戶的 LINE 資料
async function getLineUserProfile(userId: string): Promise<{ displayName: string } | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    
    const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: {
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      signal: controller.signal,
    })
    clearTimeout(timer)
    
    if (!res.ok) {
      console.error(`Failed to get profile for ${userId}:`, res.status)
      return null
    }
    
    const data = await res.json()
    return {
      displayName: data.displayName || null,
    }
  } catch (e) {
    console.error(`Error fetching profile for ${userId}:`, e)
    return null
  }
}

// 批量更新用戶暱稱
export async function POST() {
  try {
    // 1. 獲取所有用戶
    const { data: users, error } = await supabaseAdmin
      .from("line_user_settings")
      .select("user_id, display_name")
      .eq("followed", true) // 只更新仍在追蹤的用戶
    
    if (error) {
      console.error("Failed to fetch users:", error)
      return NextResponse.json(
        { success: false, error: "Failed to fetch users" },
        { status: 500 }
      )
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No users to sync",
        updated: 0,
        failed: 0,
        skipped: 0,
      })
    }

    // 2. 批量處理，避免過度請求 LINE API
    const results = {
      total: users.length,
      updated: 0,
      failed: 0,
      skipped: 0,
    }

    console.log(`Starting to sync ${users.length} users...`)

    // 使用 Promise.allSettled 批量處理，但分批執行避免超過 API 限制
    const BATCH_SIZE = 10 // 每批處理 10 個用戶
    const BATCH_DELAY = 1000 // 每批之間延遲 1 秒

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE)
      
      const batchResults = await Promise.allSettled(
        batch.map(async (user) => {
          // 跳過已有暱稱的用戶（可選）
          // if (user.display_name) {
          //   results.skipped++
          //   return { success: true, skipped: true }
          // }

          const profile = await getLineUserProfile(user.user_id)
          
          if (profile?.displayName) {
            const { error: updateError } = await supabaseAdmin
              .from("line_user_settings")
              .update({
                display_name: profile.displayName,
                last_name_update: new Date().toISOString(),
              })
              .eq("user_id", user.user_id)
            
            if (updateError) {
              console.error(`Failed to update ${user.user_id}:`, updateError)
              results.failed++
              return { success: false, error: updateError }
            }
            
            results.updated++
            return { success: true, displayName: profile.displayName }
          } else {
            results.failed++
            return { success: false, error: "No profile data" }
          }
        })
      )

      console.log(`Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(users.length / BATCH_SIZE)}`)

      // 延遲下一批（除了最後一批）
      if (i + BATCH_SIZE < users.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
      }
    }

    console.log("Sync completed:", results)

    return NextResponse.json({
      success: true,
      message: "Sync completed",
      ...results,
    })
  } catch (e) {
    console.error("Sync error:", e)
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 500 }
    )
  }
}

// GET 方法：檢查同步狀態
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("line_user_settings")
      .select("user_id, display_name, last_name_update")
      .eq("followed", true)
    
    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    const stats = {
      total: data?.length || 0,
      withName: data?.filter(u => u.display_name).length || 0,
      withoutName: data?.filter(u => !u.display_name).length || 0,
    }

    return NextResponse.json({
      success: true,
      stats,
      users: data,
    })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 500 }
    )
  }
}
