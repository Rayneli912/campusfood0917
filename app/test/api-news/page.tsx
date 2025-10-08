"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react"

export default function ApiNewsTestPage() {
  const [testResults, setTestResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [testNewsId, setTestNewsId] = useState("")
  
  const addResult = (test: string, success: boolean, message: string, data?: any) => {
    setTestResults(prev => [...prev, { 
      test, 
      success, 
      message, 
      data: data ? JSON.stringify(data, null, 2) : null,
      timestamp: new Date().toLocaleTimeString()
    }])
  }

  const testCreateNews = async () => {
    try {
      const response = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "測試新聞 - API 測試",
          content: "這是一條測試新聞，用於驗證 API 功能",
          source: "測試來源",
          isPublished: true,
          image_url: null
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        setTestNewsId(result.data.id.toString())
        addResult("創建新聞", true, "新聞創建成功", result)
      } else {
        addResult("創建新聞", false, result.error || "創建失敗", result)
      }
    } catch (error) {
      addResult("創建新聞", false, `網絡錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`)
    }
  }

  const testUpdateNews = async () => {
    if (!testNewsId) {
      addResult("更新新聞", false, "請先創建測試新聞")
      return
    }

    try {
      const response = await fetch(`/api/news/${testNewsId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "測試新聞 - 已更新",
          content: "這是更新後的測試新聞內容",
          source: "更新來源",
          isPublished: false,
          image_url: null
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        addResult("更新新聞", true, "新聞更新成功", result)
      } else {
        addResult("更新新聞", false, result.error || "更新失敗", result)
      }
    } catch (error) {
      addResult("更新新聞", false, `網絡錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`)
    }
  }

  const testDeleteNews = async () => {
    if (!testNewsId) {
      addResult("刪除新聞", false, "請先創建測試新聞")
      return
    }

    try {
      const response = await fetch(`/api/news/${testNewsId}`, {
        method: "DELETE"
      })
      
      const result = await response.json()
      
      if (response.ok) {
        addResult("刪除新聞", true, "新聞刪除成功", result)
        setTestNewsId("") // 清空 ID
      } else {
        addResult("刪除新聞", false, result.error || "刪除失敗", result)
      }
    } catch (error) {
      addResult("刪除新聞", false, `網絡錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`)
    }
  }

  const testGetNews = async () => {
    try {
      const response = await fetch("/api/news")
      const result = await response.json()
      
      if (response.ok) {
        addResult("獲取新聞列表", true, `成功獲取 ${result.data?.length || 0} 條新聞`, result)
      } else {
        addResult("獲取新聞列表", false, result.error || "獲取失敗", result)
      }
    } catch (error) {
      addResult("獲取新聞列表", false, `網絡錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`)
    }
  }

  const runAllTests = async () => {
    setLoading(true)
    setTestResults([])
    
    await testGetNews()
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    await testCreateNews()
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    await testUpdateNews()
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    await testDeleteNews()
    
    setLoading(false)
  }

  const clearResults = () => {
    setTestResults([])
    setTestNewsId("")
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>新聞 API 端點測試</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={testGetNews} disabled={loading}>
              測試獲取新聞
            </Button>
            <Button onClick={testCreateNews} disabled={loading}>
              測試創建新聞
            </Button>
            <Button onClick={testUpdateNews} disabled={loading || !testNewsId}>
              測試更新新聞
            </Button>
            <Button onClick={testDeleteNews} disabled={loading || !testNewsId}>
              測試刪除新聞
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={runAllTests} disabled={loading} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              運行所有測試
            </Button>
            <Button onClick={clearResults} variant="outline">
              清空結果
            </Button>
          </div>

          {testNewsId && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
              <span className="text-sm">當前測試新聞 ID:</span>
              <Input 
                value={testNewsId} 
                onChange={(e) => setTestNewsId(e.target.value)}
                className="h-8"
                placeholder="輸入新聞 ID 進行測試"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>測試結果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className="font-medium">{result.test}</span>
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.success ? "成功" : "失敗"}
                      </Badge>
                    </div>
                    <span className="text-sm text-gray-500">{result.timestamp}</span>
                  </div>
                  
                  <div className="text-sm text-gray-700 mb-2">
                    {result.message}
                  </div>
                  
                  {result.data && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-blue-600">
                        查看詳細數據
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                        {result.data}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
