"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { RefreshCw, CheckCircle, XCircle, Users, Clock } from "lucide-react"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface SyncStats {
  total: number
  withName: number
  withoutName: number
}

interface SyncResult {
  total: number
  updated: number
  failed: number
  skipped: number
}

export default function SyncLineNamesPage() {
  const { toast } = useToast()
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<SyncStats | null>(null)
  const [lastResult, setLastResult] = useState<SyncResult | null>(null)

  // 載入當前統計
  const loadStats = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/line/sync-names")
      const data = await res.json()
      
      if (data.success) {
        setStats(data.stats)
      } else {
        toast({
          title: "載入失敗",
          description: data.error || "無法載入統計資料",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "錯誤",
        description: "載入統計資料時發生錯誤",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // 執行同步
  const handleSync = async () => {
    if (!confirm("確定要開始同步所有用戶的暱稱嗎？這可能需要幾分鐘時間。")) {
      return
    }

    setSyncing(true)
    setLastResult(null)
    
    try {
      const res = await fetch("/api/line/sync-names", {
        method: "POST",
      })
      
      const data = await res.json()
      
      if (data.success) {
        setLastResult({
          total: data.total,
          updated: data.updated,
          failed: data.failed,
          skipped: data.skipped,
        })
        
        toast({
          title: "同步完成！",
          description: `成功更新 ${data.updated} 個用戶的暱稱`,
        })
        
        // 重新載入統計
        await loadStats()
      } else {
        toast({
          title: "同步失敗",
          description: data.error || "同步過程中發生錯誤",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "錯誤",
        description: "執行同步時發生錯誤",
        variant: "destructive",
      })
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  const syncProgress = stats ? (stats.withName / stats.total) * 100 : 0

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">LINE 用戶暱稱同步工具</h1>
        <p className="text-muted-foreground">
          一鍵同步所有 LINE 好友的暱稱到資料庫
        </p>
      </div>

      <div className="grid gap-6">
        {/* 當前狀態 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              當前同步狀態
            </CardTitle>
            <CardDescription>
              資料庫中用戶暱稱的統計資料
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                載入中...
              </div>
            ) : stats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold">{stats.total}</div>
                    <div className="text-sm text-muted-foreground">總用戶數</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-green-600">{stats.withName}</div>
                    <div className="text-sm text-muted-foreground">已有暱稱</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-yellow-600">{stats.withoutName}</div>
                    <div className="text-sm text-muted-foreground">缺少暱稱</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>同步進度</span>
                    <span>{Math.round(syncProgress)}%</span>
                  </div>
                  <Progress value={syncProgress} className="h-2" />
                </div>

                <div className="flex gap-2 justify-center">
                  <Button onClick={loadStats} variant="outline" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    重新載入
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                無法載入統計資料
              </div>
            )}
          </CardContent>
        </Card>

        {/* 上次同步結果 */}
        {lastResult && (
          <Card className="border-green-500 bg-green-50 dark:bg-green-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                同步結果
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{lastResult.total}</div>
                  <div className="text-sm text-muted-foreground">處理總數</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{lastResult.updated}</div>
                  <div className="text-sm text-muted-foreground">成功更新</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{lastResult.failed}</div>
                  <div className="text-sm text-muted-foreground">失敗</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-600">{lastResult.skipped}</div>
                  <div className="text-sm text-muted-foreground">跳過</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 執行同步 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              執行同步
            </CardTitle>
            <CardDescription>
              從 LINE API 獲取所有追蹤用戶的最新暱稱
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2 text-yellow-800 dark:text-yellow-400">
                <Clock className="h-4 w-4" />
                注意事項
              </h4>
              <ul className="text-sm space-y-1 text-yellow-700 dark:text-yellow-300">
                <li>• 同步過程可能需要幾分鐘，取決於用戶數量</li>
                <li>• 系統會自動分批處理，避免超過 LINE API 限制</li>
                <li>• 只會同步仍在追蹤（followed=true）的用戶</li>
                <li>• 同步期間請勿關閉此頁面</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleSync}
                disabled={syncing || !stats || stats.withoutName === 0}
                size="lg"
                className="w-full"
              >
                {syncing ? (
                  <>
                    <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                    同步中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-5 w-5" />
                    開始同步用戶暱稱
                  </>
                )}
              </Button>

              {stats && stats.withoutName === 0 && (
                <p className="text-center text-sm text-green-600">
                  ✓ 所有用戶都已有暱稱，無需同步
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 使用說明 */}
        <Card>
          <CardHeader>
            <CardTitle>使用說明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <h4 className="font-semibold mb-1">什麼時候需要同步？</h4>
              <p className="text-muted-foreground">
                當資料庫中有用戶的暱稱顯示為 NULL 時，代表這些用戶是在暱稱功能新增前就已經加入的。執行同步可以一次性為所有現有用戶填入暱稱。
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">同步後的自動更新</h4>
              <p className="text-muted-foreground">
                同步完成後，系統會在每次用戶互動時自動更新其暱稱，無需再次手動同步。
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">API 限制</h4>
              <p className="text-muted-foreground">
                系統已設置分批處理機制（每批 10 個用戶，間隔 1 秒），以避免超過 LINE API 的請求限制。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
