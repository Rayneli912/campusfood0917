"use client"

import Link from "next/link"
import type React from "react"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { User, Lock, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { BrandLogo } from "@/components/brand-logo"
import { storeAccounts } from "@/lib/store-accounts"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // 從 URL 參數獲取預設標籤
  const defaultTab = searchParams.get("tab") === "store" ? "store" : "user"

  // 用戶登入表單
  const [userForm, setUserForm] = useState({
    username: "",
    password: "",
  })

  // 店家登入表單
  const [storeForm, setStoreForm] = useState({
    username: "",
    password: "",
  })

  // 處理用戶表單變更
  const handleUserChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setUserForm((prev) => ({ ...prev, [name]: value }))
  }

  // 處理店家表單變更
  const handleStoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setStoreForm((prev) => ({ ...prev, [name]: value }))
  }

  // 提交用戶登入表單
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // 檢查必填欄位
      if (!userForm.username || !userForm.password) {
        toast({
          title: "登入失敗",
          description: "請填寫帳號和密碼",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // 檢查是否為管理員帳號 - 使用 API
      if (userForm.username === "guard") {
        const adminResponse = await fetch("/api/auth/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userForm),
        })

        const adminData = await adminResponse.json()

        if (adminData.success) {
          localStorage.setItem("adminAccount", adminData.admin.username)
          toast({
            title: "登入成功！",
            description: "歡迎回來，系統管理員",
          })
          router.push("/admin/dashboard")
          return
        }
      }

      // 一般用戶登入 - 使用 API
      const response = await fetch("/api/auth/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm),
      })

      const data = await response.json()

      if (data.success && data.user) {
        // 登入成功，儲存用戶資訊
        localStorage.setItem("user", JSON.stringify(data.user))

        toast({
          title: "登入成功！",
          description: "歡迎回來，" + data.user.name,
        })

        // 導向首頁
        router.push("/user/home")
      } else {
        toast({
          title: "登入失敗",
          description: data.message || "帳號或密碼錯誤",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("登入過程中發生錯誤:", error)
      toast({
        title: "登入失敗",
        description: "發生錯誤，請稍後再試",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 提交店家登入表單
  const handleStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // 檢查必填欄位
      if (!storeForm.username || !storeForm.password) {
        toast({
          title: "登入失敗",
          description: "請填寫帳號和密碼",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      console.log("嘗試登入店家帳號:", storeForm.username)

      // 使用 API 登入
      const response = await fetch("/api/auth/store/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(storeForm),
      })

      const data = await response.json()

      if (data.success && data.store) {
        console.log("店家帳號驗證成功:", data.store.name)

        // 儲存帳號資訊到 localStorage
        localStorage.setItem("storeAccount", JSON.stringify(data.store))

        // 顯示成功訊息
        toast({
          title: "登入成功！",
          description: `歡迎回來，${data.store.name}`,
        })

        // 導向店家首頁
        setTimeout(() => {
          router.push("/store/dashboard")
        }, 100)
      } else {
        console.log("店家帳號驗證失敗")

        // 顯示錯誤訊息
        toast({
          title: "登入失敗",
          description: data.message || "帳號或密碼錯誤",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("店家登入過程中發生錯誤:", error)
      toast({
        title: "登入失敗",
        description: "發生錯誤，請稍後再試",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[450px]">
        <div className="flex flex-col items-center space-y-2 text-center">
          <BrandLogo size="lg" />
          <h1 className="text-3xl font-bold tracking-tight">登入</h1>
          <p className="text-sm text-muted-foreground">請選擇登入類型並輸入您的帳號密碼</p>
        </div>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="user">用戶登入</TabsTrigger>
            <TabsTrigger value="store">店家登入</TabsTrigger>
          </TabsList>

          {/* 用戶登入表單 */}
          <TabsContent value="user">
            <Card>
              <CardHeader>
                <CardTitle>用戶登入</CardTitle>
                <CardDescription>登入您的惜食快go帳號</CardDescription>
              </CardHeader>
              <form onSubmit={handleUserSubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="user-username">帳號</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="user-username"
                        name="username"
                        placeholder="請輸入您的帳號"
                        className="pl-10"
                        value={userForm.username}
                        onChange={handleUserChange}
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="user-password">密碼</Label>
                      <Link href="#" className="text-xs text-muted-foreground underline">
                        忘記密碼？
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="user-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="請輸入您的密碼"
                        className="pl-10 pr-10"
                        value={userForm.password}
                        onChange={handleUserChange}
                        required
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "登入中..." : "登入"}
                  </Button>
                  <div className="text-center text-sm">
                    還沒有帳號？{" "}
                    <Link href="/register" className="underline">
                      立即註冊
                    </Link>
                  </div>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          {/* 店家登入表單 */}
          <TabsContent value="store">
            <Card>
              <CardHeader>
                <CardTitle>店家登入</CardTitle>
                <CardDescription>登入您的惜食快go店家帳號</CardDescription>
              </CardHeader>
              <form onSubmit={handleStoreSubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="store-username">帳號</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="store-username"
                        name="username"
                        placeholder="請輸入店家帳號"
                        className="pl-10"
                        value={storeForm.username}
                        onChange={handleStoreChange}
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="store-password">密碼</Label>
                      <Link href="#" className="text-xs text-muted-foreground underline">
                        忘記密碼？
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="store-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="請輸入店家密碼"
                        className="pl-10 pr-10"
                        value={storeForm.password}
                        onChange={handleStoreChange}
                        required
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "登入中..." : "登入"}
                  </Button>
                  <div className="text-center text-sm">
                    還沒有店家帳號？{" "}
                    <Link href="/register?tab=store" className="underline">
                      立即註冊
                    </Link>
                  </div>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
