"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Edit, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { useToast } from "@/hooks/use-toast"
import type { FoodItem } from "@/lib/types"

// ✅ 改用 food-item-service（保持單一來源）
import {
  getFoodItemsByStoreId,
  addFoodItem,
  updateFoodItem,
  deleteFoodItem,
  setFoodItemListed,
  setFoodItemQuantity,
} from "@/lib/food-item-service"

/**
 * 取得目前店家 ID（保持與舊專案相容）
 * - 優先使用 currentStoreId
 * - 退而求其次讀取已登入店家資訊中的 storeId
 */
function getCurrentStoreId(): string {
  if (typeof window === "undefined") return ""
  const byKey = localStorage.getItem("currentStoreId")
  if (byKey) return byKey
  try {
    const storeUser = JSON.parse(localStorage.getItem("storeUser") || "{}")
    if (storeUser?.storeId) return String(storeUser.storeId)
  } catch {}
  try {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser") || "{}")
    if (loggedInUser?.storeId) return String(loggedInUser.storeId)
  } catch {}
  return ""
}

/** 友善格式化時間；無法解析時回傳 "-" 以避免 NaN/NaN/NaN */
function formatDateTime(value?: string) {
  if (!value) return "-"
  const raw = value.trim().replace(" ", "T")
  const hasSecond = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(raw)
  const fixed = hasSecond && !raw.endsWith(":") ? (raw.length === 16 ? `${raw}:00` : raw) : raw
  const d = new Date(fixed)
  if (Number.isNaN(d.getTime())) return "-"
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  const hh = String(d.getHours()).padStart(2, "0")
  const mi = String(d.getMinutes()).padStart(2, "0")
  const ss = String(d.getSeconds()).padStart(2, "0")
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}:${ss}`
}

export default function StoreProductsPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [storeId, setStoreId] = useState<string>("")
  const [activeTab, setActiveTab] = useState<"list" | "create">("list")

  const [products, setProducts] = useState<FoodItem[] | unknown>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<FoodItem | null>(null)

  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    originalPrice: 0,
    discountPrice: 0,
    category: "",
    quantity: 1,
    expiryTime: "",
    isListed: true,
  })

  // ------ 初始化：取得 storeId 與載入清單 ------
  useEffect(() => {
    const id = getCurrentStoreId()
    if (!id) {
      setError("找不到目前登入的店家，請重新登入後再試")
      setLoading(false)
      return
    }
    setStoreId(id)
  }, [])

  useEffect(() => {
    if (!storeId) return
    ;(async () => {
      try {
        setLoading(true)
        const list = await getFoodItemsByStoreId(storeId)
        setProducts(Array.isArray(list) ? list : [])
      } catch (e) {
        console.error(e)
        setError("載入商品失敗")
      } finally {
        setLoading(false)
      }
    })()
  }, [storeId])

  // 監聽 inventoryUpdated，確保三端同步
  useEffect(() => {
    if (!storeId) return
    const onInv = (ev: any) => {
      const sId = ev?.detail?.storeId
      const arr = ev?.detail?.items
      if (sId === storeId && Array.isArray(arr)) {
        setProducts(arr)
      }
    }
    window.addEventListener("inventoryUpdated", onInv as EventListener)
    return () => window.removeEventListener("inventoryUpdated", onInv as EventListener)
  }, [storeId])

  // 確保渲染時一定是陣列，避免 products.map 崩潰
  const productList: FoodItem[] = useMemo(() => {
    return Array.isArray(products) ? (products as FoodItem[]) : []
  }, [products])

  // ------ 事件處理：新增 / 編輯 / 刪除 / 上下架 / 數量 ------
  async function refresh() {
    const list = await getFoodItemsByStoreId(storeId)
    setProducts(Array.isArray(list) ? list : [])
  }

  async function handleToggleListed(item: FoodItem, nextListed: boolean) {
    try {
      await setFoodItemListed(storeId, item.id, nextListed)
      await refresh()
    } catch (e) {
      console.error(e)
      toast({ title: "操作失敗", description: "更新上架狀態失敗", variant: "destructive" })
    }
  }

  async function handleDeleteItem(id: string) {
    if (!confirm("確定要刪除此商品嗎？")) return
    try {
      await deleteFoodItem(storeId, id)
      await refresh()
      toast({ title: "刪除成功" })
    } catch (e) {
      console.error(e)
      toast({ title: "刪除失敗", variant: "destructive" })
    }
  }

  function openEdit(item: FoodItem) {
    setSelectedProduct(item)
    setProductForm({
      name: item.name || "",
      description: (item as any).description || "",
      originalPrice: item.originalPrice || 0,
      discountPrice: item.discountPrice || 0,
      category: (item as any).category || "",
      quantity: item.quantity ?? 0,
      expiryTime: (item as any).expiryTime || "",
      isListed: !!item.isListed,
    })
    setIsEditDialogOpen(true)
  }

  async function handleSaveEdit() {
    if (!selectedProduct) return
    if (
      !productForm.name ||
      !productForm.description ||
      productForm.originalPrice <= 0 ||
      productForm.discountPrice <= 0
    ) {
      toast({ title: "編輯失敗", description: "請填寫所有必填欄位", variant: "destructive" })
      return
    }
    try {
      const patch = {
        ...selectedProduct,
        name: productForm.name,
        description: productForm.description,
        originalPrice: productForm.originalPrice,
        discountPrice: productForm.discountPrice,
        category: productForm.category,
        expiryTime: productForm.expiryTime,
        quantity: productForm.quantity,
        isListed: productForm.isListed,
      }
      await updateFoodItem(storeId, selectedProduct.id, patch)
      await refresh()
      setIsEditDialogOpen(false)
      setSelectedProduct(null)
      toast({ title: "更新成功" })
    } catch (e) {
      console.error(e)
      toast({ title: "更新失敗", variant: "destructive" })
    }
  }

  async function handleCreate() {
    if (
      !productForm.name ||
      !productForm.description ||
      productForm.originalPrice <= 0 ||
      productForm.discountPrice <= 0
    ) {
      toast({ title: "新增失敗", description: "請填寫所有必填欄位", variant: "destructive" })
      return
    }
    try {
      const newItem: FoodItem = {
        id: `item${Date.now()}`,
        storeId,
        name: productForm.name,
        description: productForm.description,
        originalPrice: productForm.originalPrice,
        discountPrice: productForm.discountPrice,
        image: `/placeholder.svg?height=100&width=100&text=${encodeURIComponent(productForm.name)}`,
        category: productForm.category,
        expiryTime: productForm.expiryTime,
        quantity: productForm.quantity,
        isListed: productForm.isListed,
      }
      await addFoodItem(storeId, newItem)
      await refresh()
      setActiveTab("list")
      setProductForm({
        name: "",
        description: "",
        originalPrice: 0,
        discountPrice: 0,
        category: "",
        quantity: 1,
        expiryTime: "",
        isListed: true,
      })
      toast({ title: "新增成功" })
    } catch (e) {
      console.error(e)
      toast({ title: "新增失敗", variant: "destructive" })
    }
  }

  // ------ 畫面 ------
  if (loading) {
    return (
      <div className="container py-10">
        <div className="flex justify-center items-center h-40">載入中...</div>
      </div>
    )
  }
  if (error) {
    return (
      <div className="container py-10">
        <div className="flex flex-col justify-center items-center h-40 space-y-4">
          <div className="text-red-500 font-medium">{error}</div>
          <Button variant="outline" asChild>
            <Link href="/store">返回</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">商品管理</h1>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">商品列表</TabsTrigger>
          <TabsTrigger value="create">新增商品</TabsTrigger>
        </TabsList>

        {/* 商品列表 */}
        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>商品列表</CardTitle>
                <CardDescription>管理您的商品清單和優惠</CardDescription>
              </div>
              <Button onClick={() => setActiveTab("create")}>
                <Plus className="mr-2 h-4 w-4" />
                新增商品
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>商品名稱</TableHead>
                      <TableHead>分類</TableHead>
                      <TableHead>原價</TableHead>
                      <TableHead>特價</TableHead>
                      <TableHead>庫存</TableHead>
                      <TableHead>到期時間</TableHead>
                      <TableHead>狀態</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productList.length > 0 ? (
                      productList.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell>{(p as any).category}</TableCell>
                          <TableCell>${p.originalPrice}</TableCell>
                          <TableCell>${p.discountPrice}</TableCell>
                          <TableCell>{p.quantity}</TableCell>
                          <TableCell>{formatDateTime((p as any).expiryTime)}</TableCell>
                          <TableCell>
                            {p.isListed ? (
                              <Badge variant="outline" className="bg-green-100 text-green-800">已上架</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-100 text-gray-800">未上架</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleListed(p, !p.isListed)}
                              >
                                {p.isListed ? "下架" : "上架"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(p)}
                                aria-label="編輯"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteItem(p.id)}
                                aria-label="刪除"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6">
                          尚無商品資料
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 新增商品 */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>新增商品</CardTitle>
              <CardDescription>請填寫新商品資料</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">商品名稱</Label>
                  <Input id="name" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">商品分類</Label>
                  <Input id="category" value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">商品描述</Label>
                <Textarea id="desc" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="op">原價</Label>
                  <Input id="op" type="number" value={productForm.originalPrice} onChange={(e) => setProductForm({ ...productForm, originalPrice: Number.parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dp">特價</Label>
                  <Input id="dp" type="number" value={productForm.discountPrice} onChange={(e) => setProductForm({ ...productForm, discountPrice: Number.parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="qty">數量</Label>
                  <Input id="qty" type="number" value={productForm.quantity} onChange={(e) => setProductForm({ ...productForm, quantity: Number.parseInt(e.target.value || "0") })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exp">到期時間</Label>
                  <Input id="exp" type="datetime-local" value={productForm.expiryTime} onChange={(e) => setProductForm({ ...productForm, expiryTime: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleCreate}>新增</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 編輯 Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯商品</DialogTitle>
            <DialogDescription>修改商品資料</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">商品名稱</Label>
                <Input id="edit-name" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">商品分類</Label>
                <Input id="edit-category" value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">商品描述</Label>
              <Textarea id="edit-desc" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-op">原價</Label>
                <Input id="edit-op" type="number" value={productForm.originalPrice} onChange={(e) => setProductForm({ ...productForm, originalPrice: Number.parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dp">特價</Label>
                <Input id="edit-dp" type="number" value={productForm.discountPrice} onChange={(e) => setProductForm({ ...productForm, discountPrice: Number.parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-qty">數量</Label>
                <Input id="edit-qty" type="number" value={productForm.quantity} onChange={(e) => setProductForm({ ...productForm, quantity: Number.parseInt(e.target.value || "0") })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-exp">到期時間</Label>
                <Input id="edit-exp" type="datetime-local" value={productForm.expiryTime} onChange={(e) => setProductForm({ ...productForm, expiryTime: e.target.value })} />
                <p className="text-xs text-muted-foreground">目前設定：{formatDateTime(productForm.expiryTime)}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>取消</Button>
            <Button onClick={handleSaveEdit}>儲存變更</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
