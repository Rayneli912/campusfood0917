"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Trash2, RefreshCw, Eye, EyeOff, Check, X } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog"

interface Store {
  id: string
  store_code: string
  username: string
  password: string // ✅ 明文密碼
  password_hash: string
  name: string
  description: string | null
  location: string
  phone: string | null
  email: string | null
  is_disabled: boolean
  created_at: string
}

interface PendingStore {
  id: number
  username: string
  password: string
  name: string
  description: string | null
  location: string
  phone: string | null
  email: string | null
  applied_at: string
}

export default function AdminStoresPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("registered")
  const [stores, setStores] = useState<Store[]>([])
  const [pendingStores, setPendingStores] = useState<PendingStore[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [pendingLoading, setPendingLoading] = useState(false)
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({})
  
  // 刪除確認對話框
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [storeToDelete, setStoreToDelete] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  // 審核操作
  const [approving, setApproving] = useState<number | null>(null)
  const [rejecting, setRejecting] = useState<number | null>(null)

  // 載入已註冊店家列表
  const loadStores = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/stores")
      const data = await response.json()
      
      if (data.success) {
        setStores(data.stores)
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      console.error("載入店家列表時發生錯誤:", error)
      toast({
        title: "錯誤",
        description: "載入店家列表時發生錯誤",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // 載入待審核店家列表
  const loadPendingStores = async () => {
    setPendingLoading(true)
    try {
      const response = await fetch("/api/admin/stores/pending")
      const data = await response.json()
      
      if (data.success) {
        setPendingStores(data.pendingStores)
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      console.error("載入待審核店家時發生錯誤:", error)
      toast({
        title: "錯誤",
        description: "載入待審核店家時發生錯誤",
        variant: "destructive",
      })
    } finally {
      setPendingLoading(false)
    }
  }

  useEffect(() => {
    loadStores()
    loadPendingStores()

    // 訂閱 Supabase 即時更新
    const storesChannel = supabase
      .channel("stores_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "stores" }, () => {
        loadStores()
      })
      .subscribe()

    const pendingChannel = supabase
      .channel("pending_stores_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "pending_stores" }, () => {
        loadPendingStores()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(storesChannel)
      supabase.removeChannel(pendingChannel)
    }
  }, [])

  // 刪除店家
  const handleDeleteStore = async () => {
    if (!storeToDelete) return
    
    setDeleting(true)
    try {
      const response = await fetch("/api/admin/stores", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId: storeToDelete.id }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "刪除成功",
          description: `已刪除店家：${storeToDelete.name}`,
        })
        await loadStores()
      } else {
        toast({
          title: "刪除失敗",
          description: result.message || "無法刪除店家",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("刪除店家時發生錯誤:", error)
      toast({
        title: "錯誤",
        description: "刪除店家時發生錯誤",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
      setStoreToDelete(null)
    }
  }

  // 通過審核
  const handleApproveStore = async (pendingStore: PendingStore) => {
    setApproving(pendingStore.id)
    try {
      const response = await fetch("/api/admin/stores/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingStoreId: pendingStore.id }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "審核通過",
          description: `店家「${pendingStore.name}」已通過審核`,
        })
        await Promise.all([loadStores(), loadPendingStores()])
      } else {
        toast({
          title: "審核失敗",
          description: result.message || "無法通過審核",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("審核店家時發生錯誤:", error)
      toast({
        title: "錯誤",
        description: "審核店家時發生錯誤",
        variant: "destructive",
      })
    } finally {
      setApproving(null)
    }
  }

  // 拒絕審核
  const handleRejectStore = async (pendingStore: PendingStore) => {
    setRejecting(pendingStore.id)
    try {
      const response = await fetch("/api/admin/stores/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingStoreId: pendingStore.id }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "已拒絕",
          description: `已拒絕店家「${pendingStore.name}」的申請`,
        })
        await loadPendingStores()
      } else {
        toast({
          title: "操作失敗",
          description: result.message || "無法拒絕申請",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("拒絕店家時發生錯誤:", error)
      toast({
        title: "錯誤",
        description: "拒絕店家時發生錯誤",
        variant: "destructive",
      })
    } finally {
      setRejecting(null)
    }
  }

  // 篩選店家
  const filteredStores = stores.filter((store) => {
    const searchLower = searchQuery.toLowerCase()
    return (
      store.name.toLowerCase().includes(searchLower) ||
      store.username.toLowerCase().includes(searchLower) ||
      store.location.toLowerCase().includes(searchLower)
    )
  })

  // 篩選待審核店家
  const filteredPendingStores = pendingStores.filter((store) => {
    const searchLower = searchQuery.toLowerCase()
    return (
      store.name.toLowerCase().includes(searchLower) ||
      store.username.toLowerCase().includes(searchLower) ||
      (store.location && store.location.toLowerCase().includes(searchLower))
    )
  })

  const togglePasswordVisibility = (id: string) => {
    setShowPassword(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleOpenDeleteDialog = (id: string, name: string) => {
    setStoreToDelete({ id, name })
    setShowDeleteDialog(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">店家數據管理</h1>
          <p className="text-muted-foreground mt-1">管理已註冊店家和審核新店家申請</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full md:w-[400px] grid-cols-2">
          <TabsTrigger value="registered">
            已註冊店家 ({stores.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            待審核店家 ({pendingStores.length})
          </TabsTrigger>
        </TabsList>

        {/* 已註冊店家標籤 */}
        <TabsContent value="registered" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>已註冊店家</CardTitle>
              <CardDescription>查看和管理已通過審核的店家</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="搜尋店家名稱、帳號或地點..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={loadStores} variant="outline" disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  重新整理
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>店家名稱</TableHead>
                      <TableHead>帳號</TableHead>
                      <TableHead>密碼</TableHead>
                      <TableHead>地點</TableHead>
                      <TableHead>電話</TableHead>
                      <TableHead>狀態</TableHead>
                      <TableHead>註冊時間</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                          載入中...
                        </TableCell>
                      </TableRow>
                    ) : filteredStores.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                          沒有找到符合條件的店家
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStores.map((store) => (
                        <TableRow key={store.id}>
                          <TableCell className="font-medium">{store.name}</TableCell>
                          <TableCell>{store.username}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {showPassword[store.id] ? (
                                <span className="font-mono text-sm">{store.password || store.password_hash}</span>
                              ) : (
                                <span className="font-mono text-sm">********</span>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => togglePasswordVisibility(store.id)}
                                className="h-6 w-6"
                              >
                                {showPassword[store.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>{store.location}</TableCell>
                          <TableCell>{store.phone || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={store.is_disabled ? "destructive" : "default"}>
                              {store.is_disabled ? "已停用" : "使用中"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(store.created_at).toLocaleDateString("zh-TW")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/admin/stores/${store.id}`)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                查看詳情
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleOpenDeleteDialog(store.id, store.name)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                刪除
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 待審核店家標籤 */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>待審核店家</CardTitle>
              <CardDescription>審核新店家的註冊申請</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="搜尋店家名稱、帳號或地點..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={loadPendingStores} variant="outline" disabled={pendingLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${pendingLoading ? "animate-spin" : ""}`} />
                  重新整理
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>店家名稱</TableHead>
                      <TableHead>帳號</TableHead>
                      <TableHead>地點</TableHead>
                      <TableHead>電話</TableHead>
                      <TableHead>電子郵件</TableHead>
                      <TableHead>申請時間</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                          載入中...
                        </TableCell>
                      </TableRow>
                    ) : filteredPendingStores.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                          沒有待審核的店家申請
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPendingStores.map((store) => (
                        <TableRow key={store.id}>
                          <TableCell className="font-medium">{store.name}</TableCell>
                          <TableCell>{store.username}</TableCell>
                          <TableCell>{store.location}</TableCell>
                          <TableCell>{store.phone || "-"}</TableCell>
                          <TableCell>{store.email || "-"}</TableCell>
                          <TableCell className="text-sm">
                            {new Date(store.applied_at).toLocaleDateString("zh-TW")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApproveStore(store)}
                                disabled={approving === store.id || rejecting === store.id}
                              >
                                {approving === store.id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <Check className="h-4 w-4 mr-2" />
                                )}
                                通過
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRejectStore(store)}
                                disabled={approving === store.id || rejecting === store.id}
                              >
                                {rejecting === store.id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <X className="h-4 w-4 mr-2" />
                                )}
                                拒絕
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 刪除確認對話框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              您確定要刪除店家「{storeToDelete?.name}」嗎？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStore} disabled={deleting}>
              {deleting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
