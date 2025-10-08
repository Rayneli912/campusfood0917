"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ShoppingCart } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCart } from "@/hooks/use-cart"
import { cn } from "@/lib/utils"

export function CartIcon() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const { items = [], count } = useCart()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // 在客戶端掛載前返回一個沒有數字的購物車圖標
    return (
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label="購物車"
        onClick={() => router.push("/user/cart")}
      >
        <ShoppingCart className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      aria-label="購物車"
      onClick={() => router.push("/user/cart")}
    >
      <ShoppingCart className="h-5 w-5" />
      {count > 0 && (
        <span
          className={cn(
            "absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center",
            "rounded-full bg-primary text-xs text-white font-medium",
          )}
        >
          {count}
        </span>
      )}
    </Button>
  )
}
