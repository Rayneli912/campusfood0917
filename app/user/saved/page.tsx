"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Trash2, ShoppingBag } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { savedItems } from "@/lib/data"

export default function UserSavedPage() {
  const { toast } = useToast()
  const [items, setItems] = useState(savedItems)

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))

    toast({
      title: "已取消預訂",
      description: "已從您的預訂清單中移除",
    })
  }

  const calculateTotalSavings = () => {
    return items.reduce((total, item) => {
      return total + (item.originalPrice - item.discountPrice) * item.quantity
    }, 0)
  }

  return (
    <div className="container py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">已預訂項目</h1>
        <p className="text-muted-foreground">管理您已預訂的即期品</p>
      </div>

      {items.length > 0 ? (
        <>
          <div className="mb-6 grid gap-4">
            {items.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 overflow-hidden rounded-md">
                      <Image
                        src={item.image || "/placeholder.svg?height=64&width=64"}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">{item.store}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-sm line-through text-muted-foreground">${item.originalPrice}</span>
                        <span className="text-brand-primary font-bold">${item.discountPrice}</span>
                        <span className="text-sm text-muted-foreground">x {item.quantity}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                      <span className="sr-only">移除</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">總計節省</h3>
                  <p className="text-sm text-muted-foreground">透過購買即期品，您已節省：</p>
                </div>
                <div className="text-xl font-bold text-brand-primary">${calculateTotalSavings()}</div>
              </div>
            </CardContent>
            <CardFooter className="p-4 pt-0">
              <Button className="w-full bg-brand-primary hover:bg-brand-primary/90">
                <ShoppingBag className="mr-2 h-4 w-4" />
                確認預訂
              </Button>
            </CardFooter>
          </Card>

          <div className="rounded-lg bg-brand-muted p-4">
            <h3 className="font-medium mb-2">預訂須知</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 預訂後請在商品到期時間前前往商家取貨</li>
              <li>• 請出示預訂確認頁面給商家確認</li>
              <li>• 若無法取貨，請提前取消預訂</li>
              <li>• 重複未取貨可能會影響您未來的預訂權限</li>
            </ul>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-muted">
            <ShoppingBag className="h-6 w-6 text-brand-primary" />
          </div>
          <h2 className="text-xl font-medium mb-2">您尚未預訂任何即期品</h2>
          <p className="text-muted-foreground mb-4">瀏覽商家並預訂即期品，減少食物浪費</p>
          <Button onClick={() => (window.location.href = "/user/home")}>瀏覽即期品</Button>
        </div>
      )}
    </div>
  )
}
