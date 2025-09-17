"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff } from "lucide-react"

interface RegisterDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function RegisterDialog({ isOpen, onClose }: RegisterDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    storeName: "",
    username: "",
    password: "",
    confirmPassword: "",
    category: "",
    description: "",
    location: "",
    contact: "",
    email: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // 清除對應欄位的錯誤訊息
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.storeName.trim()) {
      newErrors.storeName = "請輸入店家名稱"
    }

    if (!formData.username.trim()) {
      newErrors.username = "請輸入帳號"
    } else if (!/^[a-zA-Z0-9]{6,12}$/.test(formData.username)) {
      newErrors.username = "帳號必須為6-12位英數字"
    }

    if (!formData.password) {
      newErrors.password = "請輸入密碼"
    } else if (formData.password.length < 6) {
      newErrors.password = "密碼長度至少為6個字符"
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "兩次輸入的密碼不一致"
    }

    if (!formData.category.trim()) {
      newErrors.category = "請輸入店家描述"
    }

    if (!formData.contact.trim()) {
      newErrors.contact = "請輸入聯絡電話"
    }

    if (!formData.location.trim()) {
      newErrors.location = "請輸入店家地址"
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "請輸入有效的電子郵件地址"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      // 模擬API請求
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // 獲取已註冊店家列表
      const registeredStores = JSON.parse(localStorage.getItem("registeredStores") || "[]")

      // 檢查用戶名是否已存在
      if (registeredStores.some((store: any) => store.username === formData.username)) {
        toast({
          title: "註冊失敗",
          description: "該帳號已被使用",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // 儲存店家資料
      const newStore = {
        storeName: formData.storeName,
        username: formData.username,
        password: formData.password, // 實際應用中應該加密
        category: formData.category,
        description: formData.description,
        address: formData.location,
        phone: formData.contact,
        email: formData.email,
        createdAt: new Date().toISOString(),
        status: "active",
      }

      // 更新 localStorage
      registeredStores.push(newStore)
      localStorage.setItem("registeredStores", JSON.stringify(registeredStores))

      toast({
        title: "註冊成功",
        description: "已成功新增店家",
      })

      onClose()

      // 觸發 storage 事件以更新其他頁面
      window.dispatchEvent(new Event("storage"))
    } catch (error) {
      console.error("註冊失敗:", error)
      toast({
        title: "註冊失敗",
        description: "請稍後再試",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">註冊店家帳號</DialogTitle>
          <p className="text-sm text-muted-foreground">請填寫以下資料以創建新店家帳號</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center">
                <label htmlFor="storeName" className="text-sm font-medium">
                  店家名稱 <span className="text-red-500">*</span>
                </label>
              </div>
              <Input
                id="storeName"
                name="storeName"
                placeholder="請輸入店家名稱"
                value={formData.storeName}
                onChange={handleChange}
                className={errors.storeName ? "border-red-500" : ""}
              />
              {errors.storeName && <p className="text-xs text-red-500">{errors.storeName}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <label htmlFor="username" className="text-sm font-medium">
                  帳號 <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 ml-1">(6-12位英數混合)</span>
                </label>
              </div>
              <Input
                id="username"
                name="username"
                placeholder="請設定店家帳號"
                value={formData.username}
                onChange={handleChange}
                className={errors.username ? "border-red-500" : ""}
              />
              {errors.username && <p className="text-xs text-red-500">{errors.username}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center">
                <label htmlFor="password" className="text-sm font-medium">
                  密碼 <span className="text-red-500">*</span>
                </label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="請設定密碼"
                  value={formData.password}
                  onChange={handleChange}
                  className={errors.password ? "border-red-500 pr-10" : "pr-10"}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  確認密碼 <span className="text-red-500">*</span>
                </label>
              </div>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="請再次輸入密碼"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={errors.confirmPassword ? "border-red-500 pr-10" : "pr-10"}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center">
                <label htmlFor="contact" className="text-sm font-medium">
                  聯絡電話 <span className="text-red-500">*</span>
                </label>
              </div>
              <Input
                id="contact"
                name="contact"
                placeholder="請輸入聯絡電話"
                value={formData.contact}
                onChange={handleChange}
                className={errors.contact ? "border-red-500" : ""}
              />
              {errors.contact && <p className="text-xs text-red-500">{errors.contact}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <label htmlFor="email" className="text-sm font-medium">
                  電子郵件 <span className="text-gray-500 text-xs">(選填)</span>
                </label>
              </div>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="請輸入電子郵件"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center">
              <label htmlFor="category" className="text-sm font-medium">
                店家描述 <span className="text-red-500">*</span>
              </label>
            </div>
            <Input
              id="category"
              name="category"
              placeholder="請簡單描述店家特色"
              value={formData.category}
              onChange={handleChange}
              className={errors.category ? "border-red-500" : ""}
            />
            {errors.category && <p className="text-xs text-red-500">{errors.category}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center">
              <label htmlFor="location" className="text-sm font-medium">
                店家地址 <span className="text-red-500">*</span>
              </label>
            </div>
            <Input
              id="location"
              name="location"
              placeholder="請輸入店家地址"
              value={formData.location}
              onChange={handleChange}
              className={errors.location ? "border-red-500" : ""}
            />
            {errors.location && <p className="text-xs text-red-500">{errors.location}</p>}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading ? "處理中..." : "註冊店家"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
