"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { BrandLogo } from "@/components/brand-logo"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/components/ui/use-toast"
import { LogOut } from "lucide-react"
import { StoreNav } from "@/components/store-nav"

type StoreAccount = { id: string; storeId: string; storeName: string } | null

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const [account, setAccount] = useState<StoreAccount>(null)
  const [checked, setChecked] = useState(false)

  // 店家端必須登入：讀 localStorage 並檢查
  useEffect(() => {
    try {
      const raw = localStorage.getItem("storeAccount")
      setAccount(raw ? JSON.parse(raw) : null)
    } catch {
      setAccount(null)
    } finally {
      setChecked(true)
    }
  }, [])

  // 未登入導向店家登入（帶回跳轉）
  useEffect(() => {
    if (!checked) return
    if (!account) {
      const next = encodeURIComponent(pathname || "/store/dashboard")
      router.replace(`/login?tab=store&next=${next}`)
    }
  }, [checked, account, pathname, router])

  const handleLogout = () => {
    localStorage.removeItem("storeAccount")
    setAccount(null)
    toast({ title: "已登出" })
    router.replace("/login?tab=store")
  }

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-sm text-muted-foreground">載入中…</span>
      </div>
    )
  }

  if (!account) {
    // 已觸發導向，顯示過渡畫面
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
        <BrandLogo className="h-10 w-auto mb-6" />
        <p className="text-lg mb-3">此區需要店家登入</p>
        <p className="text-sm text-muted-foreground">正在導向店家登入頁面…</p>
      </div>
    )
  }

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
