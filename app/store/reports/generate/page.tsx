"use client"

import { useState } from "react"
import { useStoreAuth } from "@/components/store-auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Download, FileText } from "lucide-react"

export default function GenerateReportPage() {
  const { account } = useStoreAuth()
  const { toast } = useToast()

  const [reportType, setReportType] = useState("sales")
  const [dateRange, setDateRange] = useState("today")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [includeItems, setIncludeItems] = useState(true)
  const [includeCharts, setIncludeCharts] = useState(true)
  const [loading, setLoading] = useState(false)

  const handleGenerateReport = () => {
    setLoading(true)

    // 模擬報表生成
    setTimeout(() => {
      toast({
        title: "報表已生成",
        description: "您的報表已成功生成，可以下載了",
      })
      setLoading(false)
    }, 1500)
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h2 className="text-2xl font-bold mb-4">請先登入</h2>
        <p className="text-muted-foreground mb-6">您需要登入才能生成報表</p>
        <Button asChild>
          <a href="/store/login">前往登入</a>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">生成報表</h1>
        <p className="text-muted-foreground mt-1">自定義並生成詳細的營業報表</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>報表設定</CardTitle>
          <CardDescription>選擇報表類型和時間範圍</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="report-type">報表類型</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger id="report-type">
                <SelectValue placeholder="選擇報表類型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sales">銷售報表</SelectItem>
                <SelectItem value="products">商品分析報表</SelectItem>
                <SelectItem value="summary">綜合摘要報表</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-range">時間範圍</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger id="date-range">
                <SelectValue placeholder="選擇時間範圍" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">今天</SelectItem>
                <SelectItem value="yesterday">昨天</SelectItem>
                <SelectItem value="week">本週</SelectItem>
                <SelectItem value="month">本月</SelectItem>
                <SelectItem value="custom">自定義範圍</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dateRange === "custom" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">開始日期</Label>
                <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">結束日期</Label>
                <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          )}

          <div className="space-y-4">
            <Label>報表內容</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-items"
                checked={includeItems}
                onCheckedChange={(checked) => setIncludeItems(checked as boolean)}
              />
              <label
                htmlFor="include-items"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                包含商品詳情
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-charts"
                checked={includeCharts}
                onCheckedChange={(checked) => setIncludeCharts(checked as boolean)}
              />
              <label
                htmlFor="include-charts"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                包含圖表
              </label>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => window.history.back()}>
            返回
          </Button>
          <div className="space-x-2">
            <Button variant="outline" disabled={loading}>
              <Download className="h-4 w-4 mr-1" />
              下載範本
            </Button>
            <Button onClick={handleGenerateReport} disabled={loading}>
              <FileText className="h-4 w-4 mr-1" />
              {loading ? "生成中..." : "生成報表"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
