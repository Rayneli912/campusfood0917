"use client"

import type React from "react"

import Link from "next/link"
import Image from "next/image"
import { Heart, Star, Clock, MapPin, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { useFavorites } from "@/hooks/use-favorites"
import { Badge } from "@/components/ui/badge"
import type { Restaurant } from "@/lib/data"
import { getRestaurantCover } from "@/utils/image-utils"

interface RestaurantCardProps {
  restaurant: Restaurant
  isFavorite?: boolean
}

export function RestaurantCard({ restaurant, isFavorite: initialIsFavorite }: RestaurantCardProps) {
  const {
    id,
    name,
    cuisine,
    rating,
    deliveryTime,
    distance,
    minimumOrder,
    deliveryFee,
    isNew,
    description,
    coverImage,
  } = restaurant
  const { addFavorite, removeFavorite } = useFavorites()
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite)
  const [isHovered, setIsHovered] = useState(false)

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isFavorite) {
      removeFavorite(id)
    } else {
      addFavorite(restaurant)
    }

    setIsFavorite(!isFavorite)
  }

  return (
    <Link href={`/user/restaurant/${id}`}>
      <div
        className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col transform hover:-translate-y-1"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* 圖片容器 */}
        <div className="relative overflow-hidden aspect-[4/3] sm:aspect-[4/3]">
          <Image
            src={coverImage || getRestaurantCover(name)}
            alt={name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />

          {/* 收藏按鈕 */}
          <button
            onClick={handleToggleFavorite}
            className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md z-10 transition-transform duration-200 hover:scale-110"
            aria-label={isFavorite ? "從收藏移除" : "加入收藏"}
          >
            <Heart
              size={18}
              className={cn(
                "transition-colors duration-200",
                isFavorite ? "fill-red-500 text-red-500" : "text-gray-600",
              )}
            />
          </button>

          {/* 新店標 */}
          {isNew && (
            <div className="absolute top-3 left-3 z-10">
              <Badge className="bg-green-500 hover:bg-green-600 text-white font-medium px-2.5 py-1">新店</Badge>
            </div>
          )}

          {/* 評分 */}
          <div className="absolute bottom-3 left-3 flex items-center bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm">
            <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 mr-1" />
            <span className="text-sm font-medium">{rating}</span>
          </div>

          {/* 料理類型 */}
          <div className="absolute bottom-3 right-3">
            <Badge variant="outline" className="bg-white/90 backdrop-blur-sm border-none text-gray-700">
              {cuisine}
            </Badge>
          </div>
        </div>

        {/* 內容區域 */}
        <div className="p-3 sm:p-4 flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-bold text-base sm:text-lg line-clamp-1 group-hover:text-brand-primary transition-colors">
              {name}
            </h3>
          </div>

          <p className="text-gray-600 text-sm line-clamp-2 mb-2 sm:mb-3 flex-1">
            {description || `提供各種美味${cuisine}，滿足您的味蕾`}
          </p>

          <div className="flex items-center text-sm text-gray-500 mb-2">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            <span>{deliveryTime}</span>
            <span className="mx-2">•</span>
            <MapPin className="h-3.5 w-3.5 mr-1.5" />
            <span>{distance}</span>
          </div>

          <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100">
            <span className="font-medium">最低消費 ${minimumOrder}</span>
            <span className="text-gray-500">外送費 ${deliveryFee}</span>
          </div>

          {/* 懸停時顯示的查看按鈕 */}
          <div
            className={`absolute inset-0 bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
          >
            <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-md flex items-center font-medium text-brand-primary">
              <span>查看詳情</span>
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
