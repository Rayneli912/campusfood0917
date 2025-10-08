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
import { useToast } from "@/components/ui/use-toast"
import { useRestaurantAuth } from "@/components/restaurant-auth-provider"
import { Store, Settings, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

export function RestaurantUserNav() {
  const { account, logout } = useRestaurantAuth()
  const { toast } = useToast()
  const router = useRouter()

  const handleLogout = () => {
    toast({
      title: "已登出",
      description: "您已成功登出店家管理系統",
      variant: "default",
    })
    logout()
  }

  if (!account) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10 border-2 border-brand-primary/20">
            <AvatarImage src={account.logo || "/placeholder.svg"} alt={account.restaurantName} />
            <AvatarFallback className="bg-brand-primary/10 text-brand-primary">
              {account.restaurantName.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{account.restaurantName}</p>
            <p className="text-xs leading-none text-muted-foreground">{account.cuisine}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push("/restaurant/settings")}>
            <Store className="mr-2 h-4 w-4 text-brand-primary" />
            <span>店家資訊</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/restaurant/settings")}>
            <Settings className="mr-2 h-4 w-4 text-brand-dark" />
            <span>帳號設定</span>
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
