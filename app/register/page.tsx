"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Mail, Phone, User, GraduationCap } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("user")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [userForm, setUserForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    name: "",
    email: "",
    phone: "",
    department: "", // 系級欄位
  })
  const [storeForm, setStoreForm] = useState({
    storeName: "",
    username: "",
    password: "",
    confirmPassword: "",
    description: "",
    address: "",
    phone: "",
    email: "",
  })
  const [userErrors, setUserErrors] = useState<Record<string, string>>({})
  const [storeErrors, setStoreErrors] = useState<Record<string, string>>({})

  // 驗證用戶名格式
  const validateUsername = (username: string) => {
    const regex = /^[a-zA-Z0-9]{6,12}$/
    return regex.test(username)
  }

  // 驗證用戶表單
  const validateUserForm = () => {
    const errors: Record<string, string> = {}

    // 必填欄位驗證
    if (!userForm.name) errors.name = "請輸入姓名"
    if (!userForm.username) errors.username = "請輸入帳號"
    else if (!validateUsername(userForm.username)) errors.username = "帳號必須為6-12位英數混合"
    if (!userForm.password) errors.password = "請輸入密碼"
    if (!userForm.confirmPassword) errors.confirmPassword = "請確認密碼"
    if (userForm.password !== userForm.confirmPassword) errors.confirmPassword = "兩次輸入的密碼不一致"
    if (!userForm.department) errors.department = "請輸入系級"

    // 電話為必填
    if (!userForm.phone) errors.phone = "請輸入手機號碼"

    // 電子郵件格式驗證（如果有填寫）
    if (userForm.email && !/\S+@\S+\.\S+/.test(userForm.email)) {
      errors.email = "請輸入有效的電子郵件"
    }

    setUserErrors(errors)
    return Object.keys(errors).length === 0
  }

  // 驗證店家表單
  const validateStoreForm = () => {
    const errors: Record<string, string> = {}

    // 必填欄位驗證
    if (!storeForm.storeName) errors.storeName = "請輸入店家名稱"
    if (!storeForm.username) errors.username = "請輸入帳號"
    else if (!validateUsername(storeForm.username)) errors.username = "帳號必須為6-12位英數混合"
    if (!storeForm.password) errors.password = "請輸入密碼"
    if (!storeForm.confirmPassword) errors.confirmPassword = "請確認密碼"
    if (storeForm.password !== storeForm.confirmPassword) errors.confirmPassword = "兩次輸入的密碼不一致"

    // 電話為必填
    if (!storeForm.phone) errors.phone = "請輸入手機號碼"

    // 電子郵件格式驗證（如果有填寫）
    if (storeForm.email && !/\S+@\S+\.\S+/.test(storeForm.email)) {
      errors.email = "請輸入有效的電子郵件"
    }

    setStoreErrors(errors)
    return Object.keys(errors).length === 0
  }

  // 處理用戶註冊
  const handleUserRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateUserForm()) {
      return
    }

    try {
      const response = await fetch("/api/auth/user/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: userForm.username,
          password: userForm.password,
          name: userForm.name,
          email: userForm.email,
          phone: userForm.phone,
          department: userForm.department,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "註冊成功！",
          description: "您已成功註冊帳號",
        })

        // 延遲導向登入頁面，讓用戶有時間看到提示
        setTimeout(() => {
          router.push("/login")
        }, 1500)
      } else {
        if (data.message.includes("帳號")) {
          setUserErrors((prev) => ({ ...prev, username: data.message }))
        } else {
          toast({
            title: "註冊失敗",
            description: data.message,
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("註冊錯誤:", error)
      toast({
        title: "註冊失敗",
        description: "註冊時發生錯誤，請稍後再試",
        variant: "destructive",
      })
    }
  }

  // 處理店家註冊
  const handleStoreRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateStoreForm()) {
      return
    }

    try {
      const response = await fetch("/api/auth/store/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: storeForm.username,
          password: storeForm.password,
          storeName: storeForm.storeName,
          description: storeForm.description,
          address: storeForm.address,
          phone: storeForm.phone,
          email: storeForm.email,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "註冊成功！",
          description: "您的店家帳號已提交，請等待管理員審核",
        })

        // 延遲導向登入頁面，讓用戶有時間看到提示
        setTimeout(() => {
          router.push("/login")
        }, 1500)
      } else {
        if (data.message.includes("帳號")) {
          setStoreErrors((prev) => ({ ...prev, username: data.message }))
        } else {
          toast({
            title: "註冊失敗",
            description: data.message,
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("註冊錯誤:", error)
      toast({
        title: "註冊失敗",
        description: "註冊時發生錯誤，請稍後再試",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">註冊帳號</h1>
          <p className="text-sm text-muted-foreground">請選擇註冊類型並填寫相關資訊</p>
        </div>

        <Tabs defaultValue="user" className="w-full" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="user">用戶註冊</TabsTrigger>
            <TabsTrigger value="store">店家註冊</TabsTrigger>
          </TabsList>
          <TabsContent value="user" className="mt-4">
            <form onSubmit={handleUserRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  姓名 <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="請輸入您的姓名"
                    className={`pl-10 ${userErrors.name ? "border-red-500" : ""}`}
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  />
                </div>
                {userErrors.name && <p className="text-xs text-red-500">{userErrors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">
                  帳號 <span className="text-red-500">*</span>{" "}
                  <span className="text-sm text-muted-foreground">(6-12位英數混合)</span>
                </Label>
                <Input
                  id="username"
                  placeholder="請設定您的帳號"
                  className={userErrors.username ? "border-red-500" : ""}
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                />
                {userErrors.username && <p className="text-xs text-red-500">{userErrors.username}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  手機號碼 <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="請輸入您的手機號碼"
                    className={`pl-10 ${userErrors.phone ? "border-red-500" : ""}`}
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  />
                </div>
                {userErrors.phone && <p className="text-xs text-red-500">{userErrors.phone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  電子郵件 <span className="text-muted-foreground text-sm">(選填)</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="請輸入您的電子郵件"
                    className={`pl-10 ${userErrors.email ? "border-red-500" : ""}`}
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  />
                </div>
                {userErrors.email && <p className="text-xs text-red-500">{userErrors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">
                  系級 <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="department"
                    placeholder="請輸入您的系級"
                    className={`pl-10 ${userErrors.department ? "border-red-500" : ""}`}
                    value={userForm.department}
                    onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                  />
                </div>
                {userErrors.department && <p className="text-xs text-red-500">{userErrors.department}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  密碼 <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="請設定您的密碼"
                    className={userErrors.password ? "border-red-500" : ""}
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-10 w-10"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {userErrors.password && <p className="text-xs text-red-500">{userErrors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  確認密碼 <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="請再次輸入密碼"
                    className={userErrors.confirmPassword ? "border-red-500" : ""}
                    value={userForm.confirmPassword}
                    onChange={(e) => setUserForm({ ...userForm, confirmPassword: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-10 w-10"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {userErrors.confirmPassword && <p className="text-xs text-red-500">{userErrors.confirmPassword}</p>}
              </div>

              <Button type="submit" className="w-full">
                註冊
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="store" className="mt-4">
            <form onSubmit={handleStoreRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="storeName">
                  店家名稱 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="storeName"
                  placeholder="請輸入店家名稱"
                  className={storeErrors.storeName ? "border-red-500" : ""}
                  value={storeForm.storeName}
                  onChange={(e) => setStoreForm({ ...storeForm, storeName: e.target.value })}
                />
                {storeErrors.storeName && <p className="text-xs text-red-500">{storeErrors.storeName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="storeUsername">
                  帳號 <span className="text-red-500">*</span>{" "}
                  <span className="text-sm text-muted-foreground">(6-12位英數混合)</span>
                </Label>
                <Input
                  id="storeUsername"
                  placeholder="請設定店家帳號"
                  className={storeErrors.username ? "border-red-500" : ""}
                  value={storeForm.username}
                  onChange={(e) => setStoreForm({ ...storeForm, username: e.target.value })}
                />
                {storeErrors.username && <p className="text-xs text-red-500">{storeErrors.username}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="storePhone">
                  聯絡電話 <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="storePhone"
                    placeholder="請輸入聯絡電話"
                    className={`pl-10 ${storeErrors.phone ? "border-red-500" : ""}`}
                    value={storeForm.phone}
                    onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                  />
                </div>
                {storeErrors.phone && <p className="text-xs text-red-500">{storeErrors.phone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="storeEmail">
                  電子郵件 <span className="text-muted-foreground text-sm">(選填)</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="storeEmail"
                    type="email"
                    placeholder="請輸入電子郵件"
                    className={`pl-10 ${storeErrors.email ? "border-red-500" : ""}`}
                    value={storeForm.email}
                    onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })}
                  />
                </div>
                {storeErrors.email && <p className="text-xs text-red-500">{storeErrors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="storeDescription">
                  店家描述 <span className="text-muted-foreground text-sm">(選填)</span>
                </Label>
                <Input
                  id="storeDescription"
                  placeholder="請輸入店家描述"
                  value={storeForm.description}
                  onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="storeAddress">
                  店家地址 <span className="text-muted-foreground text-sm">(選填)</span>
                </Label>
                <Input
                  id="storeAddress"
                  placeholder="請輸入店家地址"
                  value={storeForm.address}
                  onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="storePassword">
                  密碼 <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="storePassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="請設定店家密碼"
                    className={storeErrors.password ? "border-red-500" : ""}
                    value={storeForm.password}
                    onChange={(e) => setStoreForm({ ...storeForm, password: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-10 w-10"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {storeErrors.password && <p className="text-xs text-red-500">{storeErrors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="storeConfirmPassword">
                  確認密碼 <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="storeConfirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="請再次輸入密碼"
                    className={storeErrors.confirmPassword ? "border-red-500" : ""}
                    value={storeForm.confirmPassword}
                    onChange={(e) => setStoreForm({ ...storeForm, confirmPassword: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-10 w-10"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {storeErrors.confirmPassword && <p className="text-xs text-red-500">{storeErrors.confirmPassword}</p>}
              </div>

              <Button type="submit" className="w-full">
                註冊
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="text-center text-sm">
          已有帳號？{" "}
          <Link href="/login" className="underline">
            立即登入
          </Link>
        </div>
      </div>
    </div>
  )
}
