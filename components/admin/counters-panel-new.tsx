"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { RefreshCw, Save } from "lucide-react"
import { getCounters, updateCounters, subscribeToCounters, type CounterData } from "@/lib/counter-db-service"

export default function CountersPanel() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<CounterData | null>(null)
  
  // 表單狀態
  const [views, setViews] = useState("")
  const [wasteSaved, setWasteSaved] = useState("")
  const [wasteMode, setWasteMode] = useState<"manual" | "completedOrders">("manual")
  const [offset, setOffset] = useState("")
  
  // 新增：網站瀏覽次數模式
  const [viewsMode, setViewsMode] = useState<"manual" | "realtime">("realtime")

  // 載入計數器數據
  const loadCounters = async () => {
    setLoading(true)
    try {
      const counters = await getCounters()
      if (counters) {
        setData(counters)
        setViews(String(counters.views))
        setWasteSaved(String(counters.waste_saved))
        setWasteMode(counters.calc_mode)
        setOffset(String(counters.waste_offset))
      }
    } catch (error) {
      console.error("載入計數器失敗:", error)
      toast({
        title: "錯誤",
        description: "載入計數器數據失敗",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCounters()

    // 訂閱即時更新
    const unsubscribe = subscribeToCounters((newData) => {
      setData(newData)
      // 只在實際數字模式下更新瀏覽次數
      if (viewsMode === "realtime") {
        setViews(String(newData.views))
      }
      setWasteSaved(String(newData.waste_saved))
      setWasteMode(newData.calc_mode)
      setOffset(String(newData.waste_offset))
    })

    return () => unsubscribe()
  }, [])

  // 儲存設定
  const handleSave = async () => {
    setSaving(true)
    try {
      const success = await updateCounters({
        views: parseInt(views) || 0,
        waste_saved: parseInt(wasteSaved) || 0,
        calc_mode: wasteMode,
        waste_offset: parseInt(offset) || 0,
      })

      if (success) {
        toast({
          title: "儲存成功",
          description: "計數器設定已更新，所有用戶將看到新的數值",
        })
      } else {
        throw new Error("Update failed")
      }
    } catch (error) {
      toast({
        title: "錯誤",
        description: "儲存設定失敗，請稍後再試",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // 快速調整
  const adjustViews = (delta: number) => {
    setViews(String(Math.max(0, (parseInt(views) || 0) + delta)))
  }

  const adjustWaste = (delta: number) => {
    setWasteSaved(String(Math.max(0, (parseInt(wasteSaved) || 0) + delta)))
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>計數器管理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">載入中...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>計數器管理</CardTitle>
        <CardDescription>
          管理首頁顯示的網站統計數據，修改後將同步到所有用戶
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 網站瀏覽次數 */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">網站瀏覽次數</Label>
          <RadioGroup value={viewsMode} onValueChange={(v: any) => setViewsMode(v)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="realtime" id="views-realtime" />
              <Label htmlFor="views-realtime" className="font-normal cursor-pointer">
                實際數字 - 顯示真實的瀏覽統計
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="manual" id="views-manual" />
              <Label htmlFor="views-manual" className="font-normal cursor-pointer">
                手動操作 - 自行設定顯示數值
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* 實際數字模式 */}
        {viewsMode === "realtime" && (
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">目前真實瀏覽次數</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  每次用戶訪問首頁時自動增加
                </p>
              </div>
              <div className="text-2xl font-bold tabular-nums">
                {parseInt(views || "0").toLocaleString()}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              💡 此模式顯示實際的網站瀏覽統計，無法手動修改
            </div>
          </div>
        )}

        {/* 手動操作模式 */}
        {viewsMode === "manual" && (
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <Label>手動設定顯示數值</Label>
            <p className="text-sm text-muted-foreground">
              設定後，首頁將顯示您指定的數值（不再自動增加）
            </p>
            <div className="flex gap-2">
              <Input
                type="number"
                value={views}
                onChange={(e) => setViews(e.target.value)}
                className="flex-1"
                placeholder="輸入數值"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => adjustViews(-10)}
              >
                -10
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => adjustViews(+10)}
              >
                +10
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => adjustViews(+100)}
              >
                +100
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              將顯示：<span className="font-semibold">{parseInt(views || "0").toLocaleString()}</span> 次
            </div>
          </div>
        )}

        {/* 減少糧食浪費次數 - 計算模式 */}
        <div className="space-y-3 pt-4 border-t">
          <Label className="text-base font-semibold">減少糧食浪費次數</Label>
          <RadioGroup value={wasteMode} onValueChange={(v: any) => setWasteMode(v)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="manual" id="manual" />
              <Label htmlFor="manual" className="font-normal cursor-pointer">
                手動設定 - 自行輸入數值
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="completedOrders" id="auto" />
              <Label htmlFor="auto" className="font-normal cursor-pointer">
                自動計算 - 根據完成的訂單數量 + 基準值
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* 手動模式 */}
        {wasteMode === "manual" && (
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <Label>手動設定數值</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={wasteSaved}
                onChange={(e) => setWasteSaved(e.target.value)}
                className="flex-1"
                placeholder="輸入數值"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => adjustWaste(-10)}
              >
                -10
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => adjustWaste(+10)}
              >
                +10
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => adjustWaste(+100)}
              >
                +100
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              目前顯示：<span className="font-semibold">{parseInt(wasteSaved || "0").toLocaleString()}</span> 次
            </div>
          </div>
        )}

        {/* 自動模式 */}
        {wasteMode === "completedOrders" && (
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <Label>自動計算設定</Label>
            <p className="text-sm text-muted-foreground">
              顯示值 = 完成訂單數 + 基準值
            </p>
            <div className="space-y-2">
              <Label className="text-sm">基準值（可調整初始數字）</Label>
              <Input
                type="number"
                value={offset}
                onChange={(e) => setOffset(e.target.value)}
                placeholder="例如：1000"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              目前完成訂單數：
              <span className="font-semibold">
                {JSON.parse(localStorage.getItem("orders") || "[]").filter((o: any) => o.status === "completed").length}
              </span> 筆
              <br />
              顯示值：
              <span className="font-semibold">
                {(JSON.parse(localStorage.getItem("orders") || "[]").filter((o: any) => o.status === "completed").length + parseInt(offset || "0")).toLocaleString()}
              </span> 次
            </div>
          </div>
        )}

        {/* 操作按鈕 */}
        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1"
          >
            {saving ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                儲存中...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                儲存並同步到所有用戶
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={loadCounters}
            disabled={loading || saving}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* 提示 */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p>💡 <strong>提示：</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>修改後點擊「儲存」按鈕，所有用戶會即時看到更新</li>
            <li>瀏覽次數會隨著用戶訪問自動增加</li>
            <li>自動模式適合讓數字隨訂單增長，手動模式適合靈活調整</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

