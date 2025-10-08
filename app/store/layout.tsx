"use client"

import type React from "react"
import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { BrandLogo } from "@/components/brand-logo"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/toaster"
import { LogOut } from "lucide-react"
import { StoreNav } from "@/components/store-nav"
import { StoreAuthProvider, useStoreAuth } from "@/components/store-auth-provider"

// ✅ 內部組件：使用認證狀態
function StoreLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { account, loading, logout } = useStoreAuth()

  // ✅ 使用 StoreAuthProvider 的認證狀態
  useEffect(() => {
    // 等待 Provider 完成載入
    if (loading) {
      console.log("⏳ Layout: 正在載入認證狀態...")
      return
    }

    // 如果未登入，重定向到登入頁
    if (!account) {
      console.log("❌ Layout: 未登入，重定向到登入頁")
      const next = encodeURIComponent(pathname || "/store/dashboard")
      router.replace(`/login?tab=store&next=${next}`)
    } else {
      console.log("✅ Layout: 已登入店家:", account.name)
    }
  }, [account, loading, pathname, router])

  // 處理登出
  const handleLogout = () => {
    console.log("🚪 Layout: 執行登出")
    logout()
  }

  // 載入中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-sm text-muted-foreground">載入中…</span>
      </div>
    )
  }

  // 未登入
  if (!account) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
        <BrandLogo className="h-10 w-auto mb-6" />
        <p className="text-lg mb-3">此區需要店家登入</p>
        <p className="text-sm text-muted-foreground">正在導向店家登入頁面…</p>
      </div>
    )
  }

  // 已登入，顯示正常佈局
  return (
    <div className="flex min-h-screen flex-col">
      {/* 頂部導覽：手機置中 Logo；桌面顯示四個選單 + 登出 */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-center md:justify-between px-4">
          <BrandLogo href="/store/dashboard" className="h-8 w-auto" />

          {/* 桌面導覽（行動裝置隱藏） */}
          <nav className="hidden md:flex items-center gap-2">
            <StoreNav variant="desktop" />
            <Button variant="ghost" className="h-9" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              登出
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="container px-4 py-6">
          {children}
        </div>
      </main>

      {/* 行動版底部導覽列（四個選單） */}
      <StoreNav variant="mobile" />

      <Toaster />
    </div>
  )
}

// ✅ 外部組件：提供 StoreAuthProvider
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreAuthProvider>
      <StoreLayoutContent>{children}</StoreLayoutContent>
    </StoreAuthProvider>
  )
}
