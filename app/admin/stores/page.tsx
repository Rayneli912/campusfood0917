"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { stores, storeAccounts, updateStoreInfo, updateStoreStatus, deleteStore } from "@/lib/data"
import { Search, MoreHorizontal, Plus } from "lucide-react"
import { RegisterDialog } from "@/components/register-dialog"
import { StoreDetailDialog } from "@/components/store-detail-dialog"

export default function AdminStoresPage() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStore, setSelectedStore] = useState<any | null>(null)
  const [storeList, setStoreList] = useState<any[]>([])
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [editForm, setEditForm] = useState({
    name: "",
    category: "",
    location: "",
    contact: "",
    description: "",
    status: "active",
  })

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

  // 獲取店家密碼的函數
  const getStorePassword = (username: string) => {
    // 從預設店家帳號中查找
    const defaultAccount = storeAccounts.find((acc) => acc.username === username)
    if (defaultAccount) return defaultAccount.password

    // 從註冊店家中查找
    const registeredStores = JSON.parse(localStorage.getItem("registeredStores") || "[]")
    const registeredAccount = registeredStores.find((store: any) => store.username === username)
    return registeredAccount?.password || "未設定"
  }

  // 從 lib/data.ts 載入店家數據
  useEffect(() => {
    const loadStores = () => {
      // 從 lib/data.ts 中獲取預設店家資料
      const formattedStores = stores.map((store) => {
        // 找到對應的店家帳號
        const account = storeAccounts.find((acc) => acc.storeId === store.id) || { username: store.id }

        return {
          id: store.id,
          storeId: store.id, // 添加 storeId 欄位
          name: store.name,
          username: account.username,
          category: store.category,
          location: store.location,
          contact: store.contact,
          description: store.description,
          products: 0,
          orders: 0,
          status: store.status || "active",
          createdAt: store.createdAt || new Date().toISOString(),
        }
      })

      // 從 localStorage 獲取註冊的店家
      const registeredStores = JSON.parse(localStorage.getItem("registeredStores") || "[]")

      // 將註冊店家轉換為管理介面所需格式
      const formattedRegisteredStores = registeredStores.map((store: any) => {
        const storeId = store.id || `store-${store.username}`
        return {
          id: storeId,
          storeId: storeId,
          name: store.storeName || store.name,
          username: store.username,
          category: store.category || "其他",
          location: store.address || store.location,
          contact: store.phone || store.contact,
          email: store.email,
          description: store.description || "",
          products: 0,
          orders: 0,
          status: store.status || "active",
          createdAt: store.createdAt || new Date().toISOString(),
        }
      })

      // 確保沒有重複的店家（基於 username）
      const uniqueStores = [...formattedStores]
      formattedRegisteredStores.forEach(newStore => {
        const existingIndex = uniqueStores.findIndex(s => s.username === newStore.username)
        if (existingIndex === -1) {
          uniqueStores.push(newStore)
        }
      })

      setStoreList(uniqueStores)
    }

    loadStores()

    // 添加事件監聽器
    window.addEventListener("storage", loadStores)
    window.addEventListener("storeUpdated", loadStores)
    window.addEventListener("storeRegistered", loadStores)

    return () => {
      window.removeEventListener("storage", loadStores)
      window.removeEventListener("storeUpdated", loadStores)
      window.removeEventListener("storeRegistered", loadStores)
    }
  }, [])

  // 設置編輯表單
  useEffect(() => {
    if (selectedStore && isEditDialogOpen) {
      setEditForm({
        name: selectedStore.name,
        category: selectedStore.category,
        location: selectedStore.location,
        contact: selectedStore.contact,
        description: selectedStore.description || "",
        status: selectedStore.status,
      })
    }
  }, [selectedStore, isEditDialogOpen])

  // 過濾店家
  const filteredStores = storeList
    .filter((store) => {
      if (!searchQuery) return true

      const searchLower = searchQuery.toLowerCase()
      const matchesSearch =
        (store.name || "").toLowerCase().includes(searchLower) ||
        (store.category || "").toLowerCase().includes(searchLower) ||
        (store.location || "").toLowerCase().includes(searchLower) ||
        (store.username || "").toLowerCase().includes(searchLower)

      return matchesSearch
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // 修改 handleEditStore 函數，確保更新後觸發正確的同步事件
  const handleEditStore = () => {
    if (!selectedStore) return

    // 對於預設店家，使用 lib/data.ts 中的函數更新
    if (selectedStore.id === "store1" || selectedStore.id === "store2" || selectedStore.id === "store3") {
      updateStoreInfo(selectedStore.id, {
        name: editForm.name,
        category: editForm.category,
        location: editForm.location,
        contact: editForm.contact,
        description: editForm.description,
        status: editForm.status,
      })

      // 更新本地狀態
      setStoreList(
        storeList.map((store) => {
          if (store.id === selectedStore.id) {
            return {
              ...store,
              name: editForm.name,
              category: editForm.category,
              location: editForm.location,
              contact: editForm.contact,
              description: editForm.description,
              status: editForm.status,
            }
          }
          return store
        }),
      )

      toast({
        title: "更新成功",
        description: `已更新店家 ${selectedStore.name} 的資料`,
      })

      setSelectedStore(null)
      setIsEditDialogOpen(false)
      return
    }

    // 從 localStorage 中獲取註冊店家
    const registeredStores = JSON.parse(localStorage.getItem("registeredStores") || "[]")

    // 更新指定店家
    const updatedStores = registeredStores.map((store: any) => {
      if (store.username === selectedStore.username) {
        return {
          ...store,
          storeName: editForm.name,
          category: editForm.category,
          address: editForm.location,
          phone: editForm.contact,
          description: editForm.description,
          status: editForm.status,
        }
      }
      return store
    })

    // 更新 localStorage
    localStorage.setItem("registeredStores", JSON.stringify(updatedStores))

    // 更新本地狀態
    setStoreList(
      storeList.map((store) => {
        if (store.username === selectedStore.username) {
          return {
            ...store,
            name: editForm.name,
            category: editForm.category,
            location: editForm.location,
            contact: editForm.contact,
            description: editForm.description,
            status: editForm.status,
          }
        }
        return store
      }),
    )

    // 同時更新 stores 數據，確保用戶端首頁能看到更新後的店家
    const storedStores = JSON.parse(localStorage.getItem("stores") || "[]")
    const updatedUserStores = storedStores.map((store: any) => {
      if (store.id === selectedStore.id) {
        return {
          ...store,
          name: editForm.name,
          category: editForm.category,
          location: editForm.location,
          contact: editForm.contact,
          description: editForm.description,
          status: editForm.status,
        }
      }
      return store
    })
    localStorage.setItem("stores", JSON.stringify(updatedUserStores))

    toast({
      title: "更新成功",
      description: `已更新店家 ${selectedStore.name} 的資料`,
    })

    setSelectedStore(null)
    setIsEditDialogOpen(false)
  }

  // 處理刪除店家
  const handleDeleteStore = () => {
    if (!selectedStore) return

    // 從 localStorage 中獲取註冊店家
    const registeredStores = JSON.parse(localStorage.getItem("registeredStores") || "[]")

    // 過濾掉要刪除的店家
    const updatedStores = registeredStores.filter((store: any) => store.username !== selectedStore.username)

    // 更新 localStorage
    localStorage.setItem("registeredStores", JSON.stringify(updatedStores))

    // 同時從用戶端店家列表中移除
    const userStores = JSON.parse(localStorage.getItem("stores") || "[]")
    const updatedUserStores = userStores.filter((store: any) => store.id !== selectedStore.id)
    localStorage.setItem("stores", JSON.stringify(updatedUserStores))

    // 更新本地狀態
    setStoreList(storeList.filter((store) => store.id !== selectedStore.id))

    toast({
      title: "刪除成功",
      description: `已刪除店家 ${selectedStore.name}`,
    })

    setSelectedStore(null)
    setIsDeleteDialogOpen(false)
  }

  // 處理註冊成功
  const handleRegisterSuccess = (newStore: any) => {
    // 重新載入店家列表
    const registeredStores = JSON.parse(localStorage.getItem("registeredStores") || "[]")
    const storeId = newStore.id || `store-${newStore.username}`

    // 更新店家列表
    const formattedStore = {
      id: storeId,
      storeId: storeId,
      name: newStore.storeName || newStore.name,
      username: newStore.username,
      category: newStore.category || "其他",
      location: newStore.address || newStore.location,
      contact: newStore.phone || newStore.contact,
      email: newStore.email,
      description: newStore.description || "",
      products: 0,
      orders: 0,
      status: newStore.status || "active",
      createdAt: newStore.createdAt || new Date().toISOString(),
    }

    setStoreList(prevList => {
      const existingIndex = prevList.findIndex(s => s.username === formattedStore.username)
      if (existingIndex === -1) {
        return [...prevList, formattedStore]
      }
      const newList = [...prevList]
      newList[existingIndex] = formattedStore
      return newList
    })

    // 更新用戶端店家列表
    const userStores = JSON.parse(localStorage.getItem("stores") || "[]")
    const newUserStore = {
      id: storeId,
      name: formattedStore.name,
      description: formattedStore.description || `${formattedStore.name}的美食`,
      category: formattedStore.category,
      rating: 5.0,
      location: formattedStore.location,
      contact: formattedStore.contact,
      openTime: "08:00",
      closeTime: "21:00",
      isNew: true,
      status: "active",
      coverImage: `/placeholder.svg?height=200&width=400&text=${encodeURIComponent(formattedStore.name)}`,
    }

    const existingIndex = userStores.findIndex((store: any) => store.id === storeId)
    if (existingIndex === -1) {
      userStores.push(newUserStore)
    } else {
      userStores[existingIndex] = newUserStore
    }
    localStorage.setItem("stores", JSON.stringify(userStores))

    // 觸發更新事件
    const event = new CustomEvent("storeUpdated", { detail: { storeId } })
    window.dispatchEvent(event)
  }

  // 處理編輯店家
  const handleEditStoreFromDetail = (storeId: string) => {
    const store = storeList.find((s) => s.id === storeId || s.username === storeId)
    if (store) {
      setSelectedStore(store)
      setIsDetailDialogOpen(false)
      setIsEditDialogOpen(true)
    }
  }

  // 處理啟用/停用店家
  const handleToggleStoreStatus = (storeId: string, currentStatus: "active" | "disabled") => {
    const newStatus = currentStatus === "active" ? "disabled" : "active"
    const statusText = newStatus === "active" ? "啟用" : "停用"

    try {
      // 從 localStorage 獲取註冊店家
      const registeredStores = JSON.parse(localStorage.getItem("registeredStores") || "[]")
      
      // 更新店家狀態
      const updatedStores = registeredStores.map((store: any) => {
        if (store.id === storeId || store.username === storeId) {
          return {
            ...store,
            isDisabled: newStatus === "disabled",
            status: newStatus,
          }
        }
        return store
      })

      // 保存更新後的店家列表
      localStorage.setItem("registeredStores", JSON.stringify(updatedStores))

      // 更新本地狀態
      setStoreList(
        storeList.map((store) => {
          if (store.id === storeId || store.username === storeId) {
            return { ...store, status: newStatus }
          }
          return store
        }),
      )

      // 觸發更新事件
      window.dispatchEvent(new CustomEvent("storeUpdated", { 
        detail: { 
          storeId,
          status: newStatus,
        } 
      }))

      toast({
        title: `店家已${statusText}`,
        description: `店家帳號已成功${statusText}`,
      })
    } catch (error) {
      console.error("更新店家狀態時發生錯誤:", error)
      toast({
        title: "錯誤",
        description: "更新店家狀態時發生錯誤",
        variant: "destructive",
      })
    }
  }

  // 處理刪除店家
  const handleDeleteStoreAccount = (storeId: string, storeName: string) => {
    if (confirm(`確定要刪除店家 ${storeName} 嗎？此操作無法復原。`)) {
      deleteStore(storeId)

      // 更新本地狀態
      setStoreList(storeList.filter((store) => store.id !== storeId))

      toast({
        title: "店家已刪除",
        description: `已成功刪除店家 ${storeName}`,
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight">店家數據管理</h1>
        <p className="text-muted-foreground">管理平台上的所有店家帳號與資訊</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="搜尋店家名稱、帳號、分類..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button onClick={() => setIsRegisterDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新增店家
        </Button>
      </div>

      {/* 響應式表格 */}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>店家名稱</TableHead>
              <TableHead>帳號</TableHead>
              {!isMobile && <TableHead>密碼</TableHead>}
              {!isMobile && <TableHead>分類</TableHead>}
              {!isMobile && <TableHead>聯絡資訊</TableHead>}
              <TableHead>加入時間</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStores.length > 0 ? (
              filteredStores.map((store) => (
                <TableRow key={`${store.id}-${store.username}`}>
                  <TableCell className="font-medium">{store.name}</TableCell>
                  <TableCell>{store.username}</TableCell>
                  {!isMobile && <TableCell className="font-mono text-sm">{getStorePassword(store.username)}</TableCell>}
                  {!isMobile && <TableCell>{store.category}</TableCell>}
                  {!isMobile && (
                    <TableCell>
                      {store.contact}
                      {store.email && <div className="text-xs text-muted-foreground">{store.email}</div>}
                    </TableCell>
                  )}
                  <TableCell className="text-sm">
                    {new Date(store.createdAt).toLocaleDateString("zh-TW", {
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
                    {store.status === "active" ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        啟用
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        已停用
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {!isMobile && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStoreStatus(store.storeId, store.status)}
                          >
                            {store.status === "active" ? "停用" : "啟用"}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteStoreAccount(store.storeId, store.name)}
                          >
                            刪除
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedStore(store)
                          setIsDetailDialogOpen(true)
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">更多選項</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={isMobile ? 5 : 8} className="text-center py-6 text-muted-foreground">
                  沒有找到符合條件的店家
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 店家詳情對話框 */}
      {selectedStore && (
        <StoreDetailDialog
          isOpen={isDetailDialogOpen}
          onClose={() => setIsDetailDialogOpen(false)}
          storeId={selectedStore.id}
          onEdit={handleEditStoreFromDetail}
        />
      )}

      {/* 編輯店家對話框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯店家</DialogTitle>
            <DialogDescription>修改店家 {selectedStore?.name} 的資料</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">店家名稱</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-category">店家分類</Label>
              <Input
                id="edit-category"
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-location">店家地址</Label>
              <Input
                id="edit-location"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-contact">聯絡電話</Label>
              <Input
                id="edit-contact"
                value={editForm.contact}
                onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">店家描述</Label>
              <Input
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-status">帳號狀態</Label>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="status-active"
                    name="status"
                    value="active"
                    checked={editForm.status === "active"}
                    onChange={() => setEditForm({ ...editForm, status: "active" })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="status-active" className="cursor-pointer">
                    啟用
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="status-disabled"
                    name="status"
                    value="disabled"
                    checked={editForm.status === "disabled"}
                    onChange={() => setEditForm({ ...editForm, status: "disabled" })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="status-disabled" className="cursor-pointer">
                    停用
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEditStore}>儲存變更</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除店家對話框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>刪除店家</DialogTitle>
            <DialogDescription>您確定要刪除店家 {selectedStore?.name} 嗎？此操作無法撤銷。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDeleteStore}>
              確認刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 註冊店家對話框 */}
      <RegisterDialog
        isOpen={isRegisterDialogOpen}
        onClose={() => setIsRegisterDialogOpen(false)}
        onSuccess={handleRegisterSuccess}
      />
    </div>
  )
}
