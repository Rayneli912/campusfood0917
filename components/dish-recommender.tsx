"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"

interface DishRecommenderProps {
  restaurantName?: string
  cuisine?: string
  menu?: any[]
}

export function DishRecommender({
  restaurantName = "校園美食",
  cuisine = "校園料理",
  menu = [],
}: DishRecommenderProps) {
  const [mounted, setMounted] = useState(false)
  const [randomRecommendation, setRandomRecommendation] = useState(0)

  useEffect(() => {
    setMounted(true)
    // 隨機選擇一個推薦
    setRandomRecommendation(Math.floor(Math.random() * 5))
  }, [])

  if (!mounted) return null

  // 確保 menu 是數組
  const safeMenu = Array.isArray(menu) ? menu : []

  // 從菜單中找出價格最高的兩個項目作為推薦
  const popularItems =
    safeMenu.length > 0
      ? [...safeMenu]
          .filter((item) => typeof item.price === "number")
          .sort((a, b) => b.price - a.price)
          .slice(0, 2)
          .map((item) => item.name)
          .join("和")
      : "特色美食"

  // 推薦文字列表
  const recommendations = [
    `今日特推：${restaurantName}的${popularItems}，限時優惠中，把握機會！`,
    `即期優惠：多家店家的即期品正在特價中，減少浪費，省錢又環保。`,
    `本週新品：校園超商推出新款即期麵包，買二送一，先搶先贏！`,
    `環保貢獻：本月透過平台已減少${Math.floor(Math.random() * 100) + 50}kg食物浪費，感謝您的參與！`,
    `用戶最愛：知識咖啡的即期甜點深受好評，晚間八點後特價，記得查看！`,
  ]

  return (
    <Card
      className={cn(
        "overflow-hidden border-none shadow-md",
        "bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-950/50 dark:to-primary-900/50",
      )}
    >
      <CardContent className="p-0">
        <div className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="font-medium text-primary-700 dark:text-primary-300">今日推薦</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">{recommendations[randomRecommendation]}</p>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0 text-primary">
            <ArrowRight className="h-5 w-5" />
            <span className="sr-only">查看更多</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
