"use client"

import { useSearchParams, useRouter } from "next/navigation"
import ActiveOrderTracking from "@/components/active-order-tracking"
import { Button } from "@/components/ui/button"

export default function OrderTrackingPage() {
  const sp = useSearchParams()
  const id = sp.get("id") || ""
  const router = useRouter()

  if (!id) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-sm text-muted-foreground">未指定訂單</div>
        <Button className="mt-4" variant="outline" onClick={() => router.push("/user/cart")}>回購物車</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">訂單詳情</h1>
        <Button variant="outline" onClick={() => router.push("/user/cart")}>回購物車 / 訂單紀錄</Button>
      </div>
      <div className="max-w-5xl">
        <ActiveOrderTracking orderId={id} />
      </div>
    </div>
  )
}
