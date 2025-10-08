"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { ArrowLeft, Save } from "lucide-react"

export default function AdminNewProductPage() {
  const router = useRouter()
  const params = useParams()
  const storeId = params.id as string

  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    original_price: 0,
    discount_price: 0,
    quantity: 0,
    is_available: true,
    image_url: "",
  })

  const handleSave = async () => {
    if (!formData.name || formData.discount_price <= 0) {
      toast({
        title: "請填寫必要資訊",
        description: "商品名稱和價格為必填項",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/store/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          ...formData,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: "新增成功",
          description: "商品已新增",
        })
        router.push(`/admin/stores/${storeId}`)
      } else {
        toast({
          title: "新增失敗",
          description: result.message || "無法新增商品",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("新增商品錯誤:", error)
      toast({
        title: "錯誤",
        description: "新增商品時發生錯誤",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
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
          {saving ? "儲存中..." : "新增商品"}
        </Button>
      </div>

      {/* 編輯表單 */}
      <Card>
        <CardHeader>
          <CardTitle>新增商品</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">商品名稱 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="請輸入商品名稱"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount_price">價格 *</Label>
              <Input
                id="discount_price"
                type="number"
                value={formData.discount_price}
                onChange={(e) =>
                  setFormData({ ...formData, discount_price: parseFloat(e.target.value) || 0 })
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="original_price">原價</Label>
              <Input
                id="original_price"
                type="number"
                value={formData.original_price}
                onChange={(e) =>
                  setFormData({ ...formData, original_price: parseFloat(e.target.value) || 0 })
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">庫存數量</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="image_url">圖片 URL</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">商品描述</Label>
              <Textarea
                id="description"
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="請輸入商品描述..."
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

