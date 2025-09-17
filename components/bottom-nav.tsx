"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Heart, Clock, ShoppingCart, User } from "lucide-react"
import { cn } from "@/lib/utils"

export function BottomNav() {
  const pathname = usePathname()

  const routes = [
    { href: "/user/recent", label: "近期瀏覽", icon: Clock },
    { href: "/user/favorites", label: "我的最愛", icon: Heart },
    { href: "/user/home", label: "首頁", icon: Home },
    { href: "/user/cart", label: "購物車", icon: ShoppingCart },
    { href: "/user/profile", label: "個人資料", icon: User },
  ] as const

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-lg"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="行動版底部導覽"
    >
      <div className="grid h-full grid-cols-5">
        {routes.map((route) => {
          const active =
            route.href === "/user/home" ? pathname === "/user/home" : pathname?.startsWith(route.href)
          return (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex flex-col items-center justify-center px-1 py-2 transition-colors",
                active ? "text-brand-primary bg-green-50"
                       : "text-gray-500 hover:text-brand-primary hover:bg-gray-50",
              )}
              aria-current={active ? "page" : undefined}
              aria-label={route.label}
            >
              <route.icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium leading-none">{route.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
