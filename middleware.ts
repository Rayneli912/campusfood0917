import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(_request: NextRequest) {
  // 直接放行任何請求，不做改寫/轉址/讀 body
  // 這樣可確保像 /api/line/webhook 這種需要原始 body 的端點不會壞掉
  return NextResponse.next()
}

export const config = {
  // 目前不匹配任何路徑；若未來要新增保護頁面，記得排除 /api/line/webhook
  matcher: [],
}
