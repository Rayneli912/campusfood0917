"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Edit, Trash2, Eye, Upload, ImagePlus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

// --- 保留仍由 data 取得的部分 ---
import {
  getStoreById,
  getOrdersByStoreId,
  updateStoreInfo,
} from "@/lib/data"

// --- 將「庫存四招」改由 food-item-service 匯入 ---
import {
  getFoodItemsByStoreId,
  addFoodItem,
  updateFoodItem,
  deleteFoodItem,
} from "@/lib/food-item-service"

import type { FoodItem, Order } from "@/lib/types"
import { syncFoodItems, syncStoreInfo } from "@/lib/sync-service"

/** 將任意時間字串正規化為 YYYY-MM-DDTHH:mm:ss（本地時間）；無法解析時回傳空字串 */
function normalizeDateTimeInput(value: string): string {
  if (!value) return ""
  let v = value.trim().replace(" ", "T")
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) v = `${v}:00`
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(v)) {
    const d = new Date(v)
    if (isNaN(d.getTime())) return ""
    const yy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    const hh = String(d.getHours()).padStart(2, "0")
    const mi = String(d.getMinutes()).padStart(2, "0")
    const ss = String(d.getSeconds()).padStart(2, "0")
    v = `${yy}-${mm}-${dd}T${hh}:${mi}:${ss}`
  }
  return v
}

/** 將時間字串友善顯示；無法解析時顯示 "-" */
function formatDateTime(dateTimeStr: string) {
  if (!dateTimeStr) return "-"
  const normalized = normalizeDateTimeInput(dateTimeStr)
  if (!normalized) return "-"
  const date = new Date(normalized)
  if (isNaN(date.getTime())) return "-"
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const seconds = String(date.getSeconds()).padStart(2, "0")
  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
}

export default function StoreManagementPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const storeId = params.id as string
  const [activeTab, setActiveTab] = useState("info")
  const [store, setStore] = useState<any>(null)
  const [products, setProducts] = useState<FoodItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false)
  const [isEditProductDialogOpen, setIsEditProductDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<FoodItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

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

  const [storeForm, setStoreForm] = useState({
    name: "",
    description: "",
    category: "",
    location: "",
    contact: "",
    openingHours: "",
    logo: "",
    banner: "",
  })

  // 預覽圖片
  const [logoPreview, setLogoPreview] = useState<string>("")
  const [bannerPreview, setBannerPreview] = useState<string>("")

  // 載入店家資料
  useEffect(() => {
    const loadStoreData = async () => {
      try {
        setLoading(true)
        const storeData = await getStoreById(storeId)

        if (!storeData) {
          setError(`找不到ID為 ${storeId} 的店家`)
          setLoading(false)
          toast({
            title: "載入失敗",
            description: `找不到ID為 ${storeId} 的店家`,
            variant: "destructive",
          })
          return
        }

        setStore(storeData)
        setStoreForm({
          name: storeData.name || "",
          description: storeData.description || "",
          category: storeData.category || "",
          location: storeData.location || "",
          contact: storeData.contact || "",
          openingHours: storeData.openingHours || "",
          logo: storeData.logo || "",
          banner: storeData.banner || "",
        })

        // 設置預覽圖片
        setLogoPreview(storeData.logo || "")
        setBannerPreview(storeData.banner || "")

        const productsData = await getFoodItemsByStoreId(storeId)
        setProducts(productsData)

        const ordersData = await getOrdersByStoreId(storeId)
        setOrders(ordersData)

        setLoading(false)
      } catch (error) {
        console.error("載入店家資料失敗:", error)
        setError("載入店家資料時發生錯誤")
        setLoading(false)
        toast({
          title: "載入失敗",
          description: "無法載入店家資料，請稍後再試",
          variant: "destructive",
        })
      }
    }

    loadStoreData()

    // 設置資料更新監聽器
    const handleFoodItemsUpdated = async () => {
      const updatedProducts = await getFoodItemsByStoreId(storeId)
      setProducts(updatedProducts)
    }

    const handleOrdersUpdated = () => {
      const updatedOrders = getOrdersByStoreId(storeId)
      setOrders(updatedOrders)
    }

    const handleStoreUpdated = async () => {
      try {
        const updatedStore = await getStoreById(storeId)
        if (!updatedStore) {
          console.error("找不到更新後的店家資料")
          return
        }

        setStore(updatedStore)
        setStoreForm({
          name: updatedStore.name || "",
          description: updatedStore.description || "",
          category: updatedStore.category || "",
          location: updatedStore.location || "",
          contact: updatedStore.contact || "",
          openingHours: updatedStore.openingHours || "",
          logo: updatedStore.logo || "",
          banner: updatedStore.banner || "",
        })

        setLogoPreview(updatedStore.logo || "")
        setBannerPreview(updatedStore.banner || "")
      } catch (error) {
        console.error("更新店家資料失敗:", error)
      }
    }

    window.addEventListener("foodItemsUpdated", handleFoodItemsUpdated as EventListener)
    window.addEventListener("foodItemDeleted", handleFoodItemsUpdated as EventListener)
    window.addEventListener("ordersUpdated", handleOrdersUpdated as EventListener)
    window.addEventListener("storeUpdated", handleStoreUpdated as EventListener)

    return () => {
      window.removeEventListener("foodItemsUpdated", handleFoodItemsUpdated as EventListener)
      window.removeEventListener("foodItemDeleted", handleFoodItemsUpdated as EventListener)
      window.removeEventListener("ordersUpdated", handleOrdersUpdated as EventListener)
      window.removeEventListener("storeUpdated", handleStoreUpdated as EventListener)
    }
  }, [storeId, toast])

  // 監聽庫存事件
  useEffect(() => {
    const handleInventoryUpdate = (event: CustomEvent) => {
      if (event.detail && event.detail.storeId === storeId) {
        loadProducts()
      }
    }

    const loadProducts = async () => {
      try {
        const productsData = await getFoodItemsByStoreId(storeId)
        setProducts(productsData)
      } catch (error) {
        console.error("Error loading products after inventory update:", error)
      }
    }

    window.addEventListener("inventoryUpdated", handleInventoryUpdate as unknown as EventListener)
    return () => {
      window.removeEventListener("inventoryUpdated", handleInventoryUpdate as unknown as EventListener)
    }
  }, [storeId])

  // 圖片上傳
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setLogoPreview(result)
        setStoreForm((prev) => ({ ...prev, logo: result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setBannerPreview(result)
        setStoreForm((prev) => ({ ...prev, banner: result }))
      }
      reader.readAsDataURL(file)
    }
  }

  // 更新店家資訊
  const handleUpdateStoreInfo = () => {
    if (!storeForm.name || !storeForm.description || !storeForm.category || !storeForm.location || !storeForm.contact) {
      toast({
        title: "更新失敗",
        description: "請填寫所有必填欄位",
        variant: "destructive",
      })
      return
    }

    updateStoreInfo(storeId, {
      name: storeForm.name,
      description: storeForm.description,
      category: storeForm.category,
      location: storeForm.location,
      contact: storeForm.contact,
      openingHours: storeForm.openingHours,
      logo: storeForm.logo,
      banner: storeForm.banner,
    })

    syncStoreInfo(storeId)

    setStore({
      ...store,
      name: storeForm.name,
      description: storeForm.description,
      category: storeForm.category,
      location: storeForm.location,
      contact: storeForm.contact,
      openingHours: storeForm.openingHours,
      logo: storeForm.logo,
      banner: storeForm.banner,
    })

    toast({ title: "更新成功", description: "已更新店家資訊" })
  }

  // 新增商品
  const handleAddProduct = async () => {
    if (
      !productForm.name ||
      !productForm.description ||
      productForm.originalPrice <= 0 ||
      productForm.discountPrice <= 0
    ) {
      toast({
        title: "新增失敗",
        description: "請填寫所有必填欄位",
        variant: "destructive",
      })
      return
    }

    const fallback = `${new Date().toISOString().slice(0, 10)}T23:59:00`
    const expiryTimeISO = normalizeDateTimeInput(productForm.expiryTime || fallback)

    const newProduct: FoodItem = {
      id: `item${Date.now()}`,
      storeId,
      name: productForm.name,
      description: productForm.description,
      originalPrice: productForm.originalPrice,
      discountPrice: productForm.discountPrice,
      image: `/placeholder.svg?height=100&width=100&text=${encodeURIComponent(productForm.name)}`,
      category: productForm.category,
      expiryTime: expiryTimeISO,
      quantity: productForm.quantity,
      isListed: productForm.isListed,
    }

    await addFoodItem(storeId, newProduct)
    syncFoodItems(storeId)

    const refreshed = await getFoodItemsByStoreId(storeId)
    setProducts(refreshed)

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
    setIsAddProductDialogOpen(false)

    toast({ title: "新增成功", description: `已新增商品 ${productForm.name}` })
  }

  // 編輯商品
  const handleEditProduct = async () => {
    if (!selectedProduct) return

    if (
      !productForm.name ||
      !productForm.description ||
      productForm.originalPrice <= 0 ||
      productForm.discountPrice <= 0
    ) {
      toast({
        title: "編輯失敗",
        description: "請填寫所有必填欄位",
        variant: "destructive",
      })
      return
    }

    const updatedProduct = {
      ...selectedProduct,
      name: productForm.name,
      description: productForm.description,
      originalPrice: productForm.originalPrice,
      discountPrice: productForm.discountPrice,
      category: productForm.category,
      expiryTime: normalizeDateTimeInput(productForm.expiryTime || selectedProduct.expiryTime || ""),
      quantity: productForm.quantity,
      isListed: productForm.isListed,
    }

    await updateFoodItem(storeId, selectedProduct.id, updatedProduct)
    syncFoodItems(storeId)

    const refreshed = await getFoodItemsByStoreId(storeId)
    setProducts(refreshed)

    setIsEditProductDialogOpen(false)
    setSelectedProduct(null)

    toast({ title: "更新成功", description: `已更新商品 ${productForm.name}` })
  }

  // 刪除商品
  const handleDeleteProduct = async (productId: string) => {
    if (confirm("確定要刪除此商品嗎？")) {
      await deleteFoodItem(storeId, productId)
      syncFoodItems(storeId)
      const refreshed = await getFoodItemsByStoreId(storeId)
      setProducts(refreshed)
      toast({ title: "刪除成功", description: "已刪除商品" })
    }
  }

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">待處理</Badge>
      case "accepted":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">處理中</Badge>
      case "completed":
        return <Badge variant="outline" className="bg-green-100 text-green-800">已完成</Badge>
      case "cancelled":
        return <Badge variant="outline" className="bg-red-100 text-red-800">已取消</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // 顯示載入中狀態
  if (loading) {
    return (
      <div className="container py-10">
        <div className="flex justify-center items-center h-40">
          <p>載入中...</p>
        </div>
      </div>
    )
  }

  // 顯示錯誤狀態
  if (error) {
    return (
      <div className="container py-10">
        <div className="flex flex-col justify-center items-center h-40 space-y-4">
          <div className="text-red-500 font-medium">{error}</div>
          <Button variant="outline" asChild>
            <Link href="/admin/stores">返回店家列表</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!store) {
    return (
      <div className="container py-10">
        <div className="flex flex-col justify-center items-center h-40 space-y-4">
          <div className="text-red-500 font-medium">找不到此店家</div>
          <Button variant="outline" asChild>
            <Link href="/admin/stores">返回店家列表</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" asChild>
              <Link href="/admin/stores">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">店家管理: {store.name}</h1>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info">店家資訊</TabsTrigger>
          <TabsTrigger value="products">商品管理</TabsTrigger>
          <TabsTrigger value="orders">訂單管理</TabsTrigger>
        </TabsList>

        {/* 店家資訊 */}
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>店家資訊</CardTitle>
              <CardDescription>查看和更新店家基本資訊</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="store-name">店家名稱</Label>
                  <Input id="store-name" value={storeForm.name} onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store-category">店家分類</Label>
                  <Input id="store-category" value={storeForm.category} onChange={(e) => setStoreForm({ ...storeForm, category: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store-location">店家地址</Label>
                  <Input id="store-location" value={storeForm.location} onChange={(e) => setStoreForm({ ...storeForm, location: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store-contact">聯絡電話</Label>
                  <Input id="store-contact" value={storeForm.contact} onChange={(e) => setStoreForm({ ...storeForm, contact: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="store-hours">營業時間</Label>
                  <Input id="store-hours" value={storeForm.openingHours} onChange={(e) => setStoreForm({ ...storeForm, openingHours: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="store-description">店家描述</Label>
                  <Textarea id="store-description" rows={4} value={storeForm.description} onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo">Logo 圖片</Label>
                  <div className="flex flex-col space-y-2">
                    {logoPreview && (
                      <div className="relative w-32 h-32 border rounded-md overflow-hidden">
                        <img src={logoPreview || "/placeholder.svg"} alt="Logo 預覽" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()} className="w-fit">
                      <Upload className="h-4 w-4 mr-2" />
                      上傳 Logo
                    </Button>
                    <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="banner">Banner 圖片</Label>
                  <div className="flex flex-col space-y-2">
                    {bannerPreview && (
                      <div className="relative w-full h-32 border rounded-md overflow-hidden">
                        <img src={bannerPreview || "/placeholder.svg"} alt="Banner 預覽" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <Button type="button" variant="outline" onClick={() => bannerInputRef.current?.click()} className="w-fit">
                      <ImagePlus className="h-4 w-4 mr-2" />
                      上傳 Banner
                    </Button>
                    <input ref={bannerInputRef} type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                  </div>
                </div>
              </div>
              <Button onClick={handleUpdateStoreInfo}>儲存變更</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 商品管理 */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>商品管理</CardTitle>
                <CardDescription>管理店家商品</CardDescription>
              </div>
              <Button onClick={() => setIsAddProductDialogOpen(true)}>
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
                      <TableHead>數量</TableHead>
                      <TableHead>到期時間</TableHead>
                      <TableHead>狀態</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.length > 0 ? (
                      products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.category}</TableCell>
                          <TableCell>${product.originalPrice}</TableCell>
                          <TableCell>${product.discountPrice}</TableCell>
                          <TableCell>{product.quantity}</TableCell>
                          <TableCell>{formatDateTime(product.expiryTime as any)}</TableCell>
                          <TableCell>
                            {product.isListed ? (
                              <Badge variant="outline" className="bg-green-100 text-green-800">已上架</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-100 text-gray-800">未上架</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedProduct(product)
                                  setProductForm({
                                    name: product.name,
                                    description: (product as any).description,
                                    originalPrice: product.originalPrice,
                                    discountPrice: product.discountPrice,
                                    category: (product as any).category,
                                    quantity: product.quantity,
                                    expiryTime: (product as any).expiryTime || "",
                                    isListed: product.isListed,
                                  })
                                  setIsEditProductDialogOpen(true)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(product.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-4">
                          尚無商品資料
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* 新增商品對話框 */}
          <Dialog open={isAddProductDialogOpen} onOpenChange={setIsAddProductDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新增商品</DialogTitle>
                <DialogDescription>請填寫新商品的資料</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="product-name">商品名稱</Label>
                    <Input id="product-name" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product-category">商品分類</Label>
                    <Input id="product-category" value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product-description">商品描述</Label>
                  <Textarea id="product-description" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="product-original-price">原價</Label>
                    <Input id="product-original-price" type="number" value={productForm.originalPrice} onChange={(e) => setProductForm({ ...productForm, originalPrice: Number.parseFloat(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product-discount-price">特價</Label>
                    <Input id="product-discount-price" type="number" value={productForm.discountPrice} onChange={(e) => setProductForm({ ...productForm, discountPrice: Number.parseFloat(e.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="product-quantity">數量</Label>
                    <Input id="product-quantity" type="number" value={productForm.quantity} onChange={(e) => setProductForm({ ...productForm, quantity: Number.parseInt(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product-expiry">到期時間</Label>
                    <Input id="product-expiry" type="datetime-local" value={productForm.expiryTime} onChange={(e) => setProductForm({ ...productForm, expiryTime: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product-status">商品狀態</Label>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <input type="radio" id="status-active" name="status" checked={productForm.isListed} onChange={() => setProductForm({ ...productForm, isListed: true })} className="h-4 w-4" />
                      <Label htmlFor="status-active" className="cursor-pointer">上架</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="radio" id="status-inactive" name="status" checked={!productForm.isListed} onChange={() => setProductForm({ ...productForm, isListed: false })} className="h-4 w-4" />
                      <Label htmlFor="status-inactive" className="cursor-pointer">下架</Label>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddProductDialogOpen(false)}>取消</Button>
                <Button onClick={handleAddProduct}>新增</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 編輯商品對話框 */}
          <Dialog open={isEditProductDialogOpen} onOpenChange={setIsEditProductDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>編輯商品</DialogTitle>
                <DialogDescription>修改商品資料</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-product-name">商品名稱</Label>
                    <Input id="edit-product-name" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-product-category">商品分類</Label>
                    <Input id="edit-product-category" value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-product-description">商品描述</Label>
                  <Textarea id="edit-product-description" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-product-original-price">原價</Label>
                    <Input id="edit-product-original-price" type="number" value={productForm.originalPrice} onChange={(e) => setProductForm({ ...productForm, originalPrice: Number.parseFloat(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-product-discount-price">特價</Label>
                    <Input id="edit-product-discount-price" type="number" value={productForm.discountPrice} onChange={(e) => setProductForm({ ...productForm, discountPrice: Number.parseFloat(e.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-product-quantity">數量</Label>
                    <Input id="edit-product-quantity" type="number" value={productForm.quantity} onChange={(e) => setProductForm({ ...productForm, quantity: Number.parseInt(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-product-expiry">到期時間</Label>
                    <Input id="edit-product-expiry" type="datetime-local" value={productForm.expiryTime} onChange={(e) => setProductForm({ ...productForm, expiryTime: e.target.value })} />
                    <p className="text-xs text-muted-foreground">目前設定: {formatDateTime(productForm.expiryTime)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-product-status">商品狀態</Label>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <input type="radio" id="edit-status-active" name="edit-status" checked={productForm.isListed} onChange={() => setProductForm({ ...productForm, isListed: true })} className="h-4 w-4" />
                      <Label htmlFor="edit-status-active" className="cursor-pointer">上架</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="radio" id="edit-status-inactive" name="edit-status" checked={!productForm.isListed} onChange={() => setProductForm({ ...productForm, isListed: false })} className="h-4 w-4" />
                      <Label htmlFor="edit-status-inactive" className="cursor-pointer">下架</Label>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditProductDialogOpen(false)}>取消</Button>
                <Button onClick={handleEditProduct}>儲存變更</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* 訂單管理 */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>訂單管理</CardTitle>
              <CardDescription>管理店家訂單</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>訂單編號</TableHead>
                      <TableHead>顧客</TableHead>
                      <TableHead>商品數量</TableHead>
                      <TableHead>總金額</TableHead>
                      <TableHead>狀態</TableHead>
                      <TableHead>日期</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.length > 0 ? (
                      orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.id}</TableCell>
                          <TableCell>顧客{order.userId}</TableCell>
                          <TableCell>{order.items.length} 件商品</TableCell>
                          <TableCell>${order.total}</TableCell>
                          <TableCell>{getOrderStatusBadge(order.status)}</TableCell>
                          <TableCell>{formatDateTime(order.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/admin/orders/${order.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                查看詳情
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          尚無訂單資料
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
