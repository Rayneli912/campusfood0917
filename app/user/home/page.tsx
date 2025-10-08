"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, Filter, ChevronRight, MessageSquare, Calendar, Star, Clock, MapPin, ArrowUpDown, Building } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { initializeData } from "@/lib/data"
import { NEWS_DATA_UPDATED } from "@/lib/sync-service"
import type { NewsItem } from "@/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { stripStoreCode } from "@/lib/store-utils"
import { NewsPhotoThumbnail } from "@/components/news-photo-thumbnail"
import { supabase } from "@/lib/supabase/client"
import { parseLineContent } from "@/lib/content-parser"

interface Store {
  id: string
  name: string
  description: string
  location: string
  category: string
  rating: number
  openingHours?: string
  openTime?: string
  closeTime?: string
  coverImage?: string
  isNew?: boolean
}

// 輔助函數：獲取新聞的圖片數組
function getNewsImages(news: NewsItem): string[] {
  const images: string[] = []
  
  // 優先使用 images 數組
  if (news.images && news.images.length > 0) {
    images.push(...news.images)
  }
  
  // 如果沒有 images 數組但有 image_url，則使用 image_url
  if (images.length === 0 && news.image_url) {
    images.push(news.image_url)
  }
  
  return images.filter(img => img && img.trim() !== '')
}

// 整合後端資料庫和 localStorage 的新聞數據
async function loadCombinedNewsData(): Promise<NewsItem[]> {
  const allNews: NewsItem[] = []

  try {
    // 1. 從後端資料庫載入已發布的新聞
    const { data: backendNews, error } = await supabase
      .from("near_expiry_posts")
      .select("id, created_at, location, content, image_url, status, source")
      .eq("status", "published")
      .order("created_at", { ascending: false })

    if (!error && backendNews) {
      const mappedBackendNews: NewsItem[] = backendNews.map((post: any) => ({
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
      const localNews = JSON.parse(storedNews) as NewsItem[]
      const publishedLocalNews = localNews.filter((news) => news.isPublished)
      allNews.push(...publishedLocalNews)
    }
  } catch (error) {
    console.error("載入本地新聞數據失敗:", error)
  }

  // 3. 不再使用預設數據

  // 4. 去重（基於 ID）並按日期排序
  const uniqueNews = allNews.filter((news, index, self) => 
    index === self.findIndex((n) => n.id === news.id)
  )

  uniqueNews.sort((a, b) => {
    const dateA = new Date(a.date).getTime()
    const dateB = new Date(b.date).getTime()
    return dateB - dateA // 最新的在前
  })

  return uniqueNews
}

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [newsItems, setNewsItems] = useState<NewsItem[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [filteredStores, setFilteredStores] = useState<Store[]>([])
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null)
  const [newsDialogOpen, setNewsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc")
  const [newsSearchQuery, setNewsSearchQuery] = useState("")
  const [selectedSource, setSelectedSource] = useState<string>("全部來源")
  const [availableSources, setAvailableSources] = useState<string[]>([])

  const loadAvailableSources = useCallback(() => {
    const defaultSources = ["全部來源", "系統公告", "校園餐廳"]
    try {
      const storedStores = localStorage.getItem("stores")
      const registeredStores = localStorage.getItem("registeredStores")
      const storeSources = new Set<string>()

      if (storedStores) {
        const stores = JSON.parse(storedStores)
        stores.forEach((store: Store) => {
          if (store.name) storeSources.add(store.name)
        })
      }
      if (registeredStores) {
        const stores = JSON.parse(registeredStores)
        stores.forEach((store: any) => {
          if (store.storeName) storeSources.add(store.storeName)
        })
      }

      const allSources = [...defaultSources, ...Array.from(storeSources)]
      setAvailableSources(allSources)
      window.localStorage.setItem("storeNames", JSON.stringify(Array.from(storeSources)))
    } catch (error) {
      console.error("載入消息來源時發生錯誤:", error)
      setAvailableSources(defaultSources)
    }
  }, [])

  useEffect(() => {
    loadAvailableSources()
    window.addEventListener("storeUpdated", loadAvailableSources)
    window.addEventListener("storage", (e) => {
      if (e.key === "stores" || e.key === "registeredStores") {
        loadAvailableSources()
      }
    })
    return () => {
      window.removeEventListener("storeUpdated", loadAvailableSources)
    }
  }, [loadAvailableSources])

  const filteredNews = useMemo(() => {
    let filtered = newsItems
    if (selectedSource && selectedSource !== "全部來源") {
      if (selectedSource === "校園餐廳") {
        try {
          const storeNames = JSON.parse(localStorage.getItem("storeNames") || "[]")
          filtered = filtered.filter((news) => storeNames.includes(news.source) || news.source === "校園餐廳")
        } catch (error) {
          console.error("過濾店家消息時發生錯誤:", error)
        }
      } else {
        filtered = filtered.filter((news) => news.source === selectedSource)
      }
    }
    if (newsSearchQuery) {
      const query = newsSearchQuery.toLowerCase()
      filtered = filtered.filter(
        (news) =>
          news.title.toLowerCase().includes(query) ||
          news.content.toLowerCase().includes(query) ||
          news.source.toLowerCase().includes(query),
      )
    }
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB
    })
    return filtered
  }, [newsItems, selectedSource, newsSearchQuery, sortOrder])

  useEffect(() => {
    initializeData()

    // 載入整合的新聞數據
    const loadNews = async () => {
      try {
        const combinedNews = await loadCombinedNewsData()
        setNewsItems(combinedNews)
      } catch (error) {
        console.error("載入新聞數據失敗:", error)
      }
    }

    loadNews()

    // 監聽新聞數據更新
    const handleNewsUpdate = () => {
      loadNews()
    }

    // 監聽 localStorage 變化
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "news") {
        loadNews()
      }
    }

    // 監聽即時新增：有新貼文就重新抓一次
    const channel = supabase
      .channel("near-expiry-posts-homepage")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "near_expiry_posts" },
        () => {
          loadNews()
        }
      )
      .subscribe()

    window.addEventListener(NEWS_DATA_UPDATED, handleNewsUpdate)
    window.addEventListener("storage", handleStorageChange)

    // ✅ 不再使用預設店家資料，改為從資料庫載入

    const loadStores = async () => {
      setIsLoading(true)
      try {
        // ✅ 從資料庫載入已審核通過的店家
        const { data, error } = await supabase
          .from("stores")
          .select("*")
          .eq("is_disabled", false)
          .order("created_at", { ascending: false })

        if (!error && data) {
          const mappedStores: Store[] = data.map((store: any) => ({
            id: store.id,
            name: store.name,
            description: store.description || "",
            location: store.location || "",
            category: store.category || "餐廳",
            rating: store.rating || 4.5,
            openTime: "08:00",
            closeTime: "21:00",
            coverImage: store.cover_image,
          }))
          setStores(mappedStores)
          setFilteredStores(mappedStores)
        } else {
          setStores([])
          setFilteredStores([])
        }
      } catch (error) {
        console.error("Error loading stores:", error)
        setStores([])
        setFilteredStores([])
      } finally {
        setIsLoading(false)
      }
    }

    loadStores()

    const handleStoresUpdated = () => {
      loadStores()
    }
    const handleDataInitialized = () => {
      loadStores()
    }

    // 合併的 storage 監聽器
    const handleCombinedStorageChange = (e: StorageEvent) => {
      if (e.key === "news") {
        loadNews() // 使用新的整合載入函數
      }
      if (e.key === "stores" && e.newValue) {
        const parsedStores = JSON.parse(e.newValue)
        setStores(parsedStores)
        setFilteredStores(parsedStores)
      }
    }

    window.addEventListener("storage", handleCombinedStorageChange)
    window.addEventListener(NEWS_DATA_UPDATED, handleNewsUpdate)
    window.addEventListener("storeUpdated", handleStoresUpdated)
    window.addEventListener("storeInfoUpdated", handleStoresUpdated)
    window.addEventListener("dataInitialized", handleDataInitialized)

    return () => {
      window.removeEventListener("storage", handleCombinedStorageChange)
      window.removeEventListener(NEWS_DATA_UPDATED, handleNewsUpdate)
      window.removeEventListener("storeUpdated", handleStoresUpdated)
      window.removeEventListener("storeInfoUpdated", handleStoresUpdated)
      window.removeEventListener("dataInitialized", handleDataInitialized)
      supabase.removeChannel(channel)
    }
  }, [sortOrder, selectedSource])

  const handleNewsClick = (news: NewsItem) => {
    setSelectedNews(news)
    setNewsDialogOpen(true)
  }

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setFilteredStores(stores)
      return
    }
    const filtered = stores.filter(
      (store) =>
        store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.category.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    setFilteredStores(filtered)
  }

  useEffect(() => {
    handleSearch()
  }, [searchQuery, stores])

  const getStoreCoverImage = (store: Store) => {
    if (store.coverImage) return store.coverImage
    return `/placeholder.svg?height=200&width=400&text=${encodeURIComponent(stripStoreCode(store.name))}`
  }

  const loadNews = () => {
    try {
      const storedNews = localStorage.getItem("news")
      if (storedNews) {
        const allNews = JSON.parse(storedNews) as NewsItem[]
        let publishedNews = allNews.filter((news) => news.isPublished)
        if (selectedSource !== "全部來源") {
          publishedNews = publishedNews.filter((news) => news.source === selectedSource)
        }
        publishedNews.sort((a, b) => {
          const dateA = new Date(a.date).getTime()
          const dateB = new Date(b.date).getTime()
          return sortOrder === "desc" ? dateB - dateA : dateA - dateB
        })
        setNewsItems(publishedNews)
      }
    } catch (error) {
      console.error("載入即食消息時發生錯誤:", error)
    }
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">探索校園美食</h1>
        <p className="text-muted-foreground">發現校園內的即期品優惠，減少浪費，省錢又環保</p>
      </div>

      <div className="flex items-center space-x-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="搜尋店家或商品..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
        <Button onClick={handleSearch}>搜尋</Button>
      </div>

      {/* 最新即食消息區塊 */}
      <div className="bg-green-50 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <MessageSquare className="h-6 w-6 text-green-600 mr-3" />
            <h2 className="text-2xl font-bold text-green-800">最新即食消息</h2>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="搜尋即食消息..."
              value={newsSearchQuery}
              onChange={(e) => setNewsSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          <Select value={selectedSource} onValueChange={setSelectedSource}>
            <SelectTrigger className="w-[160px] h-10">
              <Building className="h-4 w-4 mr-2" />
              <SelectValue placeholder="選擇來源" />
            </SelectTrigger>
            <SelectContent>
              {availableSources.map((source) => (
                <SelectItem key={source} value={source}>
                  {source}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={(value: "desc" | "asc") => setSortOrder(value)}>
            <SelectTrigger className="w-[160px] h-10">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="排序方式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">最新到最舊</SelectItem>
              <SelectItem value="asc">最舊到最新</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filteredNews.slice(0, 6).map((news) => (
            <div
              key={news.id}
              className="bg-white rounded-md p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => handleNewsClick(news)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-3">
                  {/* 地點（標題） */}
                  <div className="flex items-center mb-2">
                    <MapPin className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                    <h3 className="font-medium text-green-800">{news.title || news.location}</h3>
                  </div>
                  
                  {/* 物品詳細資訊 */}
                  <div className="space-y-1 mb-2">
                    {/* 檢查是否為 LINE Bot 來源，使用解析器 */}
                    {news.source === 'line' ? (
                      (() => {
                        const parsed = parseLineContent(news.content)
                        return (
                          <div className="text-sm text-gray-700">
                            <span className="font-medium">物品：</span>{parsed.item}
                            {parsed.quantity && (
                              <span className="ml-2">
                                <span className="font-medium">數量：</span>{parsed.quantity}
                              </span>
                            )}
                            {parsed.deadline && (
                              <span className="ml-2 text-orange-600">
                                <span className="font-medium">期限：</span>{parsed.deadline}
                              </span>
                            )}
                            {parsed.note && parsed.note !== '無' && (
                              <span className="ml-2 text-gray-500">
                                <span className="font-medium">備註：</span>{parsed.note}
                              </span>
                            )}
                          </div>
                        )
                      })()
                    ) : (
                      // 非 LINE Bot 來源，使用原始顯示方式
                      <div className="text-sm text-gray-700">
                        <span className="font-medium">物品：</span>{news.content}
                        {news.quantity && (
                          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                            數量 {news.quantity}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* 發布時間和來源 */}
                  <div className="flex items-center text-xs text-gray-400 mt-2">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span>{new Date(news.date).toLocaleDateString("zh-TW")} · {news.source}</span>
                  </div>
                </div>
                {/* 照片縮圖 */}
                {getNewsImages(news).length > 0 && (
                  <NewsPhotoThumbnail 
                    images={getNewsImages(news)}
                    className="flex-shrink-0"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-right">
          <Link
            href="/user/news"
            className="text-sm text-green-600 hover:text-green-700 hover:underline flex items-center justify-end"
          >
            查看更多 <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-4">校園餐廳</h2>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <div className="h-48 bg-gray-200 animate-pulse"></div>
              <CardContent className="p-4">
                <div className="h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-4 bg-gray-100 rounded animate-pulse mb-4"></div>
                <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredStores.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">沒有找到符合條件的店家</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStores.map((store) => (
            <Card key={store.id} className="overflow-hidden">
              <div className="relative h-48 bg-gray-200">
                <Image
                  src={getStoreCoverImage(store) || "/placeholder.svg"}
                  alt={stripStoreCode(store.name)}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                {store.isNew && (
                  <div className="absolute top-3 left-3 z-10">
                    <Badge className="bg-green-500 hover:bg-green-600 text-white font-medium px-2.5 py-1">新店</Badge>
                  </div>
                )}
                <div className="absolute bottom-3 right-3">
                  <Badge variant="outline" className="bg-white/90 backdrop-blur-sm border-none text-gray-700">
                    {store.category}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold">{stripStoreCode(store.name)}</h3>
                    <p className="text-sm text-gray-500">{store.category}</p>
                  </div>
                  <div className="flex items-center bg-yellow-100 px-2 py-1 rounded">
                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 mr-1" />
                    <span className="text-yellow-600 font-medium">{store.rating}</span>
                  </div>
                </div>
                <p className="text-sm mt-2">{store.description}</p>
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    <p className="flex items-center">
                      <MapPin className="h-3.5 w-3.5 mr-1.5" />
                      {store.location}
                    </p>
                    <p className="flex items-center mt-1">
                      <Clock className="h-3.5 w-3.5 mr-1.5" />
                      營業至 {store.closeTime || (store.openingHours && store.openingHours.split(" - ")[1])}
                    </p>
                  </div>
                  <Link href={`/user/store/${store.id}`}>
                    <Button variant="outline" size="sm">
                      查看詳情
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 即食消息詳情對話框 */}
      <Dialog open={newsDialogOpen} onOpenChange={setNewsDialogOpen}>
        <DialogContent className="sm:max-w-[900px] lg:max-w-[1000px] max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-bold flex items-center">
              <MapPin className="h-5 w-5 text-green-600 mr-2" />
              {selectedNews?.title || selectedNews?.location}
            </DialogTitle>
            <DialogDescription className="flex items-center text-base text-gray-500 mt-3">
              <Calendar className="h-4 w-4 mr-2" />
              <span>{selectedNews ? new Date(selectedNews.date).toLocaleDateString("zh-TW") : ""} · {selectedNews?.source}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-6">
            {/* 物品資訊 */}
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
                  {selectedNews?.quantity && (
                    <div className="flex items-center">
                      <span className="font-medium text-gray-600 min-w-[60px]">數量：</span>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {selectedNews.quantity}
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
            
            {/* 完整照片顯示 */}
            {selectedNews && getNewsImages(selectedNews).length > 0 && (
              <div className="space-y-4">
                <div className="text-base font-semibold text-gray-700 border-b pb-2">相關照片</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getNewsImages(selectedNews).map((image, index) => (
                    <div key={index} className="relative w-full h-80 rounded-lg overflow-hidden shadow-sm">
                      <Image
                        src={image}
                        alt={`照片 ${index + 1}`}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-200"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 500px"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
