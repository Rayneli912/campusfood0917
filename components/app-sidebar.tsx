"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Home, Heart, Clock, ShoppingCart, User, LogOut } from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()

  const handleLogout = () => {
    // 清除本地存儲的用戶信息
    localStorage.removeItem("user")

    toast({
      title: "已登出",
      description: "您已成功登出系統",
    })

    // 導航到初始頁面
    router.push("/")
  }

  const routes = [
    {
      href: "/user/home",
      label: "首頁",
      icon: Home,
      active: pathname === "/user/home",
    },
    {
      href: "/user/favorites",
      label: "我的最愛",
      icon: Heart,
      active: pathname === "/user/favorites",
    },
    {
      href: "/user/recent",
      label: "近期瀏覽",
      icon: Clock,
      active: pathname === "/user/recent",
    },
    {
      href: "/user/cart",
      label: "購物車",
      icon: ShoppingCart,
      active: pathname === "/user/cart",
    },
    {
      href: "/user/profile",
      label: "個人資料",
      icon: User,
      active: pathname === "/user/profile",
    },
  ]

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex items-center justify-center p-4">
        <BrandLogo href="/user/home" className="h-8 w-auto" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {routes.map((route) => (
            <SidebarMenuItem key={route.href}>
              <SidebarMenuButton asChild isActive={route.active} tooltip={route.label}>
                <Link href={route.href}>
                  <route.icon className="h-5 w-5" />
                  <span>{route.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          <span>登出</span>
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
