"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { AlertCircle, CheckCircle, MessageSquare, Edit3 } from "lucide-react"
import { LineMessageParser, PostTokenManager } from "@/lib/post-token-manager"

export default function LineFormatTestPage() {
  const [message, setMessage] = useState("")
  const [testResults, setTestResults] = useState<any[]>([])
  const [generatedToken, setGeneratedToken] = useState("")
  
  // 預設測試訊息
  const sampleMessages = {
    valid: `【地點】：圖書館一樓
【物品】：便當
【數量】：2
【領取期限】：今天下午 5 點前
【備註】：請聯絡 LINE ID: example`,
    
    validMinimal: `【地點】：學生餐廳
【物品】：麵包
【數量】：5
【領取期限】：
【備註】：`,
    
    invalidMissingLocation: `【地點】：
【物品】：便當
【數量】：2
【領取期限】：今天下午 5 點前
【備註】：請聯絡 LINE ID: example`,
    
    invalidQuantity: `【地點】：圖書館一樓
【物品】：便當
【數量】：abc
【領取期限】：今天下午 5 點前
【備註】：請聯絡 LINE ID: example`,
    
    invalidFormat: `地點：圖書館一樓
物品：便當
數量：2`,
    
    editValid: `修改+ABC123
【地點】：圖書館二樓
【物品】：飲料
【數量】：3
【領取期限】：明天中午前
【備註】：已更新`,
    
    editInvalidCode: `修改+INVALID
【地點】：圖書館二樓
【物品】：飲料
【數量】：3
【領取期限】：明天中午前
【備註】：已更新`
  }
  
  const addResult = (test: string, success: boolean, message: string, data?: any) => {
    setTestResults(prev => [...prev, { 
      test, 
      success, 
      message, 
      data: data ? JSON.stringify(data, null, 2) : null,
      timestamp: new Date().toLocaleTimeString()
    }])
  }
  
  const testNewPostMessage = () => {
    const result = LineMessageParser.parseNewPostMessage(message)
    
    if (result.success) {
      addResult("新增貼文解析", true, "格式正確，解析成功", result.data)
    } else {
      addResult("新增貼文解析", false, `格式錯誤：${result.errors?.join(", ")}`, result.errors)
    }
  }
  
  const testEditPostMessage = () => {
    const result = LineMessageParser.parseEditPostMessage(message)
    
    if (result.success) {
      addResult("修改貼文解析", true, `代碼：${result.token}，內容解析成功`, {
        token: result.token,
        data: result.data
      })
    } else {
      addResult("修改貼文解析", false, `格式錯誤：${result.errors?.join(", ")}`, result.errors)
    }
  }
  
  const generateToken = () => {
    const token = PostTokenManager.generateToken()
    const hash = PostTokenManager.hashToken(token)
    const expires = PostTokenManager.getExpirationDate(7)
    
    setGeneratedToken(token)
    addResult("代碼生成", true, `生成成功：${token}`, {
      token,
      hash,
      expires,
      isExpired: PostTokenManager.isTokenExpired(expires)
    })
  }
  
  const testTokenVerification = () => {
    if (!generatedToken) {
      addResult("代碼驗證", false, "請先生成代碼")
      return
    }
    
    const hash = PostTokenManager.hashToken(generatedToken)
    const isValid = PostTokenManager.verifyToken(generatedToken, hash)
    
    addResult("代碼驗證", isValid, `代碼 ${generatedToken} 驗證${isValid ? "成功" : "失敗"}`, {
      token: generatedToken,
      hash,
      isValid
    })
  }
  
  const loadSample = (key: keyof typeof sampleMessages) => {
    setMessage(sampleMessages[key])
  }
  
  const clearResults = () => {
    setTestResults([])
  }
  
  const getFormatInstructions = () => {
    const instructions = LineMessageParser.getFormatInstructions()
    addResult("格式說明", true, "格式教學內容", instructions)
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>LINE Bot 格式化訊息測試</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 預設測試訊息 */}
          <div>
            <h3 className="font-semibold mb-2">預設測試訊息：</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              <Button size="sm" variant="outline" onClick={() => loadSample("valid")}>
                有效格式（完整）
              </Button>
              <Button size="sm" variant="outline" onClick={() => loadSample("validMinimal")}>
                有效格式（最小）
              </Button>
              <Button size="sm" variant="outline" onClick={() => loadSample("invalidMissingLocation")}>
                缺少地點
              </Button>
              <Button size="sm" variant="outline" onClick={() => loadSample("invalidQuantity")}>
                數量錯誤
              </Button>
              <Button size="sm" variant="outline" onClick={() => loadSample("invalidFormat")}>
                格式錯誤
              </Button>
              <Button size="sm" variant="outline" onClick={() => loadSample("editValid")}>
                修改格式（有效）
              </Button>
              <Button size="sm" variant="outline" onClick={() => loadSample("editInvalidCode")}>
                修改格式（無效代碼）
              </Button>
            </div>
          </div>
          
          {/* 訊息輸入 */}
          <div>
            <label className="block text-sm font-medium mb-2">測試訊息：</label>
            <Textarea 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="輸入要測試的 LINE 訊息..."
              rows={8}
            />
          </div>
          
          {/* 測試按鈕 */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={testNewPostMessage} className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              測試新增格式
            </Button>
            <Button onClick={testEditPostMessage} className="flex items-center gap-2">
              <Edit3 className="h-4 w-4" />
              測試修改格式
            </Button>
            <Button onClick={getFormatInstructions} variant="outline">
              獲取格式說明
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* 貼文代碼測試 */}
      <Card>
        <CardHeader>
          <CardTitle>貼文代碼管理測試</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button onClick={generateToken}>生成新代碼</Button>
            <Button onClick={testTokenVerification} disabled={!generatedToken}>
              驗證代碼
            </Button>
            {generatedToken && (
              <div className="flex items-center gap-2">
                <span className="text-sm">當前代碼：</span>
                <Badge variant="secondary" className="font-mono">{generatedToken}</Badge>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Input 
              value={generatedToken}
              onChange={(e) => setGeneratedToken(e.target.value)}
              placeholder="輸入代碼進行測試"
              className="max-w-xs"
            />
            <Button onClick={testTokenVerification} size="sm">驗證</Button>
          </div>
        </CardContent>
      </Card>

      {/* 測試結果 */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>測試結果</CardTitle>
            <Button onClick={clearResults} variant="outline" size="sm">
              清空結果
            </Button>
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
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto whitespace-pre-wrap">
                        {typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* 使用說明 */}
      <Card>
        <CardHeader>
          <CardTitle>使用說明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <h4 className="font-semibold">新增貼文格式：</h4>
            <pre className="bg-gray-100 p-2 rounded mt-1 text-xs">
{`【地點】：圖書館一樓
【物品】：便當
【數量】：2
【領取期限】：今天下午 5 點前
【備註】：請聯絡 LINE ID: example`}
            </pre>
          </div>
          
          <div>
            <h4 className="font-semibold">修改貼文格式：</h4>
            <pre className="bg-gray-100 p-2 rounded mt-1 text-xs">
{`修改+ABC123
【地點】：圖書館二樓
【物品】：飲料
【數量】：3
【領取期限】：明天中午前
【備註】：已更新`}
            </pre>
          </div>
          
          <div>
            <h4 className="font-semibold">驗證規則：</h4>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>必填：地點、物品、數量</li>
              <li>數量必須為 1-999 的數字</li>
              <li>允許全形/半形冒號</li>
              <li>領取期限和備註可為空</li>
              <li>代碼為 6 位大寫字母+數字組合</li>
              <li>代碼有效期為 7 天</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
