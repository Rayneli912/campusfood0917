import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(_request: NextRequest) {
  // 不做任何攔截，確保 /api/line/webhook 可讀 body
  return NextResponse.next()
}

export const config = {
  // 目前不匹配任何路徑；將來若要加保護頁面，也請排除 /api/line/webhook
  matcher: [],
}
