"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, NewspaperIcon, Calendar, Building, MapPin, Clock } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase/client"
import { NewsPhotoThumbnail } from "@/components/news-photo-thumbnail"
import { NEWS_DATA_UPDATED } from "@/lib/sync-service"
import type { NewsItem as NewsItemType } from "@/types"
import { parseLineContent } from "@/lib/content-parser"
import Image from "next/image"

// 從 Supabase 取回的資料型別（保留供參考）
type DbPost = {
  id: string
  created_at: string
  location: string | null
  content: string | null
  image_url: string | null
  status: string | null
  source: string | null
  quantity?: string | null  // ★ 改为string，支持任意文本
  deadline?: string | null
  note?: string | null
}

// 輔助函數：獲取新聞的圖片數組（❗僅單張，符合「一則貼文一張圖」）
function getNewsImages(news: NewsItemType): string[] {
  const images: string[] = []
  const arr = (news as any).images as string[] | undefined

  if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === "string" && arr[0].trim() !== "") {
    images.push(arr[0])
  } else if ((news as any).image_url && String((news as any).image_url).trim() !== "") {
    images.push(String((news as any).image_url))
  }

  return images.filter((img) => !!img && img.trim() !== "").slice(0, 1)
}

// 整合後端資料庫和 localStorage 的新聞數據
async function loadCombinedNewsData(): Promise<NewsItemType[]> {
  const allNews: NewsItemType[] = []

  try {
    // 1. 從後端資料庫載入已發布的新聞（補上 quantity/deadline/note）
    const { data: backendNews, error } = await supabase
      .from("near_expiry_posts")
      .select("id, created_at, location, content, image_url, status, source, quantity, deadline, note")
      .eq("status", "published")
      .order("created_at", { ascending: false })

    if (!error && backendNews) {
      const mappedBackendNews: NewsItemType[] = (backendNews as any[]).map((post: any) => ({
        id: `backend_${post.id}`,
        title: post.location ?? "未標地點",
        content: post.content ?? "",
        date: post.created_at,
        source: post.source ?? "系統公告",
        isPublished: true,
        createdAt: post.created_at,
        updatedAt: post.created_at,
        image_url: post.image_url,
        location: post.location,
        quantity: post.quantity,
        deadline: post.deadline,
        note: post.note,
      }))
      allNews.push(...mappedBackendNews)
    }
  } catch (error) {
    console.error("載入後端新聞數據失敗:", error)
  }

  // 2. 從 localStorage 載入本地新聞
  try {
    const storedNews = localStorage.getItem("news")
    if (storedNews) {
      const localNews = JSON.parse(storedNews) as NewsItemType[]
      const publishedLocalNews = localNews.filter((news) => news.isPublished)
      allNews.push(...publishedLocalNews)
    }
  } catch (error) {
    console.error("載入本地新聞數據失敗:", error)
  }

  // 3. 不再使用預設數據

  // 4. 去重 & 排序
  const uniqueNews = allNews.filter((news, index, self) =>
    index === self.findIndex((n) => n.id === news.id)
  )

  uniqueNews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return uniqueNews
}

export default function NewsPage() {
  const [newsItems, setNewsItems] = useState<NewsItemType[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedNews, setSelectedNews] = useState<NewsItemType | null>(null)
  const [newsDialogOpen, setNewsDialogOpen] = useState(false)

  // ▶︎ 彈窗圖片自適應/縮放狀態（只顯示單張）
  const [imgRatio, setImgRatio] = useState<number | null>(null) // w/h
  const [imgZoom, setImgZoom] = useState(false)

  // 載入整合的新聞數據
  const loadNews = async () => {
    try {
      setLoading(true)
      const combinedNews = await loadCombinedNewsData()
      setNewsItems(combinedNews)
    } catch (error) {
      console.error("載入新聞數據失敗:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 首次載入
    loadNews()

    // 即時更新
    const handleNewsUpdate = () => loadNews()
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "news") loadNews()
    }

    const channel = supabase
      .channel("near-expiry-posts-newspage")
      .on("postgres_changes", { event: "*", schema: "public", table: "near_expiry_posts" }, () => loadNews())
      .subscribe()

    window.addEventListener(NEWS_DATA_UPDATED, handleNewsUpdate)
    window.addEventListener("storage", handleStorageChange)

    return () => {
      window.removeEventListener(NEWS_DATA_UPDATED, handleNewsUpdate)
      window.removeEventListener("storage", handleStorageChange)
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 搜尋過濾
  const filteredNews = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return newsItems
    return newsItems.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.source.toLowerCase().includes(q)
    )
  }, [newsItems, searchQuery])

  // 日期格式
  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso)
      return d.toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" })
    } catch {
      return iso
    }
  }

  // 打開詳情
  const handleNewsClick = (news: NewsItemType) => {
    setSelectedNews(news)
    setNewsDialogOpen(true)
    setImgZoom(false)
    setImgRatio(null)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">即食消息</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          了解校園內最新的即期品優惠和活動
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="搜尋消息..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 w-full"
        />
      </div>

      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">載入中…</CardContent>
          </Card>
        ) : filteredNews.length > 0 ? (
          filteredNews.map((news) => (
            <Card
              key={news.id}
              className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
              onClick={() => handleNewsClick(news)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-green-600" />
                    <span className="text-green-800">{news.title || (news as any).location}</span>
                  </div>
                  {/* 照片縮圖（僅單張） */}
                  {getNewsImages(news).length > 0 && (
                    <NewsPhotoThumbnail images={getNewsImages(news)} className="flex-shrink-0" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* 物品詳細資訊 */}
                <div className="space-y-2 mb-4">
                  {news.source === "line" ? (
                    (() => {
                      const parsed = parseLineContent(news.content)
                      return (
                        <div className="text-sm text-gray-700">
                          <span className="font-medium text-gray-600">物品：</span>
                          <span className="ml-1">{parsed.item}</span>
                          {parsed.quantity && (
                            <span className="ml-2">
                              <span className="font-medium text-gray-600">數量：</span>
                              <span className="ml-1">{parsed.quantity}</span>
                            </span>
                          )}
                          {parsed.deadline && (
                            <span className="ml-2">
                              <span className="font-medium text-orange-600">期限：</span>
                              <span className="ml-1 text-orange-600">{parsed.deadline}</span>
                            </span>
                          )}
                          {parsed.note && parsed.note !== "無" && (
                            <span className="ml-2">
                              <span className="font-medium text-gray-500">備註：</span>
                              <span className="ml-1 text-gray-500">{parsed.note}</span>
                            </span>
                          )}
                        </div>
                      )
                    })()
                  ) : (
                    <div className="text-sm text-gray-700">
                      <span className="font-medium text-gray-600">物品：</span>
                      <span className="ml-1">{news.content}</span>
                      {(news as any).quantity && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          數量 {(news as any).quantity}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-gray-400 border-t pt-2">
                  <div className="flex items-center">
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    {formatDate(news.date)}
                  </div>
                  <div className="flex items-center">
                    <Building className="h-3.5 w-3.5 mr-1" />
                    {news.source}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <NewspaperIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="mb-2 text-center text-lg font-medium">沒有找到符合條件的即食消息</p>
              <p className="text-center text-muted-foreground">請嘗試其他搜尋條件或稍後再查看</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 新聞詳情懸浮視窗 */}
      <Dialog open={newsDialogOpen} onOpenChange={setNewsDialogOpen}>
        <DialogContent className="sm:max-w-[900px] lg:max-w-[1000px] max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-bold flex items-center">
              <MapPin className="h-5 w-5 text-green-600 mr-2" />
              {selectedNews?.title || (selectedNews as any)?.location}
            </DialogTitle>
            <DialogDescription className="flex items-center text-base text-gray-500 mt-3">
              <Calendar className="h-4 w-4 mr-2" />
              <span>{selectedNews ? formatDate(selectedNews.date) : ""} · {selectedNews?.source}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-6">
            {/* 物品資訊（照原樣） */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">物品資訊</h3>
              {selectedNews?.source === 'line' ? (
                (() => {
                  const parsed = parseLineContent(selectedNews.content)
                  return (
                    <div className="space-y-2">
                      <div className="flex items-start">
                        <span className="font-medium text-gray-600 min-w-[60px]">物品：</span>
                        <span className="text-gray-800">{parsed.item}</span>
                      </div>
                      {parsed.quantity && (
                        <div className="flex items-start">
                          <span className="font-medium text-gray-600 min-w-[60px]">數量：</span>
                          <span className="text-gray-800">{parsed.quantity}</span>
                        </div>
                      )}
                      {parsed.deadline && (
                        <div className="flex items-start">
                          <span className="font-medium text-gray-600 min-w-[60px]">期限：</span>
                          <span className="text-orange-600">{parsed.deadline}</span>
                        </div>
                      )}
                      {parsed.note && parsed.note !== '無' && (
                        <div className="flex items-start">
                          <span className="font-medium text-gray-600 min-w-[60px]">備註：</span>
                          <span className="text-gray-700">{parsed.note}</span>
                        </div>
                      )}
                    </div>
                  )
                })()
              ) : (
                <div className="space-y-2">
                  <div className="flex items-start">
                    <span className="font-medium text-gray-600 min-w-[60px]">物品：</span>
                    <span className="text-gray-800">{selectedNews?.content}</span>
                  </div>
                  {(selectedNews as any)?.quantity && (
                    <div className="flex items-center">
                      <span className="font-medium text-gray-600 min-w-[60px]">數量：</span>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {(selectedNews as any).quantity}
                      </span>
                    </div>
                  )}
                  {selectedNews?.deadline && (
                    <div className="flex items-start">
                      <Clock className="h-4 w-4 text-orange-500 mr-2 mt-0.5" />
                      <div>
                        <span className="font-medium text-gray-600">領取期限：</span>
                        <span className="text-orange-600 ml-1">{selectedNews.deadline}</span>
                      </div>
                    </div>
                  )}
                  {selectedNews?.note && (
                    <div className="flex items-start">
                      <span className="font-medium text-gray-600 min-w-[60px]">備註：</span>
                      <span className="text-gray-700">{selectedNews.note}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 相關照片（自適應比例 + 點擊放大/縮小；只顯示單張） */}
            {selectedNews && getNewsImages(selectedNews).length > 0 && (
              <div className="space-y-4">
                <div className="text-base font-semibold text-gray-700 border-b pb-2">相關照片</div>

                {(() => {
                  const imgSrc = getNewsImages(selectedNews)[0]
                  // 非 zoom 狀態：用 paddingTop 依原圖比例撐高容器；zoom 狀態則改為固定視窗尺寸可捲動
                  const paddingTop = imgRatio ? `${100 / imgRatio}%` : "100%"

                  return (
                    <div
                      className="relative mx-auto overflow-auto rounded-lg shadow-sm bg-black/5 cursor-zoom-in"
                      style={
                        imgZoom
                          ? { width: "90vw", height: "70vh", maxWidth: "100%" }
                          : { width: "100%", maxWidth: 640, paddingTop, height: "auto" }
                      }
                      onClick={() => setImgZoom((z) => !z)}
                      title={imgZoom ? "點擊縮小" : "點擊放大"}
                    >
                      {/* 非 zoom：用絕對定位填滿容器（保持比例）；zoom：改為原尺寸可滾動 */}
                      <img
                        src={imgSrc}
                        alt="相關照片"
                        onLoad={(e) => {
                          const el = e.currentTarget as HTMLImageElement
                          const w = el.naturalWidth || 1
                          const h = el.naturalHeight || 1
                          setImgRatio(w / h)
                        }}
                        className={imgZoom ? "select-none" : "absolute inset-0 select-none"}
                        style={
                          imgZoom
                            ? { width: "auto", height: "auto", maxWidth: "none", maxHeight: "none" }
                            : { width: "100%", height: "100%", objectFit: "contain" }
                        }
                      />
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
