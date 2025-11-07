"use client"

import type React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Pencil, Trash, Building, Calendar, Eye, MapPin, Clock } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { supabase } from "@/lib/supabase/client"
import { NEWS_DATA_UPDATED } from "@/lib/sync-service"
import type { NewsItem } from "@/types"
import Image from "next/image"

/** 將 quantity 安全轉為字串或 null（支持任意文本） */
function toQuantityString(value: unknown): string | null {
  if (value === undefined || value === null) return null
  const s = String(value).trim()
  return s === "" ? null : s
}

/** 將空字串標準化為 null（給 deadline / note 等） */
function emptyToNull<T extends string | null | undefined>(v: T): string | null {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  return s === "" ? null : s
}

/** 顯示到秒的台灣時間（YYYY/MM/DD HH:mm:ss） */
function formatDateTimeTW(ts: string | Date) {
  const d = ts instanceof Date ? ts : new Date(ts)
  return d.toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

/** 整合後端資料庫和 localStorage 的新聞數據（避快取 + 更穩健） */
async function loadCombinedNewsData(): Promise<NewsItem[]> {
  const allNews: NewsItem[] = []

  // 並行載入後端資料和本地資料。加入 ts 參數避快取，並使用 no-store。
  const backendReq = fetch(`/api/news?includeAll=true&ts=${Date.now()}`, {
    cache: "no-store",
  })
    .then(async (res) => {
      if (!res.ok) return null
      const json = await res.json().catch(() => null)
      // 後端格式為 { data: [...] }
      if (json && Array.isArray(json.data)) return json.data as any[]
      return null
    })
    .catch((e) => {
      console.error("載入後端新聞數據失敗(fetch):", e)
      return null
    })

  const localReq = Promise.resolve().then(() => {
    try {
      const storedNews = localStorage.getItem("news")
      return storedNews ? (JSON.parse(storedNews) as NewsItem[]) : []
    } catch (error) {
      console.error("載入本地新聞數據失敗:", error)
      return [] as NewsItem[]
    }
  })

  const [backendData, localData] = await Promise.allSettled([backendReq, localReq])

  // 後端 → NewsItem[]
  if (backendData.status === "fulfilled" && Array.isArray(backendData.value)) {
    const mappedBackendNews: NewsItem[] = backendData.value.map((post: any) => ({
      id: `backend_${post.id}`,
      title: post.location ?? "未標地點",
      content: post.content ?? "",
      // ★ 優先使用發佈時間，沒有就退回 created_at / updated_at
      date: post.published_at ?? post.created_at ?? post.updated_at ?? new Date().toISOString(),
      source: post.source ?? "系統公告",
      isPublished: post.status === "published",
      createdAt: post.created_at ?? undefined,
      updatedAt: post.updated_at ?? undefined,
      image_url: post.image_url ?? null,
      location: post.location ?? null,
      quantity: post.quantity ?? null,
      deadline: post.deadline ?? null,
      note: post.note ?? null,
      post_token_hash: post.post_token_hash ?? null,
      token_expires_at: post.token_expires_at ?? null,
      status: post.status ?? "draft", // ★ 保留原始狀態
    }))
    allNews.push(...mappedBackendNews)
  } else if (backendData.status === "rejected") {
    console.error("載入後端新聞數據失敗:", backendData.reason)
  }

  // 本地 → NewsItem[]
  if (localData.status === "fulfilled" && Array.isArray(localData.value)) {
    allNews.push(...localData.value)
  } else if (localData.status === "rejected") {
    console.error("載入本地新聞數據失敗:", localData.reason)
  }

  // 不再使用預設數據

  // 去重 + 依日期排序
  const uniqueNews = allNews.filter(
    (news, index, self) => index === self.findIndex((n) => n.id === news.id),
  )
  uniqueNews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return uniqueNews
}

export default function NewsPage() {
  const { toast } = useToast()
  const [newsItems, setNewsItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSource, setSelectedSource] = useState<string>("全部來源")
  const [availableSources, setAvailableSources] = useState<string[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [currentNews, setCurrentNews] = useState<NewsItem | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    source: "系統公告",
    isPublished: true,
    image_url: "",
    quantity: "",
    deadline: "",
    note: "",
  })

  // 載入整合的新聞數據
  const loadNews = async () => {
    try {
      setLoading(true)
      const combinedNews = await loadCombinedNewsData()
      setNewsItems(combinedNews)
    } catch (error) {
      console.error("載入新聞數據失敗:", error)
      toast({
        title: "錯誤",
        description: "載入新聞數據時發生錯誤",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNews()

    // 監聽數據更新事件
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
      .channel("near-expiry-posts-admin")
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

    return () => {
      window.removeEventListener(NEWS_DATA_UPDATED, handleNewsUpdate)
      window.removeEventListener("storage", handleStorageChange)
      supabase.removeChannel(channel)
    }
  }, [toast])

  // 載入所有可用的消息來源（包含預設來源和店家）
  const loadAvailableSources = useCallback(() => {
    const defaultSources = ["全部來源", "系統公告", "校園餐廳"]
    try {
      // 從 localStorage 獲取所有店家
      const storedStores = localStorage.getItem("stores")
      const registeredStores = localStorage.getItem("registeredStores")
      
      const storeSources = new Set<string>()
      
      // 添加預設店家
      if (storedStores) {
        const stores = JSON.parse(storedStores)
        stores.forEach((store: any) => {
          if (store.name) storeSources.add(store.name)
        })
      }
      
      // 添加註冊的店家
      if (registeredStores) {
        const stores = JSON.parse(registeredStores)
        stores.forEach((store: any) => {
          if (store.storeName) storeSources.add(store.storeName)
        })
      }

      // 合併所有來源，包括預設來源和店家名稱
      const allSources = [...defaultSources, ...Array.from(storeSources)]
      setAvailableSources(allSources)

      // 保存店家名稱列表，用於"校園餐廳"選項的過濾
      window.localStorage.setItem('storeNames', JSON.stringify(Array.from(storeSources)))
    } catch (error) {
      console.error("載入消息來源時發生錯誤:", error)
      setAvailableSources(defaultSources)
    }
  }, [])

  useEffect(() => {
    loadAvailableSources()
    
    // 監聽店家更新事件
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

  // CRUD 操作函數
  const createNews = async (newsData: Partial<NewsItem>) => {
    try {
      console.log("正在創建新聞:", newsData)
      
      // 使用 API 端點創建新聞
      const response = await fetch("/api/news", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newsData.title,
          content: newsData.content,
          source: newsData.source,
          isPublished: newsData.isPublished,
          image_url: newsData.image_url,
          quantity: toQuantityString(newsData.quantity as unknown),
          deadline: emptyToNull(newsData.deadline as any),
          note: emptyToNull(newsData.note as any),
        }),
      }).catch((fetchError) => {
        console.error("創建新聞 Fetch 請求失敗:", fetchError)
        throw new Error(`網絡請求失敗: ${fetchError.message}`)
      })

      let result
      try {
        result = await response.json()
      } catch (jsonError) {
        console.error("解析創建響應 JSON 失敗:", jsonError)
        throw new Error("伺服器響應格式錯誤")
      }
      
      console.log("創建結果:", { status: response.status, result })

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: 創建新聞失敗`)
      }

      toast({
        title: "成功",
        description: "新聞已成功創建",
      })

      // 廣播更新事件
      window.dispatchEvent(new CustomEvent(NEWS_DATA_UPDATED))
      
      loadNews() // 重新載入數據
      return true
    } catch (error) {
      console.error("創建新聞失敗:", error)
      toast({
        title: "錯誤",
        description: error instanceof Error ? error.message : "創建新聞時發生錯誤",
        variant: "destructive",
      })
      return false
    }
  }

  const updateNews = async (id: string, newsData: Partial<NewsItem>) => {
    try {
      const now = new Date().toISOString()

      if (id.startsWith("backend_")) {
        // 後端新聞：使用 API 端點更新
        const backendId = id.replace("backend_", "")
        console.log("正在更新後端新聞:", { backendId, newsData })
        
        const response = await fetch(`/api/news/${backendId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: newsData.title,
            content: newsData.content,
            source: newsData.source,
            isPublished: newsData.isPublished,
            image_url: newsData.image_url,
            quantity: toQuantityString(newsData.quantity as unknown),
            deadline: emptyToNull(newsData.deadline as any),
            note: emptyToNull(newsData.note as any),
          }),
        }).catch((fetchError) => {
          console.error("更新新聞 Fetch 請求失敗:", fetchError)
          throw new Error(`網絡請求失敗: ${fetchError.message}`)
        })

        let result
        try {
          result = await response.json()
        } catch (jsonError) {
          console.error("解析更新響應 JSON 失敗:", jsonError)
          throw new Error("伺服器響應格式錯誤")
        }
        
        console.log("更新結果:", { status: response.status, result })

        if (!response.ok) {
          throw new Error(result.error || `HTTP ${response.status}: 更新新聞失敗`)
        }
      } else {
        // 本地新聞：更新到 localStorage
        console.log("正在更新本地新聞:", { id, newsData })
        const storedNews = localStorage.getItem("news")
        if (storedNews) {
          const localNews = JSON.parse(storedNews) as NewsItem[]
          const index = localNews.findIndex(news => news.id === id)
          if (index !== -1) {
            localNews[index] = {
              ...localNews[index],
              ...newsData,
              quantity: toQuantity(newsData.quantity as unknown) ?? undefined,
              deadline: emptyToNull(newsData.deadline as any) ?? undefined,
              note: emptyToNull(newsData.note as any) ?? undefined,
              updatedAt: now,
            }
            localStorage.setItem("news", JSON.stringify(localNews))
            console.log("本地新聞更新完成")
          } else {
            console.log("找不到要更新的本地新聞:", id)
          }
        }
      }

      toast({
        title: "成功",
        description: "新聞已成功更新",
      })

      // 廣播更新事件
      window.dispatchEvent(new CustomEvent(NEWS_DATA_UPDATED))
      
      loadNews() // 重新載入數據
      return true
    } catch (error) {
      console.error("更新新聞失敗:", error)
      toast({
        title: "錯誤",
        description: error instanceof Error ? error.message : "更新新聞時發生錯誤",
        variant: "destructive",
      })
      return false
    }
  }

  const deleteNews = async (id: string) => {
    try {
      if (id.startsWith("backend_")) {
        // 後端新聞：使用 API 端點刪除
        const backendId = id.replace("backend_", "")
        console.log("正在刪除後端新聞:", { backendId, originalId: id })
        
        const apiUrl = `/api/news/${backendId}`
        console.log("API URL:", apiUrl)
        
        const response = await fetch(apiUrl, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }).catch((fetchError) => {
          console.error("Fetch 請求失敗:", fetchError)
          throw new Error(`網絡請求失敗: ${fetchError.message}`)
        })

        console.log("HTTP 響應狀態:", response.status)
        
        let result
        try {
          result = await response.json()
        } catch (jsonError) {
          console.error("解析響應 JSON 失敗:", jsonError)
          throw new Error("伺服器響應格式錯誤")
        }
        
        console.log("刪除結果:", { status: response.status, result })

        if (!response.ok) {
          throw new Error(result.error || `HTTP ${response.status}: 刪除新聞失敗`)
        }
      } else {
        // 本地新聞：從 localStorage 刪除
        console.log("正在刪除本地新聞:", { id })
        const storedNews = localStorage.getItem("news")
        if (storedNews) {
          const localNews = JSON.parse(storedNews) as NewsItem[]
          const originalLength = localNews.length
          const filteredNews = localNews.filter(news => news.id !== id)
          localStorage.setItem("news", JSON.stringify(filteredNews))
          console.log("本地新聞刪除完成:", { 
            originalLength, 
            newLength: filteredNews.length,
            deleted: originalLength - filteredNews.length 
          })
        }
      }

      toast({
        title: "成功",
        description: "新聞已成功刪除",
      })

      // 廣播更新事件
      window.dispatchEvent(new CustomEvent(NEWS_DATA_UPDATED))
      
      loadNews() // 重新載入數據
      return true
    } catch (error) {
      console.error("刪除新聞失敗:", error)
      toast({
        title: "錯誤",
        description: error instanceof Error ? error.message : "刪除新聞時發生錯誤",
        variant: "destructive",
      })
      return false
    }
  }

  // 過濾即食消息
  const filteredNews = useMemo(() => {
    let filtered = newsItems

    // 根據來源篩選
    if (selectedSource && selectedSource !== "全部來源") {
      if (selectedSource === "校園餐廳") {
        // 當選擇"校園餐廳"時，顯示所有店家的消息和標記為"校園餐廳"的消息
        try {
          const storeNames = JSON.parse(localStorage.getItem('storeNames') || '[]')
          filtered = filtered.filter(news => 
            storeNames.includes(news.source) || news.source === "校園餐廳"
          )
        } catch (error) {
          console.error("過濾店家消息時發生錯誤:", error)
        }
      } else {
        filtered = filtered.filter(news => news.source === selectedSource)
      }
    }

    // 根據搜尋關鍵字篩選
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(news =>
        news.title.toLowerCase().includes(query) ||
        news.content.toLowerCase().includes(query) ||
        news.source.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [newsItems, selectedSource, searchQuery])

  // 處理表單變更
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // 處理發布狀態變更
  const handleStatusChange = (value: string) => {
    setFormData((prev) => ({ ...prev, isPublished: value === "published" }))
  }

  // 處理來源變更
  const handleSourceChange = (value: string) => {
    setFormData((prev) => ({ ...prev, source: value }))
  }

  // 處理新增/編輯消息
  const handleSaveNews = async () => {
    if (!formData.title || !formData.content || !formData.source) {
      toast({
        title: "請填寫所有必填欄位",
        variant: "destructive",
      })
      return
    }

    try {
      let success = false

      const payload = {
        title: formData.title,
        content: formData.content,
        source: formData.source,
        isPublished: formData.isPublished,
        image_url: formData.image_url,
        quantity: toQuantityString(formData.quantity),
        deadline: emptyToNull(formData.deadline),
        note: emptyToNull(formData.note),
      } as Partial<NewsItem>

      if (isEditing && currentNews) {
        // 編輯現有消息
        success = await updateNews(currentNews.id, payload)
      } else {
        // 新增消息
        success = await createNews(payload)
      }

      if (success) {
        setDialogOpen(false)
        resetForm()
      }
    } catch (error) {
      console.error("保存消息時發生錯誤:", error)
    }
  }

  // 處理刪除消息
  const handleDeleteNews = async () => {
    if (!currentNews) return

    try {
      const success = await deleteNews(currentNews.id)
      if (success) {
        setDeleteDialogOpen(false)
        setCurrentNews(null)
      }
    } catch (error) {
      console.error("刪除消息時發生錯誤:", error)
    }
  }

  // 開啟新增消息對話框
  const handleAddNews = () => {
    setCurrentNews(null)
    setIsEditing(false)
    resetForm()
    setDialogOpen(true)
  }

  // 開啟編輯消息對話框
  const handleEditNews = (news: NewsItem) => {
    setCurrentNews(news)
    setIsEditing(true)
    setFormData({
      title: news.title,
      content: news.content,
      source: news.source,
      isPublished: news.isPublished,
      image_url: news.image_url || "",
      quantity: news.quantity ? news.quantity.toString() : "",
      deadline: news.deadline || "",
      note: news.note || "",
    })
    setDialogOpen(true)
  }

  // 開啟刪除消息對話框
  const handleOpenDeleteDialog = (news: NewsItem) => {
    setCurrentNews(news)
    setDeleteDialogOpen(true)
  }

  // 重置表單
  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      source: "系統公告",
      isPublished: true,
      image_url: "",
      quantity: "",
      deadline: "",
      note: "",
    })
    setCurrentNews(null)
    setIsEditing(false)
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">即食消息管理</h1>
        <p className="text-muted-foreground">管理平台上的即食消息，包括發布、編輯和刪除</p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="搜尋消息..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={selectedSource} onValueChange={setSelectedSource}>
            <SelectTrigger className="w-[140px]">
              <Building className="h-4 w-4 mr-2" />
              <SelectValue placeholder="選擇來源" />
            </SelectTrigger>
            <SelectContent>
              {availableSources.map(source => (
                <SelectItem key={source} value={source}>{source}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleAddNews}>
          <Plus className="mr-2 h-4 w-4" /> 新增消息
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table className="table-fixed" style={{ minWidth: "1400px" }}>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">地點</TableHead>
              <TableHead className="w-[280px]">物品/數量</TableHead>
              <TableHead className="w-[220px]">期限/備註</TableHead>
              <TableHead className="w-[140px]">來源</TableHead>
              <TableHead className="w-[180px]">日期</TableHead>
              <TableHead className="w-[100px]">狀態</TableHead>
              <TableHead className="w-[80px]">照片</TableHead>
              <TableHead className="w-[100px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                  載入中...
                </TableCell>
              </TableRow>
            ) : filteredNews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                  沒有找到符合條件的即食消息
                </TableCell>
              </TableRow>
            ) : (
              filteredNews.map((news) => (
                <TableRow key={news.id}>
                  {/* 地點 */}
                  <TableCell className="w-[200px]">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <div className="truncate" title={news.title}>
                        {news.title}
                      </div>
                    </div>
                  </TableCell>
                  
                  {/* 物品/數量 */}
                  <TableCell className="w-[280px]">
                    <div className="space-y-1">
                      <div className="line-clamp-2 text-sm" title={news.content}>
                        {news.content}
                      </div>
                      {news.quantity && (
                        <div>
                          <Badge variant="secondary" className="text-xs">
                            數量 {news.quantity}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  {/* 期限/備註 */}
                  <TableCell className="w-[220px]">
                    <div className="space-y-1">
                      {news.deadline && (
                        <div className="text-sm text-orange-600 flex items-center gap-1">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate" title={news.deadline}>{news.deadline}</span>
                        </div>
                      )}
                      {news.note && (
                        <div className="text-xs text-muted-foreground line-clamp-2" title={news.note}>
                          備註：{news.note}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  {/* 來源 */}
                  <TableCell className="w-[140px]">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{news.source}</span>
                    </div>
                  </TableCell>
                  
                  {/* 日期（★顯示到秒） */}
                  <TableCell className="w-[180px]">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{formatDateTimeTW(news.date).split(' ')[0]}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTimeTW(news.date).split(' ')[1]}
                      </div>
                    </div>
                  </TableCell>
                  
                  {/* 狀態 */}
                  <TableCell className="w-[100px]">
                    <Badge 
                      variant={
                        news.status === "published" ? "default" : 
                        news.status === "archived" ? "secondary" : 
                        "outline"
                      } 
                      className={`w-fit ${
                        news.status === "archived" ? "bg-gray-500 text-white" : ""
                      }`}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      {news.status === "published" ? "已發布" : 
                       news.status === "archived" ? "已歸檔" : 
                       "草稿"}
                    </Badge>
                  </TableCell>
                  <TableCell className="w-[80px]">
                    {news.image_url && (
                      <div className="relative rounded overflow-hidden w-[60px] h-[60px]">
                        <Image
                          src={news.image_url}
                          alt="消息圖片"
                          width={60}
                          height={60}
                          className="object-cover rounded"
                          sizes="60px"
                        />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="w-[100px] text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditNews(news)} title="編輯">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteDialog(news)} title="刪除">
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 新增/編輯消息對話框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? "編輯即食消息" : "新增即食消息"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">標題</Label>
              <Input
                id="title"
                name="title"
                placeholder="請輸入消息標題"
                value={formData.title}
                onChange={handleFormChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">內容</Label>
              <Textarea
                id="content"
                name="content"
                placeholder="請輸入消息內容"
                rows={5}
                value={formData.content}
                onChange={handleFormChange}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="source">來源</Label>
                <Select value={formData.source} onValueChange={handleSourceChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇來源" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSources.map(source => (
                      <SelectItem key={source} value={source}>{source}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">狀態</Label>
                <Select value={formData.isPublished ? "published" : "draft"} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇狀態" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">已發布</SelectItem>
                    <SelectItem value="draft">未發布</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quantity">數量（選填）</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  max="999"
                  placeholder="1-999"
                  value={formData.quantity}
                  onChange={handleFormChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="deadline">領取期限（選填）</Label>
                <Input
                  id="deadline"
                  name="deadline"
                  placeholder="例：今天下午 5 點前"
                  value={formData.deadline}
                  onChange={handleFormChange}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="note">備註（選填）</Label>
              <Textarea
                id="note"
                name="note"
                placeholder="請輸入備註資訊..."
                value={formData.note}
                onChange={handleFormChange}
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="image_url">圖片 URL（選填）</Label>
              <Input
                id="image_url"
                name="image_url"
                placeholder="請輸入圖片 URL"
                value={formData.image_url}
                onChange={handleFormChange}
              />
              {formData.image_url && (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border">
                  <Image
                    src={formData.image_url}
                    alt="預覽圖片"
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveNews}>{isEditing ? "更新" : "發布"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除消息確認對話框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              您確定要刪除這條即食消息嗎？此操作無法撤銷。
              <br />
              <strong>{currentNews?.title}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNews} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
