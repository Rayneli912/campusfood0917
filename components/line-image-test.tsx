"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Eye, AlertCircle } from "lucide-react"

interface LinePost {
  id: number
  created_at: string
  location: string
  content: string
  image_url: string | null
  source: string
  status: string
}

export function LineImageTest() {
  const [linePosts, setLinePosts] = useState<LinePost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadLinePosts = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // 載入來自 LINE 的貼文
      const { data, error: fetchError } = await supabase
        .from("near_expiry_posts")
        .select("id, created_at, location, content, image_url, source, status")
        .eq("source", "line")
        .order("created_at", { ascending: false })
        .limit(10)

      if (fetchError) {
        throw fetchError
      }

      console.log("LINE 貼文數據:", data)
      setLinePosts(data || [])
    } catch (err) {
      console.error("載入 LINE 貼文失敗:", err)
      setError(err instanceof Error ? err.message : "載入失敗")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLinePosts()
  }, [])

  const testImageLoad = (imageUrl: string) => {
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      img.onload = () => resolve(true)
      img.onerror = () => reject(false)
      img.src = imageUrl
    })
  }

  const handleTestImage = async (imageUrl: string) => {
    try {
      await testImageLoad(imageUrl)
      alert("圖片載入成功！")
    } catch {
      alert("圖片載入失敗！請檢查 URL 或網絡連接。")
    }
  }

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            載入 LINE Bot 圖片測試...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            載入錯誤
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadLinePosts} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            重新載入
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            LINE Bot 圖片測試
            <Button onClick={loadLinePosts} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 mb-4">
            找到 {linePosts.length} 條來自 LINE Bot 的貼文
          </div>
        </CardContent>
      </Card>

      {linePosts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">沒有找到來自 LINE Bot 的貼文</p>
            <p className="text-sm text-gray-400 mt-2">
              請確保已通過 LINE Bot 發送過圖片或文字消息
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {linePosts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {post.location || "未標地點"}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={post.status === "published" ? "default" : "outline"}>
                      {post.status}
                    </Badge>
                    <Badge variant="secondary">
                      {post.source}
                    </Badge>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(post.created_at).toLocaleString("zh-TW")}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <strong>內容：</strong>
                  <p className="mt-1">{post.content}</p>
                </div>

                {post.image_url ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <strong>圖片：</strong>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestImage(post.image_url!)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          測試載入
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(post.image_url!, "_blank")}
                        >
                          開啟連結
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 break-all bg-gray-50 p-2 rounded">
                      {post.image_url}
                    </div>

                    <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                      <Image
                        src={post.image_url}
                        alt={`LINE 圖片 - ${post.location}`}
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                        onLoad={() => console.log(`圖片載入成功: ${post.image_url}`)}
                        onError={(e) => {
                          console.error(`圖片載入失敗: ${post.image_url}`, e)
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 italic">
                    此貼文沒有圖片
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
