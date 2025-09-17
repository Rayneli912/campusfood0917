"use client"

import type React from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Heart, MapPin, Clock, Star, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useFavorites } from "@/hooks/use-favorites"
import { useRecentViews } from "@/hooks/use-recent-views"
import { stripStoreCode } from "@/lib/store-utils"

type ToggleArg =
  | string
  | {
      id: string
      type?: "store" | "product"
      name?: string
      image?: string
      storeId?: string
    }

interface StoreCardProps {
  store: any
  // 允許兩種簽名：傳 id 或傳 FavoriteItem
  onToggleFavorite?: (payload: ToggleArg) => void
  isFavorite?: boolean
}

export function StoreCard({ store, isFavorite: propIsFavorite, onToggleFavorite }: StoreCardProps) {
  const { toast } = useToast()
  const { isFavorite, toggle } = useFavorites()
  const { add } = useRecentViews()

  const favorite = propIsFavorite !== undefined ? propIsFavorite : isFavorite(String(store.id))
  const displayName = stripStoreCode?.(store.name) ?? store.name

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const payload = {
      id: String(store.id),
      type: "store" as const,
      name: displayName,
      image: store.coverImage || store.image,
      storeId: String(store.id),
    }

    if (onToggleFavorite) {
      // 相容：接收 id 或物件都可
      try { (onToggleFavorite as any)(payload) } catch { (onToggleFavorite as any)(String(store.id)) }
    } else {
      await toggle(payload)
    }

    toast({
      title: favorite ? "已從收藏移除" : "已加入收藏",
      description: favorite ? `${displayName} 已從您的收藏中移除` : `${displayName} 已加入您的收藏`,
    })
  }

  const handleStoreClick = () => {
    add({
      id: String(store.id),
      type: "store",
      name: displayName,
      image: store.image || store.coverImage,
      storeId: String(store.id),
    })
  }

  return (
    <Card className="overflow-hidden h-full transition-all duration-200 hover:shadow-md">
      <Link href={`/user/store/${store.id}`} onClick={handleStoreClick}>
        <div className="relative">
          <div className="relative h-48 w-full overflow-hidden">
            <Image
              src={
                store.coverImage ||
                store.image ||
                `/placeholder.svg?height=192&width=384&text=${encodeURIComponent(displayName) || "/placeholder.svg"}`
              }
              alt={displayName}
              fill
              className="object-cover transition-transform duration-300 hover:scale-105"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white"
            onClick={handleToggleFavorite}
          >
            <Heart className={cn("h-4 w-4", favorite ? "fill-red-500 text-red-500" : "text-gray-600")} />
            <span className="sr-only">加入收藏</span>
          </Button>
          {store.isNew && <Badge className="absolute left-2 top-2 bg-primary text-white">新開幕</Badge>}
          {store.discount && (
            <Badge variant="destructive" className="absolute left-2 bottom-2">
              優惠 {store.discount}
            </Badge>
          )}
        </div>
      </Link>
      <CardContent className="p-3 sm:p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-bold text-base sm:text-lg line-clamp-1">{displayName}</h3>
          <div className="flex items-center">
            <Star className="mr-1 h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm">{store.rating || "4.5"}</span>
          </div>
        </div>
        <p className="mb-2 text-sm text-muted-foreground line-clamp-2">{store.description}</p>
        <div className="flex flex-wrap gap-y-1 text-xs text-muted-foreground">
          <div className="flex w-full items-center">
            <MapPin className="mr-1 h-3 w-3" />
            <span>{store.location || "校園內"}</span>
          </div>
          <div className="flex w-full items-center">
            <Clock className="mr-1 h-3 w-3" />
            <span>營業至 {store.closeTime || "21:00"}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Link href={`/user/store/${store.id}`} className="w-full" onClick={handleStoreClick}>
          <Button variant="outline" className="w-full group">
            查看詳情
            <ExternalLink className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
