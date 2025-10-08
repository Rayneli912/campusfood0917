"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { ArrowLeft, Save, RefreshCw } from "lucide-react"

interface Product {
  id: string
  store_id: string
  name: string
  description: string | null
  discount_price: number
  quantity: number
  is_available: boolean
  image_url: string | null
}

export default function AdminEditProductPage() {
  const router = useRouter()
  const params = useParams()
  const storeId = params.id as string
  const productId = params.productId as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Product | null>(null)

  // 載入商品資料
  const loadProduct = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/store/products?storeId=${storeId}`)
      const data = await response.json()

      if (data.success) {
        const product = data.products.find((p: Product) => p.id === productId)
        if (product) {
          setFormData(product)
        } else {
          throw new Error("找不到商品")
        }
      } else {
        throw new Error(data.message || "載入失敗")
      }
    } catch (error) {
      console.error("載入商品資料錯誤:", error)
      toast({
        title: "錯誤",
        description: "載入商品資料失敗",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (storeId && productId) {
      loadProduct()
    }
  }, [storeId, productId])

  // 儲存修改
  const handleSave = async () => {
    if (!formData) return

    setSaving(true)
    try {
      const response = await fetch(`/api/store/products`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: formData.id,
          storeId: formData.store_id,
          name: formData.name,
          description: formData.description,
          discount_price: formData.discount_price,
          quantity: formData.quantity,
          is_available: formData.is_available,
          image_url: formData.image_url,
        }),
      })

      if (!response.ok) {
        throw new Error("儲存失敗")
      }

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: "儲存成功",
          description: "商品資料已更新",
        })
        router.push(`/admin/stores/${storeId}`)
      } else {
        toast({
          title: "儲存失敗",
          description: result.message || "無法儲存商品資料",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("儲存商品資料錯誤:", error)
      toast({
        title: "錯誤",
        description: "儲存商品資料時發生錯誤",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!formData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-lg text-muted-foreground mb-4">找不到商品資料</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 標題欄 */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "儲存中..." : "儲存修改"}
        </Button>
      </div>

      {/* 編輯表單 */}
      <Card>
        <CardHeader>
          <CardTitle>編輯商品資料</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">商品名稱</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount_price">價格</Label>
              <Input
                id="discount_price"
                type="number"
                value={formData.discount_price}
                onChange={(e) =>
                  setFormData({ ...formData, discount_price: parseFloat(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">庫存數量</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: parseInt(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image_url">圖片 URL</Label>
              <Input
                id="image_url"
                value={formData.image_url || ""}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">商品描述</Label>
              <Textarea
                id="description"
                rows={4}
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-4 border-t">
            <Switch
              id="is_available"
              checked={formData.is_available}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_available: checked })
              }
            />
            <Label htmlFor="is_available">上架銷售</Label>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

