"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { ArrowLeft, Save, RefreshCw } from "lucide-react"

interface UserDetail {
  id: string
  username: string
  password: string
  name: string
  email: string | null
  phone: string
  department: string | null
  is_disabled: boolean
  created_at: string
}

export default function AdminEditUserPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<UserDetail | null>(null)

  // 載入用戶資料
  const loadUserDetail = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}`)
      const data = await response.json()

      if (data.success) {
        setFormData(data.user)
      } else {
        throw new Error(data.message || "載入失敗")
      }
    } catch (error) {
      console.error("載入用戶詳情錯誤:", error)
      toast({
        title: "錯誤",
        description: "載入用戶資料失敗",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      loadUserDetail()
    }
  }, [userId])

  // 儲存修改
  const handleSave = async () => {
    if (!formData) return

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          department: formData.department,
          is_disabled: formData.is_disabled,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: "儲存成功",
          description: "用戶資料已更新",
        })
        router.push(`/admin/users/${userId}`)
      } else {
        toast({
          title: "儲存失敗",
          description: result.message || "無法儲存用戶資料",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("儲存用戶資料錯誤:", error)
      toast({
        title: "錯誤",
        description: "儲存用戶資料時發生錯誤",
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
        <p className="text-lg text-muted-foreground mb-4">找不到用戶資料</p>
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
          <CardTitle>編輯用戶資料</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">姓名</Label>
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
              <Label htmlFor="email">電子郵件</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">手機號碼</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">系所</Label>
              <Input
                id="department"
                value={formData.department || ""}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-4 border-t">
            <Switch
              id="is_disabled"
              checked={formData.is_disabled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_disabled: checked })
              }
            />
            <Label htmlFor="is_disabled">停用此帳號</Label>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

