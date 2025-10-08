"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthInput } from "@/components/auth-input"
import { toast } from "@/components/ui/use-toast"
import { Mail, Phone, User, GraduationCap } from "lucide-react"

interface UserRegisterDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (newUser: any) => void
}

export function UserRegisterDialog({ isOpen, onClose, onSuccess }: UserRegisterDialogProps) {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    name: "",
    email: "",
    phone: "",
    department: "",
    studentId: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // 驗證用戶名格式
  const validateUsername = (username: string) => {
    const regex = /^[a-zA-Z0-9]{6,12}$/
    return regex.test(username)
  }

  // 驗證密碼格式
  const validatePassword = (password: string) => {
    const regex = /^[a-zA-Z0-9!@#$%^&*]{8,16}$/
    return regex.test(password)
  }

  // 驗證電子郵件格式
  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
  }

  // 驗證手機號碼格式
  const validatePhone = (phone: string) => {
    const regex = /^09\d{8}$/
    return regex.test(phone)
  }

  // 驗證表單
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.username) {
      newErrors.username = "請輸入用戶名"
    } else if (!validateUsername(formData.username)) {
      newErrors.username = "用戶名必須為6-12位英文字母或數字"
    }

    if (!formData.password) {
      newErrors.password = "請輸入密碼"
    } else if (!validatePassword(formData.password)) {
      newErrors.password = "密碼必須為8-16位英文字母、數字或特殊符號"
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "請再次輸入密碼"
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "兩次輸入的密碼不一致"
    }

    if (!formData.name) {
      newErrors.name = "請輸入姓名"
    }

    if (!formData.email) {
      newErrors.email = "請輸入電子郵件"
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "請輸入有效的電子郵件地址"
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = "請輸入有效的手機號碼"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 處理表單提交
  const handleSubmit = () => {
    if (!validateForm()) return

    try {
      // 從 localStorage 獲取現有用戶
      const existingUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]")

      // 檢查用戶名是否已存在
      if (existingUsers.some((user: any) => user.username === formData.username)) {
        setErrors({ username: "該用戶名已被使用" })
        return
      }

      // 創建新用戶
      const newUser = {
        id: crypto.randomUUID(),
        username: formData.username,
        password: formData.password,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        department: formData.department,
        studentId: formData.studentId,
        createdAt: new Date().toISOString(),
        isDisabled: false,
        notificationSettings: {
          email: true,
          push: true,
          orderUpdates: true,
          promotions: true,
        },
      }

      // 更新 localStorage
      existingUsers.push(newUser)
      localStorage.setItem("registeredUsers", JSON.stringify(existingUsers))

      // 顯示成功提示
      toast({
        title: "註冊成功",
        description: "新用戶已成功創建",
      })

      // 調用成功回調
      onSuccess?.(newUser)

      // 關閉對話框
      onClose()
    } catch (error) {
      console.error("註冊用戶時發生錯誤:", error)
      toast({
        title: "錯誤",
        description: "註冊用戶時發生錯誤",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>新增用戶</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="username">用戶名</Label>
            <AuthInput
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="請輸入6-12位英文字母或數字"
              error={errors.username}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">密碼</Label>
            <AuthInput
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="請輸入8-16位英文字母、數字或特殊符號"
              error={errors.password}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">確認密碼</Label>
            <AuthInput
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="請再次輸入密碼"
              error={errors.confirmPassword}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">姓名</Label>
            <div className="relative">
              <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                className="pl-8"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="請輸入姓名"
              />
            </div>
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">電子郵件</Label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                className="pl-8"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="請輸入電子郵件"
              />
            </div>
            {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">手機號碼</Label>
            <div className="relative">
              <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                className="pl-8"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="請輸入手機號碼"
              />
            </div>
            {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="department">系所</Label>
            <div className="relative">
              <GraduationCap className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="department"
                className="pl-8"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="請輸入系所"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="studentId">學號</Label>
            <div className="relative">
              <GraduationCap className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="studentId"
                className="pl-8"
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                placeholder="請輸入學號"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSubmit}>
            新增
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
