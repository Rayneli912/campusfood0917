"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { updateStoreInfo } from "@/lib/store-auth"
import { Pencil } from "lucide-react"
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
  const [loading, setLoading] = useState(true)
  const [store, setStore] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [newUsername, setNewUsername] = useState("")
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

  // 重新載入店家資料
  const reloadStoreData = useCallback(async () => {
    try {
      const storeStr = localStorage.getItem("storeAccount")
      if (!storeStr) {
        router.push("/login?tab=store")
        return
      }

      const storeData = JSON.parse(storeStr)
      
      // 從 registeredStores 獲取完整資料
      const storesStr = localStorage.getItem("registeredStores")
      if (storesStr) {
        const stores = JSON.parse(storesStr)
        const fullStoreData = stores.find((s: any) => s.id === storeData.storeId || s.username === storeData.username)
        if (fullStoreData) {
          setStore({
            ...fullStoreData,
            storeId: fullStoreData.id // 確保 storeId 存在
          })
          setFormData({
            username: fullStoreData.username,
            password: fullStoreData.password || "",
            name: fullStoreData.name || fullStoreData.storeName,
            description: fullStoreData.description || "",
            location: fullStoreData.location || "",
            contact: fullStoreData.contact || "",
            email: fullStoreData.email || "",
            businessHours: fullStoreData.businessHours || "",
          })
        } else {
          // 如果在 registeredStores 中找不到，使用 storeAccount 的資料
          setStore({
            ...storeData,
            storeId: storeData.storeId // 確保 storeId 存在
          })
          setFormData({
            username: storeData.username,
            password: storeData.password || "",
            name: storeData.storeName || "",
            description: storeData.description || "",
            location: storeData.location || "",
            contact: storeData.contact || "",
            email: storeData.email || "",
            businessHours: storeData.businessHours || "",
          })
        }
      } else {
        // 如果沒有 registeredStores，使用 storeAccount 的資料
        setStore({
          ...storeData,
          storeId: storeData.storeId // 確保 storeId 存在
        })
        setFormData({
          username: storeData.username,
          password: storeData.password || "",
          name: storeData.storeName || "",
          description: storeData.description || "",
          location: storeData.location || "",
          contact: storeData.contact || "",
          email: storeData.email || "",
          businessHours: storeData.businessHours || "",
        })
      }
      setLoading(false)
    } catch (error) {
      console.error("載入店家資料失敗:", error)
      toast({
        title: "載入失敗",
        description: "無法載入店家資料，請重新登入",
        variant: "destructive",
      })
      router.push("/login?tab=store")
    }
  }, [router, toast])

  // 初始載入和事件監聽
  useEffect(() => {
    reloadStoreData()

    // 監聽店家資料更新事件
    const handleStoreUpdate = () => {
      reloadStoreData()
    }

    window.addEventListener("storeUpdated", handleStoreUpdate)
    window.addEventListener("storage", (e) => {
      if (e.key === "registeredStores" || e.key === "storeAccount") {
        handleStoreUpdate()
      }
    })

    return () => {
      window.removeEventListener("storeUpdated", handleStoreUpdate)
      window.removeEventListener("storage", handleStoreUpdate)
    }
  }, [reloadStoreData])

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
    
    setLoading(true)

    try {
      if (!store.storeId) {
        throw new Error("找不到店家ID")
      }

      const result = await updateStoreInfo(store.storeId, {
        username: formData.username,
        password: formData.password,
        name: formData.name,
        description: formData.description,
        location: formData.location,
        contact: formData.contact,
        email: formData.email,
        businessHours: formData.businessHours,
      })

      if (result.success) {
        await reloadStoreData()
        setIsEditing(false)
        toast({
          title: "更新成功",
          description: "店家資料已更新",
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: "更新失敗",
        description: error instanceof Error ? error.message : "請稍後再試",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUsernameChange = async () => {
    if (!newUsername.trim()) {
      toast({
        title: "錯誤",
        description: "店家帳號不能為空",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const result = await updateStoreInfo(store.id, {
        ...formData,
        username: newUsername,
      })

      if (result.success) {
        await reloadStoreData()
        toast({
          title: "更新成功",
          description: "店家帳號已更新",
        })
        setNewUsername("")
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: "更新失敗",
        description: error instanceof Error ? error.message : "請稍後再試",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">載入中...</p>
        </div>
      </div>
    )
  }

  if (!store) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">找不到店家資料</p>
          <Button
            className="mt-4"
            onClick={() => router.push("/login?tab=store")}
          >
            返回登入
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
                      {store.storeCode || "000"}
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
                    <Button type="submit" disabled={loading}>
                      {loading ? "儲存中..." : "儲存變更"}
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
