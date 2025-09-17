"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { AuthInput } from "@/components/auth-input"
import { AvatarUpload } from "@/components/avatar-upload"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Pencil, Mail, Phone, Star, User, Lock, Eye, EyeOff } from "lucide-react"
import { 
  updateUserData as syncUpdateUserData,
  initDataSyncListeners,
  USER_DATA_UPDATED,
  loadUserFullData 
} from "@/lib/sync-service"
import { updateUserCredentials } from "@/lib/auth"
import type { UserBasicData, UserFullData } from "@/types"

interface EditDialogProps {
  isOpen: boolean
  onClose: () => void
  field: "username" | "password" | "name" | "email" | "phone" | "department"
  value: string
  onSave: (value: string) => void
  title: string
}

function EditDialog({ isOpen, onClose, field, value, onSave, title }: EditDialogProps) {
  const [editValue, setEditValue] = useState(value)
  const [showPassword, setShowPassword] = useState(false)

  const handleSave = () => {
    onSave(editValue)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>編輯{title}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-field">{title}</Label>
            <div className="relative">
              {field === "username" && <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />}
              {field === "password" && <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />}
              {field === "email" && <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />}
              {field === "phone" && <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />}
              {field === "name" && <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />}
              {field === "department" && <Star className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />}
              
              {field === "username" || field === "password" ? (
                <AuthInput
                  id="edit-field"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  type={field === "password" ? (showPassword ? "text" : "password") : "text"}
                  placeholder={`請輸入${title}`}
                  className="pl-10"
                />
              ) : (
                <Input
                  id="edit-field"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                  placeholder={`請輸入${title}`}
                  className="pl-10"
                />
              )}
              
              {field === "password" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-10 w-10"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="sr-only">{showPassword ? "隱藏密碼" : "顯示密碼"}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSave}>儲存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const [userData, setUserData] = useState<UserFullData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editField, setEditField] = useState<"username" | "password" | "name" | "email" | "phone" | "department" | null>(null)

  // 載入用戶資料
  const loadUserData = () => {
    try {
      const userStr = localStorage.getItem("user")
      if (!userStr) {
        console.error("未找到用戶資料")
        return
      }

      const user = JSON.parse(userStr)
      const fullData = loadUserFullData(user.id)
      if (fullData) {
        setUserData(fullData)
      }
    } catch (error) {
      console.error("載入用戶資料時發生錯誤:", error)
      toast({
        title: "錯誤",
        description: "載入用戶資料時發生錯誤",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // 初始化數據同步
  useEffect(() => {
    loadUserData()

    // 監聽數據更新事件
    const cleanup = initDataSyncListeners((eventName, data) => {
      if (eventName === USER_DATA_UPDATED && userData?.id === data.userId) {
        loadUserData()
      }
    })

    // 監聽登入狀態變化
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user") { // 改用 "user" 而不是 "currentUser"
        loadUserData()
      }
    }
    window.addEventListener("storage", handleStorageChange)

    return () => {
      if (cleanup) cleanup()
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [])

  // 更新用戶資料
  const handleUpdateUserData = async (updates: Partial<UserFullData>) => {
    if (!userData?.id) return

    try {
      // 如果是更新帳號或密碼
      if (updates.username || updates.password) {
        const result = await updateUserCredentials(
          userData.id,
          updates.username || userData.username,
          updates.password || userData.password
        )

        if (!result.success) {
          toast({
            title: "錯誤",
            description: result.message,
            variant: "destructive",
          })
          return
        }
      }

      const updatedUser = { ...userData, ...updates }
      const success = await syncUpdateUserData(userData.id, updatedUser)
      
      if (success) {
        setUserData(updatedUser)
        toast({
          title: "更新成功",
          description: "您的個人資料已更新",
        })
      } else {
        toast({
          title: "錯誤",
          description: "更新個人資料時發生錯誤",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("更新用戶資料時發生錯誤:", error)
      toast({
        title: "錯誤",
        description: "更新用戶資料時發生錯誤",
        variant: "destructive",
      })
    }
  }

  // 處理頭像更新
  const handleAvatarChange = (avatarData: string) => {
    handleUpdateUserData({ avatar: avatarData })
  }

  const handleEdit = (field: "username" | "password" | "name" | "email" | "phone" | "department") => {
    setEditField(field)
  }

  const handleSaveEdit = (value: string) => {
    if (!editField) return
    handleUpdateUserData({ [editField]: value })
    setEditField(null)
  }

  if (loading) {
    return <div className="p-8">載入中...</div>
  }

  if (!userData) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">請先登入</h1>
          <p className="text-muted-foreground mb-6">您需要先登入才能查看個人資料</p>
          <Button onClick={() => router.push("/login")}>
            前往登入
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">個人資料</h1>
        <p className="text-muted-foreground">管理您的個人資訊和偏好設定</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 個人頭像 */}
        <Card className="w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-40 h-40">
                <AvatarUpload
                  currentAvatar={userData.avatar}
                  onAvatarChange={handleAvatarChange}
                  name={userData.name}
                />
              </div>
              <div className="space-y-4 w-full">
                <h3 className="text-xl font-bold">{userData.name || "測試用戶"}</h3>
                <p className="text-muted-foreground">{userData.username}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{userData.email}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{userData.phone}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Star className="h-4 w-4 text-muted-foreground" />
                    <span>{userData.department || "未設定系級"}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 帳號資料 */}
        <Card className="w-full md:col-span-2">
          <CardHeader>
            <CardTitle>帳號資料</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-sm text-muted-foreground">姓名</Label>
              <div className="flex items-center gap-2 mt-1">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{userData.name || "測試用戶"}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit("name")}
                  className="h-8 w-8 shrink-0"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-sm text-muted-foreground">帳號 (6-8位英數混合)</Label>
              <div className="flex items-center gap-2 mt-1">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{userData.username}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit("username")}
                  className="h-8 w-8 shrink-0"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-sm text-muted-foreground">密碼</Label>
              <div className="flex items-center gap-2 mt-1">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{"•".repeat(8)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit("password")}
                  className="h-8 w-8 shrink-0"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-sm text-muted-foreground">電子郵件</Label>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{userData.email}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit("email")}
                  className="h-8 w-8 shrink-0"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-sm text-muted-foreground">手機號碼</Label>
              <div className="flex items-center gap-2 mt-1">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{userData.phone}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit("phone")}
                  className="h-8 w-8 shrink-0"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-sm text-muted-foreground">系級</Label>
              <div className="flex items-center gap-2 mt-1">
                <Star className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{userData.department || "未設定系級"}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit("department")}
                  className="h-8 w-8 shrink-0"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 通知設定 */}
        <Card className="w-full md:col-span-3">
          <CardHeader>
            <CardTitle>通知設定</CardTitle>
            <CardDescription>管理您接收通知的方式</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">電子郵件通知</Label>
                  <p className="text-sm text-muted-foreground">接收訂單和活動相關的電子郵件通知</p>
                </div>
                <Switch
                  checked={userData.notificationSettings?.email}
                  onCheckedChange={(checked) =>
                    handleUpdateUserData({
                      notificationSettings: {
                        ...userData.notificationSettings,
                        email: checked,
                      },
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>推播通知</Label>
                  <p className="text-sm text-muted-foreground">接收即時推播通知</p>
                </div>
                <Switch
                  checked={userData.notificationSettings?.push}
                  onCheckedChange={(checked) =>
                    handleUpdateUserData({
                      notificationSettings: {
                        ...userData.notificationSettings,
                        push: checked,
                      },
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>訂單更新通知</Label>
                  <p className="text-sm text-muted-foreground">接收訂單狀態更新的通知</p>
                </div>
                <Switch
                  checked={userData.notificationSettings?.orderUpdates}
                  onCheckedChange={(checked) =>
                    handleUpdateUserData({
                      notificationSettings: {
                        ...userData.notificationSettings,
                        orderUpdates: checked,
                      },
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>促銷活動通知</Label>
                  <p className="text-sm text-muted-foreground">接收優惠和促銷活動的通知</p>
                </div>
                <Switch
                  checked={userData.notificationSettings?.promotions}
                  onCheckedChange={(checked) =>
                    handleUpdateUserData({
                      notificationSettings: {
                        ...userData.notificationSettings,
                        promotions: checked,
                      },
                    })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 隱私設定 */}
        <Card className="w-full md:col-span-3">
          <CardHeader>
            <CardTitle>隱私設定</CardTitle>
            <CardDescription>管理您的隱私偏好設定</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">公開個人資料</Label>
                  <p className="text-sm text-muted-foreground">允許其他用戶查看您的個人資料</p>
                </div>
                <Switch
                  checked={userData.privacySettings?.showProfile}
                  onCheckedChange={(checked) =>
                    handleUpdateUserData({
                      privacySettings: {
                        ...userData.privacySettings,
                        showProfile: checked,
                      },
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>公開訂單紀錄</Label>
                  <p className="text-sm text-muted-foreground">允許其他用戶查看您的訂單紀錄</p>
                </div>
                <Switch
                  checked={userData.privacySettings?.showHistory}
                  onCheckedChange={(checked) =>
                    handleUpdateUserData({
                      privacySettings: {
                        ...userData.privacySettings,
                        showHistory: checked,
                      },
                    })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 編輯對話框 */}
      {editField && (
        <EditDialog
          isOpen={true}
          onClose={() => setEditField(null)}
          field={editField}
          value={userData[editField] || ""}
          onSave={handleSaveEdit}
          title={{
            username: "帳號",
            password: "密碼",
            name: "姓名",
            email: "電子郵件",
            phone: "手機號碼",
            department: "系級"
          }[editField]}
        />
      )}
    </div>
  )
}
