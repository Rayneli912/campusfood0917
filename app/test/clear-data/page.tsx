"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"
import { Trash2, AlertTriangle, CheckCircle } from "lucide-react"
import { useState } from "react"

export default function ClearDataPage() {
  const { toast } = useToast()
  const [clearing, setClearing] = useState(false)

  const clearLocalStorage = () => {
    try {
      // 清除 localStorage 中的新聞數據
      localStorage.removeItem("news")
      localStorage.setItem("news", JSON.stringify([]))
      
      toast({
        title: "成功",
        description: "已清除 localStorage 中的舊新聞數據",
      })
      
      // 刷新頁面
      window.location.reload()
    } catch (error) {
      toast({
        title: "錯誤",
        description: "清除 localStorage 數據時發生錯誤",
        variant: "destructive",
      })
    }
  }

  const clearDatabaseTestData = async () => {
    setClearing(true)
    try {
      // 刪除包含特定關鍵字的測試數據
      const testKeywords = [
        "慶祝「🍃惜食快go」平台上線",
        "學生餐廳晚間八點後",
        "武嶺福利社上架即期麵包",
        "校園超商推出新款即期麵包",
        "本週五起，惜食快go攜手校內",
      ]

      let deletedCount = 0

      for (const keyword of testKeywords) {
        const { data, error } = await supabase
          .from("near_expiry_posts")
          .delete()
          .ilike("location", `%${keyword}%`)

        if (!error && data) {
          deletedCount += data.length
        }

        // 也嘗試從 content 欄位刪除
        const { data: data2, error: error2 } = await supabase
          .from("near_expiry_posts")
          .delete()
          .ilike("content", `%${keyword}%`)

        if (!error2 && data2) {
          deletedCount += data2.length
        }
      }

      toast({
        title: "成功",
        description: `已嘗試清除資料庫中的測試數據（刪除 ${deletedCount} 筆）`,
      })

      // 刷新頁面
      setTimeout(() => window.location.reload(), 1500)
    } catch (error) {
      console.error("清除資料庫數據錯誤:", error)
      toast({
        title: "錯誤",
        description: "清除資料庫數據時發生錯誤",
        variant: "destructive",
      })
    } finally {
      setClearing(false)
    }
  }

  const clearAllData = async () => {
    clearLocalStorage()
    await clearDatabaseTestData()
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">清除舊數據工具</h1>
        <p className="text-muted-foreground">
          此工具用於清除系統中的預設測試數據和舊數據
        </p>
      </div>

      <div className="grid gap-6">
        {/* 警告卡片 */}
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="h-5 w-5" />
              注意事項
            </CardTitle>
            <CardDescription className="text-yellow-600 dark:text-yellow-300">
              清除操作無法復原，請確認後再執行
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-yellow-700 dark:text-yellow-300">
            <ul className="list-disc list-inside space-y-1">
              <li>清除 localStorage 會刪除瀏覽器中暫存的新聞數據</li>
              <li>清除資料庫會嘗試刪除包含特定關鍵字的測試數據</li>
              <li>執行後頁面會自動刷新</li>
            </ul>
          </CardContent>
        </Card>

        {/* 清除 localStorage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              清除 localStorage 數據
            </CardTitle>
            <CardDescription>
              清除瀏覽器中保存的舊新聞數據（本地緩存）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                這將清除以下數據：
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>localStorage 中的 "news" 鍵值</li>
                  <li>所有本地緩存的新聞項目</li>
                </ul>
              </div>
              <Button onClick={clearLocalStorage} variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                清除 localStorage
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 清除資料庫測試數據 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              清除資料庫測試數據
            </CardTitle>
            <CardDescription>
              從 Supabase 資料庫中刪除預設的測試新聞
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                這將嘗試刪除包含以下關鍵字的數據：
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>"慶祝「🍃惜食快go」平台上線"</li>
                  <li>"學生餐廳晚間八點後"</li>
                  <li>"武嶺福利社上架即期麵包"</li>
                  <li>"校園超商推出新款即期麵包"</li>
                  <li>"本週五起，惜食快go攜手校內"</li>
                </ul>
              </div>
              <Button
                onClick={clearDatabaseTestData}
                variant="destructive"
                disabled={clearing}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {clearing ? "清除中..." : "清除資料庫數據"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 一鍵清除全部 */}
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              一鍵清除所有舊數據
            </CardTitle>
            <CardDescription>
              同時清除 localStorage 和資料庫中的測試數據
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={clearAllData}
              variant="destructive"
              size="lg"
              disabled={clearing}
            >
              <Trash2 className="mr-2 h-5 w-5" />
              {clearing ? "清除中..." : "清除所有舊數據"}
            </Button>
          </CardContent>
        </Card>

        {/* 說明卡片 */}
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              完成後的檢查步驟
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-green-700 dark:text-green-300">
            <ol className="list-decimal list-inside space-y-2">
              <li>等待頁面自動刷新</li>
              <li>前往「即食消息」頁面檢查是否還有預設數據</li>
              <li>如果還有殘留數據，可以在管理員後台手動刪除</li>
              <li>確認所有預設數據清除後，即可正常使用系統</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

