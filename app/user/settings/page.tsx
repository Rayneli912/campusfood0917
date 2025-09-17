"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Bell, Moon, Sun, Shield } from "lucide-react"

export default function SettingsPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState({
    theme: "light",
    language: "zh-TW",
    notifications: {
      email: true,
      push: true,
      sms: false,
      promotions: true,
      orderUpdates: true,
    },
    privacy: {
      shareLocation: true,
      shareHistory: false,
      allowTracking: true,
    },
  })

  const handleThemeChange = (value: string) => {
    setSettings({
      ...settings,
      theme: value,
    })
  }

  const handleLanguageChange = (value: string) => {
    setSettings({
      ...settings,
      language: value,
    })
  }

  const handleNotificationChange = (key: string, checked: boolean) => {
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: checked,
      },
    })
  }

  const handlePrivacyChange = (key: string, checked: boolean) => {
    setSettings({
      ...settings,
      privacy: {
        ...settings.privacy,
        [key]: checked,
      },
    })
  }

  const handleSaveSettings = () => {
    toast({
      title: "設定已儲存",
      description: "您的偏好設定已成功更新",
    })
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">設定</h1>
        <p className="text-muted-foreground">管理您的應用程式偏好設定</p>
      </div>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Sun className="mr-2 h-5 w-5 text-brand-accent" />
              <span>外觀</span>
            </CardTitle>
            <CardDescription>自訂應用程式的外觀和顯示方式</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>主題</Label>
                <RadioGroup value={settings.theme} onValueChange={handleThemeChange} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="light" id="theme-light" />
                    <Label htmlFor="theme-light" className="flex items-center">
                      <Sun className="mr-2 h-4 w-4" />
                      淺色
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dark" id="theme-dark" />
                    <Label htmlFor="theme-dark" className="flex items-center">
                      <Moon className="mr-2 h-4 w-4" />
                      深色
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="system" id="theme-system" />
                    <Label htmlFor="theme-system">系統預設</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">語言</Label>
                <Select value={settings.language} onValueChange={handleLanguageChange}>
                  <SelectTrigger id="language" className="w-full md:w-[240px]">
                    <SelectValue placeholder="選擇語言" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zh-TW">繁體中文</SelectItem>
                    <SelectItem value="en-US">English (US)</SelectItem>
                    <SelectItem value="ja-JP">日本語</SelectItem>
                    <SelectItem value="ko-KR">한국어</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="mr-2 h-5 w-5 text-brand-primary" />
              <span>通知</span>
            </CardTitle>
            <CardDescription>管理您接收通知的方式</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-notifications" className="font-medium">
                    電子郵件通知
                  </Label>
                  <p className="text-sm text-muted-foreground">接收訂單更新和促銷資訊</p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={settings.notifications.email}
                  onCheckedChange={(checked) => handleNotificationChange("email", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="push-notifications" className="font-medium">
                    推播通知
                  </Label>
                  <p className="text-sm text-muted-foreground">接收即時訂單狀態更新</p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={settings.notifications.push}
                  onCheckedChange={(checked) => handleNotificationChange("push", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sms-notifications" className="font-medium">
                    簡訊通知
                  </Label>
                  <p className="text-sm text-muted-foreground">接收訂單確認和重要更新</p>
                </div>
                <Switch
                  id="sms-notifications"
                  checked={settings.notifications.sms}
                  onCheckedChange={(checked) => handleNotificationChange("sms", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="promo-notifications" className="font-medium">
                    促銷資訊
                  </Label>
                  <p className="text-sm text-muted-foreground">接收優惠和特價資訊</p>
                </div>
                <Switch
                  id="promo-notifications"
                  checked={settings.notifications.promotions}
                  onCheckedChange={(checked) => handleNotificationChange("promotions", checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5 text-brand-secondary" />
              <span>隱私與安全</span>
            </CardTitle>
            <CardDescription>管理您的隱私和安全設定</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="share-location" className="font-medium">
                    分享位置資訊
                  </Label>
                  <p className="text-sm text-muted-foreground">允許應用程式使用您的位置資訊</p>
                </div>
                <Switch
                  id="share-location"
                  checked={settings.privacy.shareLocation}
                  onCheckedChange={(checked) => handlePrivacyChange("shareLocation", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="share-history" className="font-medium">
                    分享瀏覽歷史
                  </Label>
                  <p className="text-sm text-muted-foreground">允許分享您的瀏覽歷史以獲得更好的推薦</p>
                </div>
                <Switch
                  id="share-history"
                  checked={settings.privacy.shareHistory}
                  onCheckedChange={(checked) => handlePrivacyChange("shareHistory", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="allow-tracking" className="font-medium">
                    允許追蹤
                  </Label>
                  <p className="text-sm text-muted-foreground">允許應用程式收集使用數據以改善服務</p>
                </div>
                <Switch
                  id="allow-tracking"
                  checked={settings.privacy.allowTracking}
                  onCheckedChange={(checked) => handlePrivacyChange("allowTracking", checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSaveSettings} className="px-8">
            儲存所有設定
          </Button>
        </div>
      </div>
    </div>
  )
}
