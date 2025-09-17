"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"

interface DraftPost {
  id: string
  content: string
  image_url: string | null
  status: string
  created_at: string
  location: string
}

export default function ImageDraftTestPage() {
  const [draftPosts, setDraftPosts] = useState<DraftPost[]>([])
  const [loading, setLoading] = useState(true)

  const loadDraftPosts = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/news?includeAll=true")
      if (response.ok) {
        const { data } = await response.json()
        const drafts = data.filter((post: any) => post.status === 'draft')
        setDraftPosts(drafts)
      }
    } catch (error) {
      console.error("載入草稿失敗:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDraftPosts()
  }, [])

  const refreshData = () => {
    loadDraftPosts()
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">圖片草稿測試</h1>
          <p className="text-gray-600">測試只有圖片的隱藏貼文功能</p>
        </div>
        <Button onClick={refreshData}>重新整理</Button>
      </div>

      {loading ? (
        <div className="text-center py-8">載入中...</div>
      ) : draftPosts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          沒有找到草稿貼文
          <div className="mt-2 text-sm">
            請在 LINE 中發送圖片來創建草稿貼文
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {draftPosts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{post.location || "待補充地點"}</CardTitle>
                  <Badge variant="outline" className="text-orange-600">
                    草稿
                  </Badge>
                </div>
                <div className="text-sm text-gray-500">
                  ID: {post.id}
                </div>
                <div className="text-sm text-gray-500">
                  建立時間: {new Date(post.created_at).toLocaleString()}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <strong>內容:</strong>
                    <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                      {post.content}
                    </div>
                  </div>

                  {post.image_url ? (
                    <div>
                      <strong>圖片:</strong>
                      <div className="mt-2">
                        <div className="text-xs text-gray-500 mb-2">
                          URL: {post.image_url}
                        </div>
                        <div className="relative inline-block rounded-lg overflow-hidden border">
                          <Image
                            src={post.image_url}
                            alt={`草稿圖片 - ${post.location}`}
                            width={300}
                            height={200}
                            className="object-contain"
                            style={{ maxWidth: '100%', height: 'auto' }}
                            onLoad={() => console.log(`圖片載入成功: ${post.image_url}`)}
                            onError={(e) => {
                              console.error(`圖片載入失敗: ${post.image_url}`, e)
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 italic">
                      此草稿沒有圖片
                    </div>
                  )}

                  <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded">
                    <strong>測試說明:</strong>
                    <ul className="mt-2 space-y-1 text-xs">
                      <li>• 這是只有圖片的草稿貼文，不會顯示在用戶端</li>
                      <li>• 用戶需要使用代碼補充完整內容才會發布</li>
                      <li>• 狀態為 'draft'，只有管理員可以看到</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">📱 測試步驟</h3>
        <ol className="text-sm text-yellow-700 space-y-1">
          <li>1. 在 LINE 中發送一張圖片（不要加任何文字）</li>
          <li>2. 系統會回覆貼文代碼</li>
          <li>3. 重新整理此頁面，應該會看到新的草稿貼文</li>
          <li>4. 檢查用戶端頁面，確認草稿不會顯示</li>
          <li>5. 使用代碼補充內容，草稿會變成已發布</li>
        </ol>
      </div>
    </div>
  )
}
