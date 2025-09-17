"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { parseLineContent, formatDisplayContent } from "@/lib/content-parser"

export default function ContentParserTestPage() {
  const [testContent, setTestContent] = useState("會議便當 (數量: 10) [期限: 20:00前] 備註: 無 [代碼: SSJ2AJ]")
  const [parseResult, setParseResult] = useState<any>(null)
  
  const testSamples = [
    "會議便當 (數量: 10) [期限: 20:00前] 備註: 無 [代碼: SSJ2AJ]",
    "十便當 (數量: 1) [代碼: ABC123]",
    "測試測試 (數量: 5) [期限: 明天中午] 備註: 請提前聯絡 [代碼: XYZ789]",
    "普通新聞內容（非 LINE Bot）"
  ]
  
  const handleTest = () => {
    const parsed = parseLineContent(testContent)
    const formatted = formatDisplayContent(testContent)
    
    setParseResult({
      parsed,
      formatted,
      original: testContent
    })
  }
  
  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>內容解析器測試</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">測試內容：</label>
            <Textarea 
              value={testContent}
              onChange={(e) => setTestContent(e.target.value)}
              placeholder="輸入要測試的內容..."
              rows={3}
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {testSamples.map((sample, index) => (
              <Button 
                key={index}
                size="sm" 
                variant="outline" 
                onClick={() => setTestContent(sample)}
              >
                樣本 {index + 1}
              </Button>
            ))}
          </div>
          
          <Button onClick={handleTest}>測試解析</Button>
        </CardContent>
      </Card>
      
      {parseResult && (
        <Card>
          <CardHeader>
            <CardTitle>解析結果</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">原始內容：</h3>
              <div className="p-3 bg-gray-100 rounded text-sm">
                {parseResult.original}
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">解析結果：</h3>
              <div className="p-3 bg-blue-50 rounded">
                <div className="space-y-1 text-sm">
                  <div><span className="font-medium">物品：</span>{parseResult.parsed.item}</div>
                  {parseResult.parsed.quantity && (
                    <div><span className="font-medium">數量：</span>{parseResult.parsed.quantity}</div>
                  )}
                  {parseResult.parsed.deadline && (
                    <div><span className="font-medium">期限：</span>{parseResult.parsed.deadline}</div>
                  )}
                  {parseResult.parsed.note && parseResult.parsed.note !== '無' && (
                    <div><span className="font-medium">備註：</span>{parseResult.parsed.note}</div>
                  )}
                  {parseResult.parsed.code && (
                    <div className="text-red-500"><span className="font-medium">代碼（隱藏）：</span>{parseResult.parsed.code}</div>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">格式化顯示：</h3>
              <div className="p-3 bg-green-50 rounded text-sm">
                {parseResult.formatted}
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">用戶端實際顯示（模擬）：</h3>
              <div className="p-4 border rounded-lg bg-white">
                <div className="flex items-center mb-2">
                  <span className="text-green-600 mr-2">📍</span>
                  <h3 className="font-medium text-green-800">西灣十樓</h3>
                </div>
                <div className="text-sm text-gray-700">
                  <span className="font-medium">物品：</span>{parseResult.parsed.item}
                  {parseResult.parsed.quantity && (
                    <span className="ml-2">
                      <span className="font-medium">數量：</span>{parseResult.parsed.quantity}
                    </span>
                  )}
                  {parseResult.parsed.deadline && (
                    <span className="ml-2 text-orange-600">
                      <span className="font-medium">期限：</span>{parseResult.parsed.deadline}
                    </span>
                  )}
                  {parseResult.parsed.note && parseResult.parsed.note !== '無' && (
                    <span className="ml-2 text-gray-500">
                      <span className="font-medium">備註：</span>{parseResult.parsed.note}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  📅 2025/9/11 · line
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>功能說明</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div><strong>✅ 代碼隱藏：</strong>用戶端不會顯示 [代碼: XXX] 部分</div>
          <div><strong>✅ 格式解析：</strong>自動提取物品、數量、期限、備註</div>
          <div><strong>✅ 智能顯示：</strong>只顯示有值的欄位</div>
          <div><strong>✅ 備註過濾：</strong>當備註為「無」時不顯示</div>
          <div><strong>✅ 兼容性：</strong>非 LINE Bot 內容正常顯示</div>
        </CardContent>
      </Card>
    </div>
  )
}
