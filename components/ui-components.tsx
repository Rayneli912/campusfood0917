"use client"

// 集中定義常用的 UI 組件，減少重複代碼
import { cn } from "@/lib/utils"
import { Heart, ShoppingCart, Clock, Home, Settings, User, Menu, X } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { StoreCard } from "./store-card"

// Logo 組件
export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center font-bold text-primary", className)}>
      <span className="text-xl">🍃 惜食快go</span>
    </Link>
  )
}

// 導航項目
export const navItems = [
  { href: "/user/home", label: "首頁", icon: Home },
  { href: "/user/favorites", label: "我的最愛", icon: Heart },
  { href: "/user/recent", label: "近期瀏覽", icon: Clock },
  { href: "/user/cart", label: "購物車", icon: ShoppingCart },
  { href: "/user/profile", label: "個人資料", icon: User },
]

// 店家導航項目
export const storeNavItems = [
  { href: "/store/dashboard", label: "儀表板", icon: Home },
  { href: "/store/products", label: "商品管理", icon: ShoppingCart },
  { href: "/store/orders", label: "訂單管理", icon: Clock },
  { href: "/store/settings", label: "店家設定", icon: Settings },
]

// 用戶導航欄
export function UserNav() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Logo />

        {/* 桌面導航 */}
        <div className="hidden md:flex space-x-6">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center text-gray-600 hover:text-primary">
              <item.icon className="mr-1 h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        {/* 行動裝置選單按鈕 */}
        <button className="md:hidden text-gray-600" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* 行動裝置導航 */}
      {isOpen && (
        <div className="md:hidden bg-white border-t">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50"
              onClick={() => setIsOpen(false)}
            >
              <item.icon className="mr-3 h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}

// 店家導航欄
export function StoreNav() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Logo />

        {/* 桌面導航 */}
        <div className="hidden md:flex space-x-6">
          {storeNavItems.map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center text-gray-600 hover:text-primary">
              <item.icon className="mr-1 h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        {/* 行動裝置選單按鈕 */}
        <button className="md:hidden text-gray-600" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* 行動裝置導航 */}
      {isOpen && (
        <div className="md:hidden bg-white border-t">
          {storeNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50"
              onClick={() => setIsOpen(false)}
            >
              <item.icon className="mr-3 h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}

// 食品卡片
export function FoodItemCard({ item, onAddToCart }: any) {
  const [quantity, setQuantity] = useState(1)
  const { toast } = useToast()
  const discount = Math.round(((item.originalPrice - item.discountPrice) / item.originalPrice) * 100)

  const handleAddToCart = () => {
    onAddToCart && onAddToCart(item, quantity)

    // 顯示加入購物車提示
    toast({
      title: "已加入購物車",
      description: `${item.name} 已成功加入購物車！`,
      duration: 3000,
    })
  }

  return (
    <Card className="overflow-hidden h-full">
      <div className="relative h-40">
        <Image src={item.image || "/placeholder.svg"} alt={item.name} fill className="object-cover" />
        <Badge className="absolute top-2 left-2 bg-red-500">省{discount}%</Badge>
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{item.name}</CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
        <div className="flex items-center mt-2">
          <span className="text-lg font-bold text-primary">${item.discountPrice}</span>
          <span className="ml-2 text-sm text-gray-400 line-through">${item.originalPrice}</span>
        </div>
        <div className="mt-2 text-sm text-gray-500">
          <span>剩餘: {item.quantity}份</span>
          <span className="ml-3">{item.expiryTime}</span>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="flex items-center justify-between w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
          >
            -
          </Button>
          <span>{quantity}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuantity(Math.min(item.quantity, quantity + 1))}
            disabled={quantity >= item.quantity}
          >
            +
          </Button>
        </div>
        <Button className="w-full" onClick={handleAddToCart}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          加入購物車
        </Button>
      </CardFooter>
    </Card>
  )
}

// 導出所有 UI 組件
export { StoreCard }
