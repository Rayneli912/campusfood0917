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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface StoreDetail {
  id: string
  username: string
  password: string
  name: string
  description: string | null
  location: string | null
  phone: string | null
  email: string | null
  business_hours: string | null
  store_code: string | null
  status: string
  created_at: string
}

export default function AdminEditStorePage() {
  const router = useRouter()
  const params = useParams()
  const storeId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<StoreDetail | null>(null)

  // 載入店家資料
  const loadStoreDetail = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/stores/${storeId}`)
      const data = await response.json()

      if (data.success) {
        setFormData(data.store)
      } else {
        throw new Error(data.message || "載入失敗")
      }
    } catch (error) {
      console.error("載入店家詳情錯誤:", error)
      toast({
        title: "錯誤",
        description: "載入店家資料失敗",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (storeId) {
      loadStoreDetail()
    }
  }, [storeId])

  // 儲存修改
  const handleSave = async () => {
    if (!formData) return

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/stores/${storeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          name: formData.name,
          description: formData.description,
          location: formData.location,
          phone: formData.phone,
          email: formData.email,
          business_hours: formData.business_hours,
          store_code: formData.store_code,
          status: formData.status,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: "儲存成功",
          description: "店家資料已更新",
        })
        router.push(`/admin/stores/${storeId}`)
      } else {
        toast({
          title: "儲存失敗",
          description: result.message || "無法儲存店家資料",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("儲存店家資料錯誤:", error)
      toast({
        title: "錯誤",
        description: "儲存店家資料時發生錯誤",
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
        <p className="text-lg text-muted-foreground mb-4">找不到店家資料</p>
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
          <CardTitle>編輯店家資料</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">店家名稱</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">帳號</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密碼</Label>
              <Input
                id="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store_code">店家代碼</Label>
              <Input
                id="store_code"
                value={formData.store_code || ""}
                onChange={(e) => setFormData({ ...formData, store_code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">電話</Label>
              <Input
                id="phone"
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">電子郵件</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">地址</Label>
              <Input
                id="location"
                value={formData.location || ""}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business_hours">營業時間</Label>
              <Input
                id="business_hours"
                value={formData.business_hours || ""}
                onChange={(e) =>
                  setFormData({ ...formData, business_hours: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">狀態</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇狀態" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">營業中</SelectItem>
                  <SelectItem value="pending">待審核</SelectItem>
                  <SelectItem value="suspended">已停用</SelectItem>
                  <SelectItem value="rejected">已拒絕</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">店家描述</Label>
              <Textarea
                id="description"
                rows={4}
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

