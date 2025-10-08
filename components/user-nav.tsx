"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { User, Settings, History, LogOut, CreditCard, Heart, Bell } from "lucide-react"
import Link from "next/link"

interface UserNavProps {
  username?: string
}

export function UserNav({ username = "用戶" }: UserNavProps) {
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8 border border-primary/10">
            <AvatarImage src="/placeholder.svg?key=vt22p" alt={username} />
            <AvatarFallback className="bg-primary-50 text-primary-700">{username.charAt(0)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{username}</p>
            <p className="text-xs leading-none text-muted-foreground">user@example.com</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/user/profile" className="flex items-center">
              <User className="mr-2 h-4 w-4 text-primary-600" />
              <span>個人資料</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/user/orders" className="flex items-center">
              <History className="mr-2 h-4 w-4 text-amber-600" />
              <span>訂單記錄</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/user/favorites" className="flex items-center">
              <Heart className="mr-2 h-4 w-4 text-red-500" />
              <span>我的最愛</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/user/payment" className="flex items-center">
              <CreditCard className="mr-2 h-4 w-4 text-blue-600" />
              <span>付款方式</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/user/notifications" className="flex items-center">
              <Bell className="mr-2 h-4 w-4 text-purple-600" />
              <span>通知設定</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/user/settings" className="flex items-center">
              <Settings className="mr-2 h-4 w-4 text-gray-600" />
              <span>設定</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500">
          <LogOut className="mr-2 h-4 w-4" />
          <span>登出</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
