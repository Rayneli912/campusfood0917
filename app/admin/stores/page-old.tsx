"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Trash2, RefreshCw, Eye, EyeOff } from "lucide-react"
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
  password_hash: string
  name: string
  description: string | null
  location: string
  phone: string | null
  email: string | null
  is_disabled: boolean
  created_at: string
}

export default function AdminStoresPage() {
  const router = useRouter()
  const [stores, setStores] = useState<Store[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({})
  
  // 刪除確認對話框
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [storeToDelete, setStoreToDelete] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  // 載入店家列表
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

  useEffect(() => {
    loadStores()

    // 訂閱 Supabase 即時更新
    const channel = supabase
      .channel("stores_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "stores" }, () => {
        loadStores()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
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

  // 篩選店家
  const filteredStores = stores.filter((store) => {
    const searchLower = searchQuery.toLowerCase()
    return (
      store.name.toLowerCase().includes(searchLower) ||
      store.username.toLowerCase().includes(searchLower) ||
      store.store_code.toLowerCase().includes(searchLower) ||
      (store.location && store.location.toLowerCase().includes(searchLower)) ||
      (store.phone && store.phone.toLowerCase().includes(searchLower))
    )
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">店家管理</h1>
        <p className="text-muted-foreground">管理所有已註冊並審核通過的店家</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>店家列表</CardTitle>
          <CardDescription>查看和管理所有店家帳號</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 搜索 */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索店家名稱、帳號、店家代碼、地址或電話..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={loadStores} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              重新整理
            </Button>
          </div>

          {/* 統計 */}
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>總店家數: <strong className="text-foreground">{stores.length}</strong></span>
            <span>搜尋結果: <strong className="text-foreground">{filteredStores.length}</strong></span>
            <span>停用店家: <strong className="text-foreground">{stores.filter(s => s.is_disabled).length}</strong></span>
          </div>

          {/* 店家列表 */}
          <div className="rounded-md border overflow-auto">
            <Table className="table-fixed" style={{ minWidth: "1800px" }}>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">店家代碼</TableHead>
                  <TableHead className="w-[150px]">帳號</TableHead>
                  <TableHead className="w-[150px]">密碼</TableHead>
                  <TableHead className="w-[200px]">店家名稱</TableHead>
                  <TableHead className="w-[280px]">簡介</TableHead>
                  <TableHead className="w-[200px]">地址</TableHead>
                  <TableHead className="w-[140px]">電話</TableHead>
                  <TableHead className="w-[200px]">電子郵件</TableHead>
                  <TableHead className="w-[100px]">狀態</TableHead>
                  <TableHead className="w-[180px]">註冊時間</TableHead>
                  <TableHead className="w-[100px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-6">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <p className="text-muted-foreground">載入中...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredStores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-6 text-muted-foreground">
                      {searchQuery ? "找不到符合的店家" : "尚無註冊店家"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStores.map((store) => (
                    <TableRow key={store.id}>
                      <TableCell className="font-mono text-sm">{store.store_code}</TableCell>
                      <TableCell className="font-mono text-sm">{store.username}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs truncate max-w-[100px]">
                            {showPassword[store.id] ? store.password_hash : "••••••••"}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setShowPassword(prev => ({ ...prev, [store.id]: !prev[store.id] }))}
                          >
                            {showPassword[store.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{store.name}</TableCell>
                      <TableCell className="truncate max-w-[280px]" title={store.description || ""}>
                        {store.description || "-"}
                      </TableCell>
                      <TableCell className="truncate">{store.location}</TableCell>
                      <TableCell>{store.phone || "-"}</TableCell>
                      <TableCell className="truncate">{store.email || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={store.is_disabled ? "destructive" : "default"}>
                          {store.is_disabled ? "已停用" : "營業中"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(store.created_at).toLocaleString("zh-TW")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setStoreToDelete({ id: store.id, name: store.name })
                            setShowDeleteDialog(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 刪除確認對話框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除店家</AlertDialogTitle>
            <AlertDialogDescription>
              您確定要刪除店家「{storeToDelete?.name}」嗎？此操作將會刪除該店家的所有相關數據（包含商品、訂單等），且無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStore}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "刪除中..." : "確認刪除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}