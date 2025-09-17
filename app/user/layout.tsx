"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BrandLogo } from "@/components/brand-logo"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/components/ui/use-toast"
import { Home, Heart, Clock, ShoppingCart, User, LogOut } from "lucide-react"
import { BottomNav } from "@/components/bottom-nav"
import { AuthPrompt } from "@/components/auth-prompt"

type UserType = { id: string; username?: string; name?: string } | null

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()

  const [user, setUser] = useState<UserType>(null)

  useEffect(() => {
    // 還原登入狀態（允許未登入瀏覽一般頁）
    try {
      const stored = localStorage.getItem("user")
      setUser(stored ? JSON.parse(stored) : null)
    } catch {
      setUser(null)
    }
  }, [])

  // 四個受限頁（未登入時顯示置中提示）
  const isRestricted = useMemo(() => {
    const need = ["/user/favorites", "/user/recent", "/user/cart", "/user/profile"]
    return need.some((p) => pathname?.startsWith(p))
  }, [pathname])

  const topRoutes = useMemo(
    () => [
      { href: "/user/home", label: "首頁", icon: Home, active: pathname === "/user/home" },
      { href: "/user/favorites", label: "我的最愛", icon: Heart, active: pathname?.startsWith("/user/favorites") },
      { href: "/user/recent", label: "近期瀏覽", icon: Clock, active: pathname?.startsWith("/user/recent") },
      { href: "/user/cart", label: "購物車", icon: ShoppingCart, active: pathname?.startsWith("/user/cart") },
      { href: "/user/profile", label: "個人資料", icon: User, active: pathname?.startsWith("/user/profile") },
    ],
    [pathname]
  )

  const handleLogout = () => {
    localStorage.removeItem("user")
    setUser(null)
    toast({ title: "已登出", description: "您已成功登出系統" })
    router.push("/")
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* 頂部導覽列（手機置中 Logo；桌面顯示完整五個入口 + 登入/註冊或登出） */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-center md:justify-between px-4">
          <BrandLogo href="/user/home" className="h-8 w-auto" />
          {/* 桌面版導覽列（行動裝置隱藏） */}
          <nav className="hidden md:flex items-center space-x-4">
            {topRoutes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={`flex items-center text-sm font-medium transition-colors hover:text-primary ${
                  route.active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <route.icon className="mr-1 h-4 w-4" />
                {route.label}
              </Link>
            ))}
            {user ? (
              <Button variant="ghost" size="sm" onClick={handleLogout} className="flex items-center gap-1">
                <LogOut className="h-4 w-4" />
                <span>登出</span>
              </Button>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">登入</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">註冊</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* 主要內容：手機加大底部內距，避免被固定 BottomNav 擋住 */}
      <main className="flex-1">
        <div className="container px-4 py-6 pb-24 md:pb-6">
          {!user && isRestricted ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
              <p className="text-xl font-semibold mb-4">登入以取得此服務</p>
              <Link href="/login">
                <Button size="lg" className="mb-6">註冊/登入</Button>
              </Link>
              <div className="text-sm text-muted-foreground">
                或先瀏覽 <Link href="/user/news" className="underline">即食消息</Link>
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </main>

      {/* 行動版底部導覽列：永遠渲染（由 md:hidden 控制顯示） */}
      <BottomNav />

      {/* 全域登入提示彈窗：未登入時觸發 */}
      <AuthPrompt />

      <Toaster />
    </div>
  )
}
