"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
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

  return (
    <nav className="flex items-center justify-end" {...props}>
      {/* 登出按鈕 */}
      <Button variant="ghost" size="sm" onClick={handleLogout} className="flex items-center gap-1">
        <LogOut className="h-4 w-4" />
        <span>登出</span>
      </Button>
    </nav>
  )
}
