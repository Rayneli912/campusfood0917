"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useStoreAuth } from "@/components/store-auth-provider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"

export default function StoreSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { account, loading: authLoading } = useStoreAuth()
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
    description: "",
    location: "",
    contact: "",
    email: "",
    businessHours: "",
  })

  // ✅ 當 account 載入完成時，初始化表單資料
  useEffect(() => {
    if (account) {
      console.log("✅ Settings: 載入店家資料", account)
      setFormData({
        username: account.username || "",
        password: "", // 密碼欄位留空
        name: account.name || "",
        description: account.description || "",
        location: account.location || "",
        contact: account.phone || "",
        email: account.email || "",
        businessHours: account.business_hours || "",
      })
    }
  }, [account])

  // ✅ 檢查認證狀態
  useEffect(() => {
    if (!authLoading && !account) {
      console.log("❌ Settings: 未登入，重定向到登入頁")
      router.push("/login?tab=store")
    }
  }, [account, authLoading, router])

  // 表單驗證
  const validateForm = () => {
    const errors: string[] = []
    
    if (isEditing) {
      if (!formData.name.trim()) {
        errors.push("店家名稱不能為空")
      }
      if (!formData.location.trim()) {
        errors.push("店家地址不能為空")
      }
      if (!formData.contact.trim()) {
        errors.push("聯絡電話不能為空")
      }
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.push("電子郵件格式不正確")
      }
    }
    
    return errors
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!account) {
      toast({
        title: "錯誤",
        description: "請先登入",
        variant: "destructive",
      })
      return
    }
    
    // 表單驗證
    const errors = validateForm()
    if (errors.length > 0) {
      toast({
        title: "表單驗證失敗",
        description: errors.join("\n"),
        variant: "destructive",
      })
      return
    }
    
    setSaving(true)

    try {
      // ✅ 使用 API 更新店家信息
      const response = await fetch("/api/store/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          storeId: account.id,
          username: formData.username,
          password: formData.password || undefined, // 只在有輸入時才更新密碼
          name: formData.name,
          description: formData.description,
          location: formData.location,
          phone: formData.contact,
          email: formData.email,
          businessHours: formData.businessHours,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setIsEditing(false)
        toast({
          title: "更新成功",
          description: "店家資料已更新",
        })
        
        // ✅ 重新載入頁面以獲取最新資料
        window.location.reload()
      } else {
        throw new Error(result.message || "更新失败")
      }
    } catch (error) {
      console.error("更新店家资料失败:", error)
      toast({
        title: "更新失敗",
        description: error instanceof Error ? error.message : "請稍後再試",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // 載入中
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">載入中...</p>
        </div>
      </div>
    )
  }

  // 未登入
  if (!account) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">請先登入</p>
          <Button
            className="mt-4"
            onClick={() => router.push("/login?tab=store")}
          >
            前往登入
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">店家資訊與設定</h1>
          <p className="text-muted-foreground">更新您的店家詳細資料和營運設定</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>店家資訊</CardTitle>
                  <CardDescription>店家的基本資料與帳號設定</CardDescription>
                </div>
                {!isEditing && (
                  <Button type="button" onClick={() => setIsEditing(true)}>
                    編輯資料
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>店家代號</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className="text-base py-1.5">
                      {account.store_code || "000"}
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label htmlFor="username">店家帳號</Label>
                  <Input
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <Label htmlFor="password">密碼</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder={isEditing ? "輸入新密碼" : "••••••••"}
                  />
                </div>

                <div>
                  <Label htmlFor="name">店家名稱</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">店家描述</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="location">店家地址</Label>
                  <Input
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="contact">聯絡電話</Label>
                  <Input
                    id="contact"
                    name="contact"
                    value={formData.contact}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">電子郵件</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <Label htmlFor="businessHours">營業時間</Label>
                  <Input
                    id="businessHours"
                    name="businessHours"
                    value={formData.businessHours}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="例：週一至週五 07:00-23:30；週六 08:00-13:00；週日 17:00-22:00"
                  />
                </div>

                {isEditing && (
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                      取消
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? "儲存中..." : "儲存變更"}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </form>

        <Card>
          <CardHeader>
            <CardTitle>通知設定</CardTitle>
            <CardDescription>設定您想接收的通知類型</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>新訂單通知</Label>
                  <p className="text-sm text-muted-foreground">
                    當有新的訂單時通知您
                  </p>
                </div>
                <Switch checked={true} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>訂單狀態更新</Label>
                  <p className="text-sm text-muted-foreground">
                    當訂單狀態變更時通知您
                  </p>
                </div>
                <Switch checked={true} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>系統通知</Label>
                  <p className="text-sm text-muted-foreground">
                    接收系統更新和重要公告
                  </p>
                </div>
                <Switch checked={true} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
