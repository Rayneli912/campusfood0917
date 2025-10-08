"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, ShoppingCart } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { withUserOrPrompt } from "@/lib/auth-guard"

interface MenuItemCardProps {
  item: {
    id: string
    name: string
    description: string
    originalPrice: number
    discountPrice: number
    quantity: number
    expiryTime: string
    image?: string
    storeId: string
    storeName: string
  }
  onAddToCart: (item: any, quantity: number) => void
  onToggleFavorite?: (id: string) => void
  isFavorite?: boolean
}

export function MenuItemCard({ item, onAddToCart, onToggleFavorite, isFavorite = false }: MenuItemCardProps) {
  const [quantity, setQuantity] = useState(1)
  const { toast } = useToast()
  const discount = Math.round(((item.originalPrice - item.discountPrice) / item.originalPrice) * 100)

  const handleAddToCart = () => {
    const ok = withUserOrPrompt(() => {
      onAddToCart(item, quantity)
      toast({ title: "已加入購物車" })
    })
    if (!ok) return
  }

  const handleToggleFavorite = () => {
    if (!onToggleFavorite) return
    const ok = withUserOrPrompt(() => {
      onToggleFavorite(item.id)
      toast({ title: isFavorite ? "已取消最愛" : "已加入最愛" })
    })
    if (!ok) return
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-0">
        <div className="relative w-full h-40">
          <Image
            src={item.image || "/placeholder.jpg"}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          {discount > 0 && (
            <Badge className="absolute left-2 top-2 bg-red-600 text-white">省 {discount}%</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-4">
        <CardTitle className="text-base">{item.name}</CardTitle>
        {/* 其餘資訊（價格、數量、到期時間...）維持你原有結構 */}
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          >-</Button>
          <span className="w-6 text-center">{quantity}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuantity((q) => q + 1)}
          >+</Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={isFavorite ? "default" : "outline"} size="sm" onClick={handleToggleFavorite}>
            <Heart className="h-4 w-4 mr-1" /> {isFavorite ? "已收藏" : "收藏"}
          </Button>
          <Button size="sm" onClick={handleAddToCart}>
            <ShoppingCart className="h-4 w-4 mr-1" /> 加入購物車
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
