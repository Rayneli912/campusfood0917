"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Users, Store, MessageSquare, ClipboardList, LogOut } from "lucide-react"
import { useState, useEffect } from "react"

export function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)

  // 檢測螢幕尺寸
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkScreenSize()
    window.addEventListener("resize", checkScreenSize)

    return () => {
      window.removeEventListener("resize", checkScreenSize)
    }
  }, [])

  // 登出處理函數
  const handleLogout = () => {
    localStorage.removeItem("adminAccount")
    router.push("/")  // 跳轉到首頁而非登入頁面
  }

  // 如果是登入頁面，不顯示導航欄
  if (pathname === "/login") {
    return null
  }

  const navItems = [
    {
      href: "/admin/dashboard",
      label: "總覽",
      icon: <LayoutDashboard className="h-4 w-4" />,
      active: pathname === "/admin/dashboard",
    },
    {
      href: "/admin/news",
      label: "即時消息",
      icon: <MessageSquare className="h-4 w-4" />,
      active: pathname === "/admin/news",
    },
    {
      href: "/admin/users",
      label: "用戶數據",
      icon: <Users className="h-4 w-4" />,
      active: pathname === "/admin/users",
    },
    {
      href: "/admin/stores",
      label: "店家數據",
      icon: <Store className="h-4 w-4" />,
      active: pathname.startsWith("/admin/stores"),
    },
    {
      href: "/admin/orders",
      label: "訂單",
      icon: <ClipboardList className="h-4 w-4" />,
      active: pathname === "/admin/orders",
    },
  ]

  // 行動版底部導航
  if (isMobile) {
    return (
      <>
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center justify-between">
            <Link href="/admin/dashboard" className="flex items-center space-x-2">
              <span className="font-bold text-xl text-green-600">惜食快go</span>
              <span className="text-sm text-muted-foreground">管理員後台</span>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-foreground/60 hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-1" />
              登出
            </Button>
          </div>
        </header>

        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
          <div className="grid grid-cols-5 h-16">
            {navItems.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center space-y-1 text-xs px-1",
                  item.active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {item.icon}
                <span className="text-center leading-tight">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </>
    )
  }

  // 桌面版頂部導航
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 md:px-8 flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/admin/dashboard" className="flex items-center space-x-2">
            <span className="font-bold text-xl text-green-600">惜食快go</span>
            <span className="text-sm text-muted-foreground">管理員後台</span>
          </Link>
        </div>
        <nav className="flex items-center space-x-6 text-sm font-medium flex-1 justify-end">
          {navItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className={cn(
                "flex items-center transition-colors hover:text-foreground/80",
                item.active ? "text-foreground" : "text-foreground/60",
              )}
            >
              {item.icon}
              <span className="ml-1">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="flex items-center ml-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-foreground/60 hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-1" />
            登出
          </Button>
        </div>
      </div>
    </header>
  )
}
