import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// 簡化中間件，移除不必要的檢查
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

// 如果將來需要添加路徑匹配，可以在這裡配置
export const config = {
  matcher: [],
}
