"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Package, BarChart3, Settings } from "lucide-react"

type Variant = "desktop" | "mobile"

/**
 * 店家端導覽列（桌面＋行動）
 * 需求：只包含「店家總覽、商品管理、營業報表、店家設定」四個選項
 * - 桌面：hidden md:flex
 * - 行動：md:hidden fixed bottom-0
 */
export function StoreNav({ variant = "desktop" }: { variant?: Variant }) {
  const pathname = usePathname()

  // 🔗 若你的實際路由不同（例如 /store/products -> /store/items），只要改 href 即可
  const items = [
    { href: "/store/dashboard", label: "店家總覽", icon: LayoutDashboard },
    { href: "/store/products",  label: "商品管理", icon: Package },
    { href: "/store/reports",   label: "營業報表", icon: BarChart3 },
    { href: "/store/settings",  label: "店家設定", icon: Settings },
  ] as const

  const isActive = (href: string) =>
    href === "/store/dashboard"
      ? pathname === "/store/dashboard"
      : pathname?.startsWith(href)

  if (variant === "mobile") {
    return (
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t shadow-lg"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="店家行動版底部導覽"
      >
        <div className="grid grid-cols-4 h-16">
          {items.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center px-1 py-2 text-xs transition-colors",
                  active ? "text-primary bg-primary/10"
                         : "text-muted-foreground hover:text-primary hover:bg-muted"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="w-5 h-5 mb-1" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    )
  }

  // 桌面導覽
  return (
    <div className="hidden md:flex items-center gap-2">
      {items.map((item) => {
        const active = isActive(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-colors rounded-md flex items-center",
              active ? "text-primary bg-primary/10"
                     : "text-muted-foreground hover:text-primary hover:bg-muted"
            )}
          >
            <Icon className="w-4 h-4 mr-2" />
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}
