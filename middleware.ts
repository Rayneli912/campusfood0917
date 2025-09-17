import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * 任何 API 路徑（/api/**）一律略過 middleware，
 * 避免驗證/重導造成第三方 Webhook（例如 LINE）逾時。
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  // 其餘頁面需要的邏輯可以寫在這裡（目前沒有，就放行）
  return NextResponse.next()
}

/**
 * 僅匹配非靜態資源與非 /api 路徑。
 * - 排除 _next/static、_next/image、favicon.ico
 * - /api/** 在上面已 return NextResponse.next()，這裡維持一般頁面保護
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
