import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 获取当前登录的店家信息（通过 cookie）
export async function GET(request: NextRequest) {
  try {
    console.log("📡 收到会话查询请求")
    
    // 列出所有 cookies
    const allCookies = request.cookies.getAll()
    console.log("🍪 所有 cookies:", allCookies.map(c => ({ name: c.name, value: c.value.substring(0, 20) + "..." })))
    
    // 从 cookie 中获取 store_id
    const storeSessionCookie = request.cookies.get("store_session")
    const storeId = storeSessionCookie?.value
    
    console.log("🔍 查找 store_session cookie:", storeSessionCookie ? "找到" : "未找到")
    console.log("🆔 storeId:", storeId)

    if (!storeId) {
      console.log("❌ 没有 store_session cookie，返回未登录状态")
      return NextResponse.json({ success: false, store: null })
    }

    // 从数据库获取店家信息
    console.log("📡 查询数据库，storeId:", storeId)
    const { data: store, error } = await supabase
      .from("stores")
      .select("*")
      .eq("id", storeId)
      .single()

    if (error) {
      console.error("❌ 数据库查询错误:", error)
      return NextResponse.json({ success: false, store: null })
    }
    
    if (!store) {
      console.error("❌ 未找到店家数据")
      return NextResponse.json({ success: false, store: null })
    }

    console.log("✅ 找到店家:", store.name)

    return NextResponse.json({
      success: true,
      store: {
        id: store.id,
        storeId: store.id,
        username: store.username,
        name: store.name,
        description: store.description,
        location: store.location,
        phone: store.phone,
        email: store.email,
        is_disabled: store.is_disabled,
        created_at: store.created_at,
      },
    })
  } catch (error) {
    console.error("❌ 获取店家会话失败:", error)
    return NextResponse.json({ success: false, store: null })
  }
}

// 删除会话（登出）
export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete("store_session")
  return response
}

