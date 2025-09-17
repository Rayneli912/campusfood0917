"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useStoreAuth } from "@/components/store-auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  getFoodItemsByStoreId,
  updateFoodItem,
  addFoodItem,
  deleteFoodItem,
  setFoodItemListed,
} from "@/lib/food-item-service"
import { PlusCircle, Edit, Trash2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { format, addHours } from "date-fns"
import { cn } from "@/lib/utils"
import { syncFoodItems } from "@/lib/sync-service"

/** 內部工具：把任意字串正規化為 YYYY-MM-DDTHH:mm:ss；失敗回空字串 */
function normalizeDateTimeInput(value: string): string {
  if (!value) return ""
  let v = value.trim().replace(" ", "T")
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) v = `${v}:00`
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(v)) {
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return ""
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

/** 顯示用時間格式（YYYY/MM/DD HH:mm:ss），若無法解析回「-」 */
function formatExpiryTime(expiryTime: string) {
  const v = normalizeDateTimeInput(expiryTime)
  if (!v) return "-"
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return "-"
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  const ss = String(d.getSeconds()).padStart(2, "0")
  return `${y}/${m}/${day} ${hh}:${mm}:${ss}`
}

/** 預設商品（到期時間改為穩定的 ISO 格式） */
const defaultProducts = {
  store1: [
    {
      id: "store1-item1",
      storeId: "store1",
      name: "日式咖哩飯",
      description: "香濃咖哩搭配Q彈米飯",
      originalPrice: 60,
      discountPrice: 45,
      image: "/japanese-curry.png",
      category: "主食",
      expiryTime: format(addHours(new Date(), 3), "yyyy-MM-dd'T'HH:mm:ss"),
      quantity: 5,
      isListed: true,
    },
    {
      id: "store1-item2",
      storeId: "store1",
      name: "玉米濃湯",
      description: "香甜玉米搭配濃郁奶香",
      originalPrice: 30,
      discountPrice: 20,
      image: "/creamy-corn-soup.png",
      category: "湯品",
      expiryTime: format(addHours(new Date(), 2), "yyyy-MM-dd'T'HH:mm:ss"),
      quantity: 3,
      isListed: true,
    },
    {
      id: "store1-item3",
      storeId: "store1",
      name: "炸雞塊",
      description: "外酥內嫩，香脆可口",
      originalPrice: 50,
      discountPrice: 35,
      image: "/placeholder.svg?height=100&width=100&text=炸雞塊",
      category: "點心",
      expiryTime: format(addHours(new Date(), 4), "yyyy-MM-dd'T'HH:mm:ss"),
      quantity: 8,
      isListed: true,
    },
  ],
  store2: [
    {
      id: "store2-item1",
      storeId: "store2",
      name: "經典起司堡",
      description: "多汁牛肉搭配香濃起司",
      originalPrice: 80,
      discountPrice: 60,
      image: "/classic-cheeseburger.png",
      category: "主食",
      expiryTime: format(addHours(new Date(), 2), "yyyy-MM-dd'T'HH:mm:ss"),
      quantity: 2,
      isListed: true,
    },
    {
      id: "store2-item2",
      storeId: "store2",
      name: "香脆薯條",
      description: "酥脆金黃，經典美味",
      originalPrice: 40,
      discountPrice: 30,
      image: "/crispy-french-fries.png",
      category: "點心",
      expiryTime: format(addHours(new Date(), 3), "yyyy-MM-dd'T'HH:mm:ss"),
      quantity: 4,
      isListed: true,
    },
    {
      id: "store2-item3",
      storeId: "store2",
      name: "巧克力奶昔",
      description: "濃郁巧克力，冰涼暢快",
      originalPrice: 50,
      discountPrice: 40,
      image: "/chocolate-milkshake.png",
      category: "飲料",
      expiryTime: format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm:ss"),
      quantity: 3,
      isListed: true,
    },
  ],
  store3: [
    {
      id: "store3-item1",
      storeId: "store3",
      name: "拿鐵咖啡",
      description: "香濃咖啡搭配絲滑奶泡",
      originalPrice: 45,
      discountPrice: 35,
      image: "/placeholder.svg?height=100&width=100&text=拿鐵咖啡",
      category: "飲料",
      expiryTime: format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm:ss"),
      quantity: 6,
      isListed: true,
    },
    {
      id: "store3-item2",
      storeId: "store3",
      name: "提拉米蘇",
      description: "經典義式甜點，口感綿密",
      originalPrice: 60,
      discountPrice: 45,
      image: "/placeholder.svg?height=100&width=100&text=提拉米蘇",
      category: "甜點",
      expiryTime: format(addHours(new Date(), 2), "yyyy-MM-dd'T'HH:mm:ss"),
      quantity: 4,
      isListed: true,
    },
    {
      id: "store3-item3",
      storeId: "store3",
      name: "水果鬆餅",
      description: "新鮮水果搭配香甜鬆餅",
      originalPrice: 70,
      discountPrice: 55,
      image: "/placeholder.svg?height=100&width=100&text=水果鬆餅",
      category: "甜點",
      expiryTime: format(addHours(new Date(), 3), "yyyy-MM-dd'T'HH:mm:ss"),
      quantity: 3,
      isListed: true,
    },
  ],
}

export default function StoreProductsPage() {
  const { account } = useStoreAuth()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const [isMobile, setIsMobile] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentProduct, setCurrentProduct] = useState<any>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")

  // 檢測螢幕尺寸
  useEffect(() => {
    const checkScreenSize = () => setIsMobile(window.innerWidth < 768)
    checkScreenSize()
    window.addEventListener("resize", checkScreenSize)
    return () => window.removeEventListener("resize", checkScreenSize)
  }, [])

  // 新增商品表單狀態（時間改為 ISO 格式）
  const [newProduct, setNewProduct] = useState({
    name: "",
    originalPrice: "",
    discountPrice: "",
    expiryTime: format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm:ss"),
    quantity: "",
    image: "",
  })

  // 載入商品資料
  useEffect(() => {
    if (!account) {
      setLoading(false)
      return
    }

    const load = async () => {
      try {
        setLoading(true)
        let storeProducts = await getFoodItemsByStoreId(account.storeId)

        // 如果沒有商品資料，使用預設商品並寫入
        if (!Array.isArray(storeProducts) || storeProducts.length === 0) {
          const seed = (defaultProducts as any)[account.storeId] as any[] | undefined
          if (Array.isArray(seed) && seed.length > 0) {
            await Promise.all(seed.map((p) => addFoodItem(account.storeId, p)))
            toast({ title: "已載入預設商品", description: "系統已為您載入預設商品資料" })
            storeProducts = await getFoodItemsByStoreId(account.storeId)
          }
        }

        setProducts(Array.isArray(storeProducts) ? storeProducts : [])
      } catch (error) {
        console.error("Error loading products:", error)
        toast({ title: "載入失敗", description: "無法載入商品資料，請稍後再試", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }

    load()

    // 商品更新事件（foodItemsUpdated）
    const onFoodItemsUpdated = async (ev: any) => {
      const sId = ev?.detail?.storeId
      if (!account || (sId && sId !== account.storeId)) return
      const list = await getFoodItemsByStoreId(account.storeId)
      setProducts(Array.isArray(list) ? list : [])
    }

    // 庫存更新事件（inventoryUpdated）
    const onInventoryUpdated = async (ev: any) => {
      const sId = ev?.detail?.storeId
      if (!account || (sId && sId !== account.storeId)) return
      const list = await getFoodItemsByStoreId(account.storeId)
      setProducts(Array.isArray(list) ? list : [])
    }

    window.addEventListener("foodItemsUpdated", onFoodItemsUpdated as EventListener)
    window.addEventListener("inventoryUpdated", onInventoryUpdated as EventListener)
    return () => {
      window.removeEventListener("foodItemsUpdated", onFoodItemsUpdated as EventListener)
      window.removeEventListener("inventoryUpdated", onInventoryUpdated as EventListener)
    }
  }, [account, toast])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewProduct((prev) => ({ ...prev, [name]: value }))
  }

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCurrentProduct((prev: any) => ({ ...prev, [name]: value }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = () => setImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => setCurrentProduct((prev: any) => ({ ...prev, image: reader.result as string }))
      reader.readAsDataURL(file)
    }
  }

  // 新增商品（await + 刷新；與 service 簽名一致）
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account) return

    if (!newProduct.name || !newProduct.discountPrice || !newProduct.quantity) {
      toast({ title: "表單不完整", description: "請填寫所有必填欄位", variant: "destructive" })
      return
    }

    const formattedExpiryTime =
      normalizeDateTimeInput(newProduct.expiryTime) ||
      format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm:ss")

    const newProductObj = {
      id: `item${Date.now()}`,
      storeId: account.storeId,
      name: newProduct.name,
      description: "",
      originalPrice: Number.parseFloat(newProduct.originalPrice) || 0,
      discountPrice: Number.parseFloat(newProduct.discountPrice),
      image:
        imagePreview ||
        newProduct.image ||
        `/placeholder.svg?height=100&width=100&text=${encodeURIComponent(newProduct.name)}`,
      category: "主食",
      expiryTime: formattedExpiryTime,
      quantity: Number.parseInt(newProduct.quantity),
      isListed: true,
    }

    await addFoodItem(account.storeId, newProductObj)
    syncFoodItems(account.storeId)

    const list = await getFoodItemsByStoreId(account.storeId)
    setProducts(Array.isArray(list) ? list : [])

    setNewProduct({
      name: "",
      originalPrice: "",
      discountPrice: "",
      expiryTime: format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm:ss"),
      quantity: "",
      image: "",
    })
    setImageFile(null)
    setImagePreview("")
    toast({ title: "新增成功", description: `商品 ${newProduct.name} 已成功新增` })
  }

  // 刪除商品（await + 刷新；與 service 簽名一致）
  const handleDeleteProduct = async (id: string, name: string) => {
    if (!account) return
    await deleteFoodItem(account.storeId, id)
    syncFoodItems(account.storeId)
    const list = await getFoodItemsByStoreId(account.storeId)
    setProducts(Array.isArray(list) ? list : [])
    toast({ title: "刪除成功", description: `商品 ${name} 已成功刪除` })
  }

  // 上/下架
  const handleToggleProductListing = async (id: string, isListed: boolean, name: string) => {
    if (!account) return
    await setFoodItemListed(account.storeId, id, !isListed)
    syncFoodItems(account.storeId)
    const list = await getFoodItemsByStoreId(account.storeId)
    setProducts(Array.isArray(list) ? list : [])
    toast({ title: isListed ? "商品已下架" : "商品已上架", description: `${name} 已${isListed ? "下架" : "上架"}` })
  }

  // 編輯商品
  const handleEditProduct = async () => {
    if (!account || !currentProduct) return

    if (!currentProduct.name || !currentProduct.discountPrice || !currentProduct.quantity) {
      toast({ title: "表單不完整", description: "請填寫所有必填欄位", variant: "destructive" })
      return
    }

    await updateFoodItem(account.storeId, currentProduct.id, {
      name: currentProduct.name,
      originalPrice: Number.parseFloat(currentProduct.originalPrice) || 0,
      discountPrice: Number.parseFloat(currentProduct.discountPrice),
      expiryTime: normalizeDateTimeInput(currentProduct.expiryTime),
      quantity: Number.parseInt(currentProduct.quantity),
      image: currentProduct.image,
      isListed: currentProduct.isListed,
    })

    syncFoodItems(account.storeId)

    const list = await getFoodItemsByStoreId(account.storeId)
    setProducts(Array.isArray(list) ? list : [])

    setIsEditDialogOpen(false)
    const savedName = currentProduct.name
    setCurrentProduct(null)
    toast({ title: "更新成功", description: `商品 ${savedName} 已成功更新` })
  }

  // 日期/時間控制（改為 ISO 拆解）
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const datePart = e.target.value // YYYY-MM-DD
    const timePart = newProduct.expiryTime.slice(11, 19) || "00:00:00"
    setNewProduct((prev) => ({ ...prev, expiryTime: `${datePart}T${timePart}` }))
  }
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = e.target.value // HH:mm
    const datePart = newProduct.expiryTime.slice(0, 10)
    const timeWithSec = t && t.length === 5 ? `${t}:00` : t
    setNewProduct((prev) => ({ ...prev, expiryTime: `${datePart}T${timeWithSec}` }))
  }
  const handleEditDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentProduct) return
    const datePart = e.target.value
    const timePart = (normalizeDateTimeInput(currentProduct.expiryTime) || "").slice(11, 19) || "00:00:00"
    setCurrentProduct((prev: any) => ({ ...prev, expiryTime: `${datePart}T${timePart}` }))
  }
  const handleEditTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentProduct) return
    const t = e.target.value
    const datePart = (normalizeDateTimeInput(currentProduct.expiryTime) || "").slice(0, 10)
    const timeWithSec = t && t.length === 5 ? `${t}:00` : t
    setCurrentProduct((prev: any) => ({ ...prev, expiryTime: `${datePart}T${timeWithSec}` }))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>

        <Skeleton className="h-10 w-full" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h2 className="text-2xl font-bold mb-4">請先登入</h2>
        <p className="text-muted-foreground mb-6">您需要登入才能管理商品</p>
        <Button asChild>
          <a href="/login?tab=store">前往登入</a>
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", isMobile && "pb-20")}>
      <div>
        <h1 className="text-3xl font-bold">商品管理</h1>
        <p className="text-muted-foreground mt-1">管理您的商品清單和優惠</p>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">商品列表</TabsTrigger>
          <TabsTrigger value="add">新增商品</TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-6">
          {products.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium mb-2">尚無商品</h3>
              <p className="text-muted-foreground mb-4">您還沒有新增任何商品</p>
              <Button onClick={() => document.querySelector('[data-value="add"]')?.click()}>
                <PlusCircle className="h-4 w-4 mr-2" />
                新增商品
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {products.map((product) => (
                <Card key={product.id} className={!product.isListed ? "opacity-60" : ""}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="relative h-40 w-full bg-muted rounded-md overflow-hidden">
                      <Image
                        src={product.image || "/placeholder.svg"}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                      {!product.isListed && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">已下架</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm font-medium">原價: ${product.originalPrice}</p>
                        <p className="text-sm font-medium text-green-600">特價: ${product.discountPrice}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">庫存: {product.quantity}</p>
                        <p className="text-sm">{formatExpiryTime(product.expiryTime)}</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={product.isListed}
                          onCheckedChange={() => handleToggleProductListing(product.id, product.isListed, product.name)}
                          id={`listing-${product.id}`}
                        />
                        <Label htmlFor={`listing-${product.id}`} className="text-sm">
                          {product.isListed ? "已上架" : "已下架"}
                        </Label>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => {
                        setCurrentProduct(product)
                        setIsEditDialogOpen(true)
                      }}>
                        <Edit className="h-4 w-4 mr-1" />
                        編輯
                      </Button>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => handleDeleteProduct(product.id, product.name)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      刪除
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="add" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>新增商品</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">商品名稱 *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="輸入商品名稱"
                    value={newProduct.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="originalPrice">原價</Label>
                    <Input
                      id="originalPrice"
                      name="originalPrice"
                      type="number"
                      placeholder="原始價格"
                      value={newProduct.originalPrice}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discountPrice">特價 *</Label>
                    <Input
                      id="discountPrice"
                      name="discountPrice"
                      type="number"
                      placeholder="優惠價格"
                      value={newProduct.discountPrice}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">數量 *</Label>
                    <Input
                      id="quantity"
                      name="quantity"
                      type="number"
                      placeholder="可售數量"
                      value={newProduct.quantity}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiryTime">到期時間 *</Label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={newProduct.expiryTime.slice(0, 10)}
                        onChange={handleDateChange}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Input
                        type="time"
                        value={newProduct.expiryTime.slice(11, 16)}
                        onChange={handleTimeChange}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">目前設定: {formatExpiryTime(newProduct.expiryTime)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image">商品圖片</Label>
                  <div className="flex flex-col space-y-2">
                    {imagePreview && (
                      <div className="relative w-32 h-32 border rounded-md overflow-hidden">
                        <img
                          src={imagePreview || "/placeholder.svg"}
                          alt="預覽圖片"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Input id="image" type="file" accept="image/*" onChange={handleImageChange} className="flex-1" />
                    </div>
                    <p className="text-xs text-muted-foreground">若不上傳圖片，將使用預設圖片</p>
                  </div>
                </div>
                <div className="pt-4">
                  <Button type="submit" className="w-full">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    新增商品
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 編輯商品對話框 */}
      {currentProduct && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>編輯商品</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">商品名稱 *</Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={currentProduct.name}
                  onChange={handleEditInputChange}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-originalPrice">原價</Label>
                  <Input
                    id="edit-originalPrice"
                    name="originalPrice"
                    type="number"
                    value={currentProduct.originalPrice}
                    onChange={handleEditInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-discountPrice">特價 *</Label>
                  <Input
                    id="edit-discountPrice"
                    name="discountPrice"
                    type="number"
                    value={currentProduct.discountPrice}
                    onChange={handleEditInputChange}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-quantity">數量 *</Label>
                  <Input
                    id="edit-quantity"
                    name="quantity"
                    type="number"
                    value={currentProduct.quantity}
                    onChange={handleEditInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-expiryTime">到期時間 *</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={(normalizeDateTimeInput(currentProduct.expiryTime) || "").slice(0, 10)}
                      onChange={handleEditDateChange}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Input
                      type="time"
                      value={(normalizeDateTimeInput(currentProduct.expiryTime) || "").slice(11, 16)}
                      onChange={handleEditTimeChange}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">目前設定: {formatExpiryTime(currentProduct.expiryTime)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-image">商品圖片</Label>
                <div className="flex flex-col space-y-2">
                  {currentProduct.image && (
                    <div className="relative w-32 h-32 border rounded-md overflow-hidden">
                      <img
                        src={currentProduct.image || "/placeholder.svg"}
                        alt="商品圖片"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      id="edit-image"
                      type="file"
                      accept="image/*"
                      onChange={handleEditImageChange}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isListed"
                  checked={currentProduct.isListed}
                  onCheckedChange={(checked) => setCurrentProduct({ ...currentProduct, isListed: checked })}
                />
                <Label htmlFor="edit-isListed">{currentProduct.isListed ? "已上架" : "已下架"}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleEditProduct}>儲存變更</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
