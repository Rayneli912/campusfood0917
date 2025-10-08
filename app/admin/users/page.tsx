"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Trash2, Users, MessageCircle, Bell, BellOff, RefreshCw, ToggleLeft, ToggleRight, Eye, EyeOff } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
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

type ViewMode = "platform" | "line"

interface LineUser {
  user_id: string
  display_name: string | null
  notify_new_post: boolean
  followed: boolean
  created_at: string
  updated_at: string
  last_name_update: string | null
}

interface PlatformUser {
  id: string
  username: string
  password: string
  name: string
  email: string | null
  phone: string
  department: string | null
  student_id: string | null
  is_disabled: boolean
  created_at: string
  updated_at: string
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>("platform")
  
  // 平台用戶
  const [users, setUsers] = useState<PlatformUser[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({})
  
  // LINE 用戶
  const [lineUsers, setLineUsers] = useState<LineUser[]>([])
  const [lineSearchQuery, setLineSearchQuery] = useState("")
  const [loadingLineUsers, setLoadingLineUsers] = useState(false)
  const [updatingNotify, setUpdatingNotify] = useState<string | null>(null)
  
  // 刪除確認對話框
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string; type: "platform" | "line" } | null>(null)
  const [deleting, setDeleting] = useState(false)
  
  // 批量操作
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [bulkAction, setBulkAction] = useState<"enable" | "disable">("enable")
  const [bulkProcessing, setBulkProcessing] = useState(false)
  
  // LINE 暱稱同步
  const [syncingNames, setSyncingNames] = useState(false)
  
  const [isMobile, setIsMobile] = useState(false)

  // 檢測螢幕尺寸
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkScreenSize()
    window.addEventListener("resize", checkScreenSize)

    return () => {
      window.removeEventListener("resize", checkScreenSize)
    }
  }, [])

  // 載入平台用戶列表
  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      const response = await fetch("/api/admin/users")
      const data = await response.json()
      
      if (data.success) {
        setUsers(data.users)
      } else {
        throw new Error(data.message)
        }
      } catch (error) {
        console.error("載入用戶列表時發生錯誤:", error)
        toast({
          title: "錯誤",
          description: "載入用戶列表時發生錯誤",
          variant: "destructive",
        })
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    if (viewMode === "platform") {
      loadUsers()
    }

    // 訂閱 Supabase 即時更新
    const channel = supabase
      .channel("users_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
        loadUsers()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [viewMode])

  // 載入 LINE 用戶列表
  const loadLineUsers = async () => {
    setLoadingLineUsers(true)
    try {
      const { data, error } = await supabase
        .from("line_user_settings")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      setLineUsers(data || [])
    } catch (error) {
      console.error("載入 LINE 用戶列表時發生錯誤:", error)
      toast({
        title: "錯誤",
        description: "載入 LINE 用戶列表時發生錯誤",
        variant: "destructive",
      })
    } finally {
      setLoadingLineUsers(false)
    }
  }

  useEffect(() => {
    if (viewMode === "line") {
      loadLineUsers()
    }

    // 訂閱 Supabase Realtime 更新
    const channel = supabase
      .channel("line_user_settings_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "line_user_settings" }, () => {
        loadLineUsers()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [viewMode])

  // 切換單個用戶的即食通知
  const toggleNotifyForUser = async (userId: string, currentStatus: boolean) => {
    setUpdatingNotify(userId)
    try {
      const { error } = await supabase
        .from("line_user_settings")
        .update({ notify_new_post: !currentStatus })
        .eq("user_id", userId)

      if (error) throw error

      // 重新載入數據
      await loadLineUsers()

      toast({
        title: "更新成功",
        description: `已${!currentStatus ? "開啟" : "關閉"}該用戶的即食通知`,
      })
    } catch (error) {
      console.error("更新即食通知狀態時發生錯誤:", error)
      toast({
        title: "錯誤",
        description: "更新即食通知狀態時發生錯誤",
        variant: "destructive",
      })
    } finally {
      setUpdatingNotify(null)
    }
  }

  // 批量開啟/關閉所有用戶的即食通知
  const bulkToggleNotify = async (enable: boolean) => {
    setBulkProcessing(true)
    try {
      const { error } = await supabase
        .from("line_user_settings")
        .update({ notify_new_post: enable })
        .eq("followed", true) // 只更新仍在追蹤的用戶

      if (error) throw error

      // 重新載入數據
      await loadLineUsers()

      toast({
        title: "批量更新成功",
        description: `已${enable ? "開啟" : "關閉"}所有追蹤用戶的即食通知`,
      })
    } catch (error) {
      console.error("批量更新即食通知狀態時發生錯誤:", error)
      toast({
        title: "錯誤",
        description: "批量更新即食通知狀態時發生錯誤",
        variant: "destructive",
      })
    } finally {
      setBulkProcessing(false)
      setShowBulkDialog(false)
    }
  }

  // 刪除用戶
  const handleDeleteUser = async () => {
    if (!userToDelete) return
    
    setDeleting(true)
    try {
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userToDelete.id }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "刪除成功",
          description: `已刪除用戶：${userToDelete.name}`,
        })
        await loadUsers()
      } else {
        toast({
          title: "刪除失敗",
          description: result.message || "無法刪除用戶",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("刪除用戶時發生錯誤:", error)
      toast({
        title: "錯誤",
        description: "刪除用戶時發生錯誤",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
      setUserToDelete(null)
    }
  }

  // 同步 LINE 用戶暱稱
  const handleSyncLineNames = async () => {
    setSyncingNames(true)
    try {
      const response = await fetch("/api/line/sync-names", {
        method: "POST",
      })
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "同步成功",
          description: `成功更新 ${data.updated} 個用戶，失敗 ${data.failed} 個`,
        })
        await loadLineUsers() // 重新載入列表
      } else {
        toast({
          title: "同步失敗",
          description: data.error || "無法同步用戶暱稱",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("同步暱稱時發生錯誤:", error)
      toast({
        title: "錯誤",
        description: "同步暱稱時發生錯誤",
        variant: "destructive",
      })
    } finally {
      setSyncingNames(false)
    }
  }

  // 篩選平台用戶
  const filteredUsers = users.filter((user) => {
    const searchLower = searchQuery.toLowerCase()
    return (
      user.username.toLowerCase().includes(searchLower) ||
      user.name.toLowerCase().includes(searchLower) ||
      (user.email && user.email.toLowerCase().includes(searchLower)) ||
      user.phone.toLowerCase().includes(searchLower)
    )
  })

  // 篩選 LINE 用戶
  const filteredLineUsers = lineUsers.filter((user) => {
    const searchLower = lineSearchQuery.toLowerCase()
    return (
      user.user_id.toLowerCase().includes(searchLower) ||
      (user.display_name && user.display_name.toLowerCase().includes(searchLower))
    )
  })

  // 統計數據
  const lineStats = {
    total: lineUsers.length,
    following: lineUsers.filter(u => u.followed).length,
    blocked: lineUsers.filter(u => !u.followed).length,
    notifyEnabled: lineUsers.filter(u => u.notify_new_post && u.followed).length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">用戶數據管理</h1>
        <p className="text-muted-foreground">管理平台用戶和 LINE 好友</p>
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="platform" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            平台註冊用戶
          </TabsTrigger>
          <TabsTrigger value="line" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            LINE 好友
          </TabsTrigger>
        </TabsList>

        {/* 平台註冊用戶 */}
        <TabsContent value="platform" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>平台註冊用戶</CardTitle>
              <CardDescription>管理所有在平台註冊的用戶帳號</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 搜索 */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
                    placeholder="搜索用戶名、姓名、電子郵件或手機..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
          />
        </div>
                <Button variant="outline" onClick={loadUsers} disabled={loadingUsers}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingUsers ? "animate-spin" : ""}`} />
                  重新整理
        </Button>
      </div>

              {/* 統計 */}
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>總用戶數: <strong className="text-foreground">{users.length}</strong></span>
                <span>搜尋結果: <strong className="text-foreground">{filteredUsers.length}</strong></span>
                <span>停用帳號: <strong className="text-foreground">{users.filter(u => u.is_disabled).length}</strong></span>
              </div>

              {/* 用戶列表 */}
              <div className="rounded-md border overflow-auto">
                <Table className="table-fixed" style={{ minWidth: "1600px" }}>
          <TableHeader>
            <TableRow>
                      <TableHead className="w-[150px]">用戶名</TableHead>
                      <TableHead className="w-[150px]">密碼</TableHead>
                      <TableHead className="w-[120px]">姓名</TableHead>
                      <TableHead className="w-[200px]">電子郵件</TableHead>
                      <TableHead className="w-[140px]">手機</TableHead>
                      <TableHead className="w-[160px]">系級</TableHead>
                      <TableHead className="w-[100px]">狀態</TableHead>
                      <TableHead className="w-[180px]">註冊時間</TableHead>
                      <TableHead className="w-[100px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
                    {loadingUsers ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-6">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                          <p className="text-muted-foreground">載入中...</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredUsers.length === 0 ? (
              <TableRow>
                        <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                          {searchQuery ? "找不到符合的用戶" : "尚無註冊用戶"}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                          <TableCell className="font-mono text-sm">{user.username}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs truncate max-w-[100px]">
                                {showPassword[user.id] ? user.password : "••••••••"}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setShowPassword(prev => ({ ...prev, [user.id]: !prev[user.id] }))}
                              >
                                {showPassword[user.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                            </div>
                  </TableCell>
                          <TableCell>{user.name}</TableCell>
                          <TableCell className="truncate">{user.email || "-"}</TableCell>
                          <TableCell>{user.phone}</TableCell>
                          <TableCell className="truncate">{user.department || "-"}</TableCell>
                  <TableCell>
                            <Badge variant={user.is_disabled ? "destructive" : "default"}>
                              {user.is_disabled ? "已停用" : "正常"}
                      </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(user.created_at).toLocaleString("zh-TW")}
                  </TableCell>
                  <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/admin/users/${user.id}`)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                查看詳情
                              </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  setUserToDelete({ id: user.id, name: user.name, type: "platform" })
                                  setShowDeleteDialog(true)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
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

        {/* LINE 好友 */}
        <TabsContent value="line" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>LINE 好友管理</CardTitle>
                  <CardDescription>已加入 LINE 官方帳號的用戶列表</CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setBulkAction("enable")
                    setShowBulkDialog(true)
                  }}
                  className="gap-2"
                >
                  <ToggleRight className="h-4 w-4" />
                  批量操作
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 統計卡片 */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>總好友數</CardDescription>
                    <CardTitle className="text-3xl">{lineStats.total}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>追蹤中</CardDescription>
                    <CardTitle className="text-3xl text-green-600">{lineStats.following}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>已封鎖</CardDescription>
                    <CardTitle className="text-3xl text-red-600">{lineStats.blocked}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>通知已開啟</CardDescription>
                    <CardTitle className="text-3xl text-blue-600">{lineStats.notifyEnabled}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* 搜索 */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="搜索用戶 ID 或名稱..."
                    value={lineSearchQuery}
                    onChange={(e) => setLineSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleSyncLineNames} 
                  disabled={syncingNames}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${syncingNames ? "animate-spin" : ""}`} />
                  同步暱稱
                </Button>
                <Button variant="outline" onClick={loadLineUsers} disabled={loadingLineUsers}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingLineUsers ? "animate-spin" : ""}`} />
                  重新整理
                </Button>
              </div>

              {/* LINE 用戶列表 */}
              <div className="rounded-md border overflow-auto">
                <Table className="table-fixed" style={{ minWidth: "1400px" }}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[280px]">用戶 ID</TableHead>
                      <TableHead className="w-[200px]">用戶名稱</TableHead>
                      <TableHead className="w-[180px]">加入時間</TableHead>
                      <TableHead className="w-[150px]">即食通知</TableHead>
                      <TableHead className="w-[120px]">好友狀態</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingLineUsers ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                          <p className="text-muted-foreground">載入中...</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredLineUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                          {lineSearchQuery ? "找不到符合的用戶" : "尚無 LINE 好友"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLineUsers.map((user) => (
                        <TableRow key={user.user_id}>
                          <TableCell className="font-mono text-xs">{user.user_id}</TableCell>
                          <TableCell>{user.display_name || "未設定"}</TableCell>
                          <TableCell className="text-sm">
                            {new Date(user.created_at).toLocaleString("zh-TW")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={user.notify_new_post}
                                onCheckedChange={() => toggleNotifyForUser(user.user_id, user.notify_new_post)}
                                disabled={updatingNotify === user.user_id || !user.followed}
                              />
                              <Badge variant={user.notify_new_post ? "default" : "secondary"} className="text-xs">
                                {user.notify_new_post ? "已開啟" : "已關閉"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.followed ? "default" : "destructive"}>
                              {user.followed ? "追蹤中" : "已封鎖"}
                            </Badge>
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
            <AlertDialogTitle>確認刪除用戶</AlertDialogTitle>
            <AlertDialogDescription>
              您確定要刪除用戶「{userToDelete?.name}」嗎？此操作將會刪除該用戶的所有相關數據，且無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "刪除中..." : "確認刪除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量操作對話框 */}
      <AlertDialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>批量操作即食通知</AlertDialogTitle>
            <AlertDialogDescription>
              選擇要執行的操作：
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <Button
              variant={bulkAction === "enable" ? "default" : "outline"}
              onClick={() => setBulkAction("enable")}
              className="flex-1"
            >
              <Bell className="h-4 w-4 mr-2" />
              開啟所有通知
            </Button>
            <Button
              variant={bulkAction === "disable" ? "default" : "outline"}
              onClick={() => setBulkAction("disable")}
              className="flex-1"
            >
              <BellOff className="h-4 w-4 mr-2" />
              關閉所有通知
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkProcessing}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkToggleNotify(bulkAction === "enable")}
              disabled={bulkProcessing}
            >
              {bulkProcessing ? "處理中..." : "確認執行"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}