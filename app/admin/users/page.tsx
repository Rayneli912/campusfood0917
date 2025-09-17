"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, MoreHorizontal, Plus } from "lucide-react"
import { UserDetailDialog } from "@/components/user-detail-dialog"
import { UserRegisterDialog } from "@/components/user-register-dialog"

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false)
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

  // 載入用戶列表
  useEffect(() => {
    const loadUsers = () => {
      try {
        const storedUsers = localStorage.getItem("registeredUsers")
        if (storedUsers) {
          const userList = JSON.parse(storedUsers)
          setUsers(userList)
        }
      } catch (error) {
        console.error("載入用戶列表時發生錯誤:", error)
        toast({
          title: "錯誤",
          description: "載入用戶列表時發生錯誤",
          variant: "destructive",
        })
      }
    }

    loadUsers()

    // 監聽存儲變化
    const handleStorageChange = () => {
      loadUsers()
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  // 篩選用戶
  const filteredUsers = users.filter((user) => {
    const searchLower = searchQuery.toLowerCase()
    return (
      user.username.toLowerCase().includes(searchLower) ||
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    )
  })

  // 查看用戶詳情
  const handleViewUser = (userId: string) => {
    setSelectedUser(userId)
    setIsDetailDialogOpen(true)
  }

  // 處理新增用戶成功
  const handleRegisterSuccess = (newUser: any) => {
    setUsers((prev) => [newUser, ...prev])
    toast({
      title: "新增成功",
      description: "新用戶已成功創建",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight">用戶數據管理</h1>
        <p className="text-muted-foreground">管理平台上的所有用戶帳號與資訊</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="搜尋用戶名稱、帳號、電子郵件..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button onClick={() => setIsRegisterDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新增用戶
        </Button>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用戶名稱</TableHead>
              <TableHead>帳號</TableHead>
              {!isMobile && <TableHead>電子郵件</TableHead>}
              {!isMobile && <TableHead>電話</TableHead>}
              {!isMobile && <TableHead>系所</TableHead>}
              <TableHead>加入時間</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isMobile ? 5 : 8} className="text-center py-6 text-muted-foreground">
                  沒有找到符合條件的用戶
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  {!isMobile && <TableCell>{user.email}</TableCell>}
                  {!isMobile && <TableCell>{user.phone || "未設定"}</TableCell>}
                  {!isMobile && <TableCell>{user.department || "未設定"}</TableCell>}
                  <TableCell className="text-sm">
                    {new Date(user.createdAt).toLocaleDateString("zh-TW", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      ...(isMobile
                        ? {}
                        : {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          }),
                    })}
                  </TableCell>
                  <TableCell>
                    {user.isDisabled ? (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        已停用
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        使用中
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewUser(user.id)}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">查看詳情</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 用戶詳情對話框 */}
      {selectedUser && (
        <UserDetailDialog
          isOpen={isDetailDialogOpen}
          onClose={() => setIsDetailDialogOpen(false)}
          userId={selectedUser}
        />
      )}

      {/* 新增用戶對話框 */}
      <UserRegisterDialog
        isOpen={isRegisterDialogOpen}
        onClose={() => setIsRegisterDialogOpen(false)}
        onSuccess={handleRegisterSuccess}
      />
    </div>
  )
}
