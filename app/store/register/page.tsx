"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

export default function StoreRegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
    description: "",
    location: "",
    phone: "",
    email: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // 檢查店家帳號是否已存在
      const registeredStores = JSON.parse(localStorage.getItem("registeredStores") || "[]")
      const pendingStores = JSON.parse(localStorage.getItem("pendingStores") || "[]")

      if (registeredStores.some((store: any) => store.username === formData.username) ||
          pendingStores.some((store: any) => store.username === formData.username)) {
        toast({
          title: "註冊失敗",
          description: "此店家帳號已被使用",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // 添加到待審核列表
      const newStore = {
        ...formData,
        appliedAt: new Date().toISOString(),
      }
      pendingStores.push(newStore)
      localStorage.setItem("pendingStores", JSON.stringify(pendingStores))

      // 觸發更新事件
      window.dispatchEvent(new CustomEvent("storeRegistrationPending", { detail: { store: newStore } }))

      // 顯示成功提示
      setIsSubmitted(true)
    } catch (error) {
      console.error("店家註冊時發生錯誤:", error)
      toast({
        title: "註冊失敗",
        description: "註冊時發生錯誤，請稍後再試",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>店家註冊</CardTitle>
          <CardDescription>請填寫以下資訊以申請成為店家</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">店家帳號</label>
              <Input
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="請輸入店家帳號"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">店家密碼</label>
              <Input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="請輸入店家密碼"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">店家名稱</label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="請輸入店家名稱"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">店家簡介</label>
              <Textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="請輸入店家簡介"
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">店家地址</label>
              <Input
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="請輸入店家地址"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">聯絡電話</label>
              <Input
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="請輸入聯絡電話"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">電子郵件</label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="請輸入電子郵件"
                required
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/login?tab=store")}
              >
                返回登入
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "註冊中..." : "提交註冊"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 提交成功對話框 */}
      <AlertDialog open={isSubmitted}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>註冊申請已提交</AlertDialogTitle>
            <AlertDialogDescription>
              您的店家註冊申請已成功提交，請等待管理員審核。審核通過後，您將收到通知並可以使用店家帳號登入。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => router.push("/login?tab=store")}>
              返回登入頁面
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 