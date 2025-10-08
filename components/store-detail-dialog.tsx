"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Store, Edit, Trash2, Plus, Save, Upload, Eye, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  getStoreById,
  getFoodItemsByStoreId,
  getOrdersByStoreId,
  updateStoreInfo,
  addFoodItem,
  updateFoodItem,
  deleteFoodItem,
  updateOrderStatus as updateOrderStatusAPI, // ← 避免與本檔的 local 函式同名衝突
} from "@/lib/data"
import { syncFoodItems, syncStoreInfo, syncOrderStatus } from "@/lib/sync-service"
import { AdminOrderDetailDialog } from "./admin-order-detail-dialog"

interface StoreDetailDialogProps {
  isOpen: boolean
  onClose: () => void
  storeId: string
  onEdit?: (storeId: string) => void
  onUpdate?: () => void
}

export function StoreDetailDialog({ isOpen, onClose, storeId, onUpdate }: StoreDetailDialogProps) {
  const { toast } = useToast()
  const [store, setStore] = useState<any | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [activeOrders, setActiveOrders] = useState<any[]>([])
  const [completedOrders, setCompletedOrders] = useState<any[]>([])
  const [salesData, setSalesData] = useState<any>({
    today: { amount: 0, count: 0 },
    week: { amount: 0, count: 0 },
    month: { amount: 0, count: 0 },
  })
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // 訂單詳情對話框
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)

  // 編輯店家資訊相關狀態
  const [isEditingStore, setIsEditingStore] = useState(false)
  const [storeForm, setStoreForm] = useState({
    name: "",
    description: "",
    category: "",
    location: "",
    contact: "",
    email: "",
    openTime: "",
    closeTime: "",
    status: "active",
    username: "",
    password: "",
  })

  // 商品管理相關狀態
  const [isAddingProduct, setIsAddingProduct] = useState(false)
  const [isEditingProduct, setIsEditingProduct] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
  const [productForm, setProductForm] = useState({
    id: "",
    name: "",
    description: "",
    originalPrice: 0,
    discountPrice: 0,
    category: "",
    quantity: 1,
    expiryTime: "",
    isListed: true,
    image: "",
  })
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)

  // 圖片上傳相關
  const logoInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const productImageRef = useRef<HTMLInputElement>(null)
  const [logoPreview, setLogoPreview] = useState<string>("")
  const [bannerPreview, setBannerPreview] = useState<string>("")
  const [productImagePreview, setProductImagePreview] = useState<string>("")

  // 載入店家資料
  const loadStoreData = useCallback(async () => {
    try {
      setLoading(true)

      // 獲取店家資料
      const storeData = await getStoreById(storeId)

      if (storeData) {
        setStore({
          ...storeData,
          // 添加預設值
          businessHours: storeData.businessHours || {
            monday: { open: "08:00", close: "21:00" },
            tuesday: { open: "08:00", close: "21:00" },
            wednesday: { open: "08:00", close: "21:00" },
            thursday: { open: "08:00", close: "21:00" },
            friday: { open: "08:00", close: "21:00" },
            saturday: { open: "08:00", close: "21:00" },
            sunday: { open: "08:00", close: "21:00" }
          },
          notificationSettings: storeData.notificationSettings || {
            email: true,
            push: true,
            orderUpdates: true,
            promotions: false
          },
          paymentMethods: storeData.paymentMethods || {
            cash: true,
            creditCard: false,
            linePay: false,
            jkoPay: false
          },
          deliveryOptions: storeData.deliveryOptions || {
            pickup: true,
            delivery: false
          }
        })

        // 從各個存儲位置獲取最新資料
        const products = JSON.parse(localStorage.getItem(`store_${storeId}_products`) || "[]")
        const orders = JSON.parse(localStorage.getItem("orders") || "[]")
        
        // 過濾該店家的訂單
        const storeOrders = orders.filter((order: any) => order.storeId === storeId)
        const activeOrders = storeOrders.filter((order: any) => 
          ["pending", "accepted", "prepared"].includes(order.status)
        )
        const completedOrders = storeOrders.filter((order: any) => 
          ["completed", "cancelled", "rejected"].includes(order.status)
        )

        setProducts(products)
        setOrders(storeOrders)
        setActiveOrders(activeOrders)
        setCompletedOrders(completedOrders)

        // 計算銷售數據
        calculateSalesData(storeOrders)
        calculateTopProducts(storeOrders)
      }
    } catch (error) {
      console.error("載入店家資料失敗:", error)
      toast({
        title: "載入失敗",
        description: "無法載入店家資料，請稍後再試",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [storeId])

  // 監聽數據變化
  useEffect(() => {
    if (isOpen && storeId) {
      loadStoreData()

      const handleStorageChange = (e: StorageEvent) => {
        // 監聽所有相關的存儲變化
        const relevantKeys = [
          "registeredStores",
          `store_${storeId}_products`,
          "orders",
          `store_${storeId}_info`
        ]

        if (e.key && relevantKeys.includes(e.key)) {
          loadStoreData()
        }
      }

      // 設置定期刷新
      const refreshInterval = setInterval(loadStoreData, 5000)

      // 監聽自定義事件
      const handleCustomEvent = (event: CustomEvent) => {
        if (event.detail?.storeId === storeId || !event.detail?.storeId) {
          loadStoreData()
        }
      }

      window.addEventListener("storage", handleStorageChange)
      window.addEventListener("storeDataUpdated", handleCustomEvent as EventListener)
      window.addEventListener("orderStatusUpdated", handleCustomEvent as EventListener)
      window.addEventListener("productsUpdated", handleCustomEvent as EventListener)
      window.addEventListener("inventoryUpdated", handleCustomEvent as EventListener)

      return () => {
        window.removeEventListener("storage", handleStorageChange)
        window.removeEventListener("storeDataUpdated", handleCustomEvent as EventListener)
        window.removeEventListener("orderStatusUpdated", handleCustomEvent as EventListener)
        window.removeEventListener("productsUpdated", handleCustomEvent as EventListener)
        window.removeEventListener("inventoryUpdated", handleCustomEvent as EventListener)
        clearInterval(refreshInterval)
      }
    }
  }, [isOpen, storeId, loadStoreData])

  const calculateSalesData = (orders: any[]) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const weekAgo = today - 7 * 24 * 60 * 60 * 1000
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).getTime()

    const completedOrders = orders.filter((o: any) => o.status === "completed")

    const todayOrders = completedOrders.filter((o: any) => new Date(o.createdAt).getTime() >= today)
    const weekOrders = completedOrders.filter((o: any) => new Date(o.createdAt).getTime() >= weekAgo)
    const monthOrders = completedOrders.filter((o: any) => new Date(o.createdAt).getTime() >= monthAgo)

    setSalesData({
      today: {
        amount: todayOrders.reduce((sum: number, order: any) => sum + order.total, 0),
        count: todayOrders.length,
      },
      week: {
        amount: weekOrders.reduce((sum: number, order: any) => sum + order.total, 0),
        count: weekOrders.length,
      },
      month: {
        amount: monthOrders.reduce((sum: number, order: any) => sum + order.total, 0),
        count: monthOrders.length,
      },
    })
  }

  const calculateTopProducts = (orders: any[]) => {
    const productMap = new Map()

    // 統計每個商品的銷售數量
    orders.forEach((order: any) => {
      if (order.status === "completed") {
        order.items.forEach((item: any) => {
          const key = item.id
          if (productMap.has(key)) {
            const product = productMap.get(key)
            product.quantity += item.quantity
            product.revenue += item.price * item.quantity
          } else {
            productMap.set(key, {
              id: item.id,
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              revenue: item.price * item.quantity,
            })
          }
        })
      }
    })

    // 轉換為陣列並排序
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)

    setTopProducts(topProducts)
  }

  // 處理店家資訊編輯
  const handleStoreFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setStoreForm((prev) => ({ ...prev, [name]: value }))
  }

  // 更新店家資料
  const updateStoreData = async (updates: Partial<any>) => {
    try {
      const updatedStore = { ...store, ...updates }
      
      // 更新 localStorage 中的店家資料
      localStorage.setItem(`store_${storeId}_data`, JSON.stringify(updatedStore))

      // 如果店家當前已登入，同時更新 currentStore
      const currentStore = localStorage.getItem("currentStore")
      if (currentStore) {
        const storeData = JSON.parse(currentStore)
        if (storeData.id === storeId) {
          localStorage.setItem("currentStore", JSON.stringify(updatedStore))
        }
      }

      // 更新註冊店家列表中的店家資料
      const storedStores = localStorage.getItem("registeredStores")
      if (storedStores) {
        const stores = JSON.parse(storedStores)
        const storeIndex = stores.findIndex((s: any) => s.id === storeId)
        if (storeIndex !== -1) {
          stores[storeIndex] = updatedStore
          localStorage.setItem("registeredStores", JSON.stringify(stores))
        }
      }

      setStore(updatedStore)
      toast({
        title: "更新成功",
        description: "店家資料已更新",
      })

      // 觸發自定義事件通知其他組件
      window.dispatchEvent(new CustomEvent("storeDataUpdated", {
        detail: { storeId, data: updatedStore }
      }))

      // 通知父組件更新
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error("更新店家資料時發生錯誤:", error)
      toast({
        title: "錯誤",
        description: "更新店家資料時發生錯誤",
        variant: "destructive",
      })
    }
  }

  // 更新商品資料
  const updateProducts = async (newProducts: any[]) => {
    try {
      localStorage.setItem(`store_${storeId}_products`, JSON.stringify(newProducts))
      setProducts(newProducts)

      // 觸發商品更新事件
      window.dispatchEvent(new CustomEvent("productsUpdated", {
        detail: { storeId, products: newProducts }
      }))

      toast({
        title: "更新成功",
        description: "商品資料已更新",
      })
    } catch (error) {
      console.error("更新商品資料時發生錯誤:", error)
      toast({
        title: "錯誤",
        description: "更新商品資料時發生錯誤",
        variant: "destructive",
      })
    }
  }

  // 本地更新訂單狀態（避免與 API 名稱衝突）
  const updateOrderStatusLocal = async (orderId: string, newStatus: string, reason?: string) => {
    try {
      const orders = JSON.parse(localStorage.getItem("orders") || "[]")
      const orderIndex = orders.findIndex((o: any) => o.id === orderId)
      
      if (orderIndex !== -1) {
        orders[orderIndex].status = newStatus
        if (reason) { orders[orderIndex].statusReason = reason }
        localStorage.setItem("orders", JSON.stringify(orders))
        
        // 重新載入訂單資料
        loadStoreData()

        // 觸發訂單狀態更新事件
        window.dispatchEvent(new CustomEvent("orderStatusUpdated", {
          detail: { orderId, status: newStatus, reason }
        }))

        toast({ title: "更新成功", description: "訂單狀態已更新" })
        return true
      }
      return false
    } catch (error) {
      console.error("更新訂單狀態時發生錯誤:", error)
      toast({ title: "錯誤", description: "更新訂單狀態時發生錯誤", variant: "destructive" })
      return false
    }
  }

  // 修改店家資訊表單處理
  const handleStoreFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateStoreData(storeForm)
    setIsEditingStore(false)
  }

  // 圖片上傳處理
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => { const result = e.target?.result as string; setLogoPreview(result) }
      reader.readAsDataURL(file)
    }
  }

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => { const result = e.target?.result as string; setBannerPreview(result) }
      reader.readAsDataURL(file)
    }
  }

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setProductImagePreview(result)
        setProductForm((prev) => ({ ...prev, image: result }))
      }
      reader.readAsDataURL(file)
    }
  }

  // 處理商品表單變更
  const handleProductFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    if (type === "number") { setProductForm((prev) => ({ ...prev, [name]: Number.parseFloat(value) })) }
    else { setProductForm((prev) => ({ ...prev, [name]: value })) }
  }

  // 修改商品表單處理
  const handleProductFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isEditingProduct && selectedProduct) {
      // 更新現有商品
      const updatedProducts = products.map(product =>
        product.id === selectedProduct.id ? { ...product, ...productForm } : product
      )
      await updateProducts(updatedProducts)
    } else {
      // 添加新商品
      const newProduct = {
        id: `product_${Date.now()}`,
        storeId,
        ...productForm,
        createdAt: new Date().toISOString(),
      }
      await updateProducts([...products, newProduct])
    }

    setIsAddingProduct(false)
    setIsEditingProduct(false)
    setSelectedProduct(null)
    setProductForm({
      name: "",
      description: "",
      originalPrice: 0,
      discountPrice: 0,
      category: "",
      quantity: 1,
      expiryTime: "",
      isListed: true,
      image: "",
    })
  }

  // 處理商品狀態變更
  const handleProductStatusChange = (isListed: boolean) => {
    setProductForm((prev) => ({ ...prev, isListed }))
  }

  // 新增商品
  const handleAddProduct = () => {
    // 基本驗證
    if (!productForm.name || !productForm.description || productForm.originalPrice <= 0 || productForm.discountPrice <= 0) {
      toast({ title: "新增失敗", description: "請填寫所有必填欄位", variant: "destructive" })
      return
    }

    // 確保到期時間包含秒數
    const expiryTime =
      productForm.expiryTime.includes(":") && productForm.expiryTime.split(":").length === 2
        ? `${productForm.expiryTime}:00`
        : productForm.expiryTime || new Date().toISOString().split("T")[0] + " 23:59:00"

    // 建立新商品
    const newProduct = {
      id: `item${Date.now()}`,
      storeId: storeId,
      name: productForm.name,
      description: productForm.description,
      originalPrice: productForm.originalPrice,
      discountPrice: productForm.discountPrice,
      image: productForm.image || `/placeholder.svg?height=100&width=100&text=${encodeURIComponent(productForm.name)}`,
      category: productForm.category,
      expiryTime: expiryTime,
      quantity: productForm.quantity,
      isListed: productForm.isListed,
    }

    // 新增商品
    addFoodItem(newProduct)
    syncFoodItems(storeId)

    // 更新商品列表
    setProducts([...products, newProduct])

    // 重置表單
    setProductForm({
      id: "",
      name: "",
      description: "",
      originalPrice: 0,
      discountPrice: 0,
      category: "",
      quantity: 1,
      expiryTime: "",
      isListed: true,
      image: "",
    })
    setProductImagePreview("")
    setIsAddingProduct(false)

    toast({ title: "新增成功", description: `已新增商品 ${productForm.name}` })

    // 通知父組件更新
    if (onUpdate) onUpdate()
  }

  // 編輯商品
  const handleEditProduct = (product: any) => {
    setSelectedProduct(product)
    setProductForm({
      id: product.id,
      name: product.name,
      description: product.description,
      originalPrice: product.originalPrice,
      discountPrice: product.discountPrice,
      category: product.category,
      quantity: product.quantity,
      expiryTime: product.expiryTime,
      isListed: product.isListed,
      image: product.image,
    })
    setProductImagePreview(product.image)
    setIsEditingProduct(true)
  }

  // 保存編輯的商品
  const handleSaveProduct = () => {
    if (!selectedProduct) return

    // 基本驗證
    if (!productForm.name || !productForm.description || productForm.originalPrice <= 0 || productForm.discountPrice <= 0) {
      toast({ title: "編輯失敗", description: "請填寫所有必填欄位", variant: "destructive" })
      return
    }

    // 更新商品
    const updatedProduct = {
      ...selectedProduct,
      name: productForm.name,
      description: productForm.description,
      originalPrice: productForm.originalPrice,
      discountPrice: productForm.discountPrice,
      category: productForm.category,
      expiryTime: productForm.expiryTime || selectedProduct.expiryTime,
      quantity: productForm.quantity,
      isListed: productForm.isListed,
      image: productForm.image || selectedProduct.image,
    }

    updateFoodItem(selectedProduct.id, updatedProduct)
    syncFoodItems(storeId)

    // 更新商品列表
    setProducts(products.map((product) => (product.id === selectedProduct.id ? updatedProduct : product)))

    setIsEditingProduct(false)
    setSelectedProduct(null)
    setProductImagePreview("")

    toast({ title: "更新成功", description: `已更新商品 ${productForm.name}` })

    // 通知父組件更新
    if (onUpdate) onUpdate()
  }

  // 刪除商品
  const handleDeleteProduct = (productId: string) => {
    setProductToDelete(productId)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteProduct = () => {
    if (!productToDelete) return

    deleteFoodItem(productToDelete)
    syncFoodItems(storeId)

    // 更新商品列表
    setProducts(products.filter((product) => product.id !== productToDelete))

    setIsDeleteDialogOpen(false)
    setProductToDelete(null)

    toast({ title: "刪除成功", description: "已刪除商品" })

    // 通知父組件更新
    if (onUpdate) onUpdate()
  }

  // 查看訂單詳情
  const handleViewOrder = (order: any) => {
    setSelectedOrder(order)
    setIsOrderDetailOpen(true)
  }

  // 更新訂單狀態（先呼叫資料層，再同步，最後本地回寫保險）
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string, reason?: string) => {
    try {
      await updateOrderStatusAPI(orderId, newStatus, "admin", reason) // ← 呼叫資料層 API
      await syncOrderStatus(orderId, newStatus, "admin", reason)     // ← 同步（若有）
      await updateOrderStatusLocal(orderId, newStatus, reason)       // ← 本地確保一致
      loadStoreData()
      toast({
        title: "訂單狀態已更新",
        description: `訂單 ${orderId.slice(0, 8)} 狀態已更新為 ${newStatus}`,
      })
      return true
    } catch (error) {
      console.error("更新訂單狀態失敗:", error)
      toast({ title: "更新失敗", description: "無法更新訂單狀態，請稍後再試", variant: "destructive" })
      return false
    }
  }

  // 獲取訂單狀態標籤
  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">待確認</Badge>
      case "accepted":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">處理中</Badge>
      case "prepared":
        return <Badge variant="outline" className="bg-green-100 text-green-800">已準備</Badge>
      case "completed":
        return <Badge variant="outline" className="bg-green-100 text-green-800">已完成</Badge>
      case "cancelled":
        return <Badge variant="outline" className="bg-red-100 text-red-800">已取消</Badge>
      case "rejected":
        return <Badge variant="outline" className="bg-red-100 text-red-800">已拒絕</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // 格式化日期時間
  const formatDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return ""
    try { return new Date(dateTimeStr).toLocaleString("zh-TW") } catch { return dateTimeStr }
  }

  // 下載銷售報表
  const handleDownloadReport = () => {
    // 創建報表數據
    const reportData = {
      storeName: store.name,
      storeId: storeId,
      reportDate: new Date().toISOString(),
      salesSummary: salesData,
      topProducts: topProducts,
      completedOrders: completedOrders,
    }

    // 轉換為 CSV 格式
    let csvContent = "店家銷售報表\n"
    csvContent += `店家名稱: ${store.name}\n`
    csvContent += `報表生成時間: ${new Date().toLocaleString("zh-TW")}\n\n`

    csvContent += "銷售摘要\n"
    csvContent += `今日銷售額: NT$ ${salesData.today.amount} (${salesData.today.count} 筆訂單)\n`
    csvContent += `本週銷售額: NT$ ${salesData.week.amount} (${salesData.week.count} 筆訂單)\n`
    csvContent += `本月銷售額: NT$ ${salesData.month.amount} (${salesData.month.count} 筆訂單)\n\n`

    csvContent += "熱門商品\n"
    csvContent += "商品名稱,單價,銷售數量,銷售額\n"
    topProducts.forEach((product) => {
      csvContent += `${product.name},${product.price},${product.quantity},${product.revenue}\n`
    })

    csvContent += "\n訂單記錄\n"
    csvContent += "訂單編號,用戶,金額,狀態,時間\n"
    completedOrders.forEach((order) => {
      csvContent += `${order.id},${order.userName || order.userId},${order.total},${order.status},${formatDateTime(order.createdAt)}\n`
    })

    // 下載
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `${store.name}_銷售報表_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({ title: "報表已下載", description: "銷售報表已成功下載" })
  }

  // ====== 渲染 ======

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl">
          {/* ★ 補上 Title 以符合 Radix a11y 要求（避免警告） */}
          <DialogHeader>
            <DialogTitle className="sr-only">店家詳細資料</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center h-40">
            <p>載入中...</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!store) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogTitle className="sr-only">店家詳細資料</DialogTitle>
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl">店家詳細資料</DialogTitle>
          <DialogDescription>
            查看店家 {store.name} ({store.username || storeId}) 的詳細資訊
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-4 px-6">
            <TabsTrigger value="info">店家資訊</TabsTrigger>
            <TabsTrigger value="products">商品管理</TabsTrigger>
            <TabsTrigger value="orders">訂單管理</TabsTrigger>
            <TabsTrigger value="reports">營業報表</TabsTrigger>
          </TabsList>

          {/* 店家資訊 */}
          <TabsContent value="info" className="flex-1 overflow-auto p-6 mt-0">
            <Card>
              <CardHeader>
                <CardTitle>店家資訊</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* 帳號資訊 */}
                  <div>
                    <h3 className="text-lg font-medium">帳號資訊</h3>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <p className="text-sm text-muted-foreground">帳號</p>
                        <p className="font-medium">{store.username}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">密碼</p>
                        <p className="font-medium font-mono">{store.password}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">註冊時間</p>
                        <p className="font-medium">{formatDateTime(store.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">帳號狀態</p>
                        <Badge variant={store.status === "active" ? "default" : "destructive"}>
                          {store.status === "active" ? "啟用" : "停用"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* 基本資訊 */}
                  <div>
                    <h3 className="text-lg font-medium">基本資訊</h3>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <p className="text-sm text-muted-foreground">店家名稱</p>
                        <p className="font-medium">{store.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">分類</p>
                        <p className="font-medium">{store.category}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">地址</p>
                        <p className="font-medium">{store.location}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">聯絡電話</p>
                        <p className="font-medium">{store.contact}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">電子郵件</p>
                        <p className="font-medium">{store.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">統一編號</p>
                        <p className="font-medium">{store.taxId}</p>
                      </div>
                    </div>
                  </div>

                  {/* 營業時間 */}
                  <div>
                    <h3 className="text-lg font-medium">營業時間</h3>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      {Object.entries(store.businessHours || {}).map(([day, hours]: [string, any]) => (
                        <div key={day}>
                          <p className="text-sm text-muted-foreground">
                            {day === "monday" && "星期一"}
                            {day === "tuesday" && "星期二"}
                            {day === "wednesday" && "星期三"}
                            {day === "thursday" && "星期四"}
                            {day === "friday" && "星期五"}
                            {day === "saturday" && "星期六"}
                            {day === "sunday" && "星期日"}
                          </p>
                          <p className="font-medium">{hours.open} - {hours.close}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 付款方式 */}
                  <div>
                    <h3 className="text-lg font-medium">付款方式</h3>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <p className="text-sm text-muted-foreground">現金支付</p>
                        <p className="font-medium">{store.paymentMethods?.cash ? "接受" : "不接受"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">信用卡</p>
                        <p className="font-medium">{store.paymentMethods?.creditCard ? "接受" : "不接受"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">LINE Pay</p>
                        <p className="font-medium">{store.paymentMethods?.linePay ? "接受" : "不接受"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">街口支付</p>
                        <p className="font-medium">{store.paymentMethods?.jkoPay ? "接受" : "不接受"}</p>
                      </div>
                    </div>
                  </div>

                  {/* 取餐方式 */}
                  <div>
                    <h3 className="text-lg font-medium">取餐方式</h3>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <p className="text-sm text-muted-foreground">自取</p>
                        <p className="font-medium">{store.deliveryOptions?.pickup ? "提供" : "不提供"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">外送</p>
                        <p className="font-medium">{store.deliveryOptions?.delivery ? "提供" : "不提供"}</p>
                      </div>
                    </div>
                  </div>

                  {/* 通知設定 */}
                  <div>
                    <h3 className="text-lg font-medium">通知設定</h3>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <p className="text-sm text-muted-foreground">電子郵件通知</p>
                        <p className="font-medium">{store.notificationSettings?.email ? "開啟" : "關閉"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">推播通知</p>
                        <p className="font-medium">{store.notificationSettings?.push ? "開啟" : "關閉"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">訂單更新通知</p>
                        <p className="font-medium">{store.notificationSettings?.orderUpdates ? "開啟" : "關閉"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">促銷活動通知</p>
                        <p className="font-medium">{store.notificationSettings?.promotions ? "開啟" : "關閉"}</p>
                      </div>
                    </div>
                  </div>

                  {/* 店家描述 */}
                  {store.description && (
                    <div>
                      <h3 className="text-lg font-medium">店家描述</h3>
                      <p className="mt-2 text-muted-foreground">{store.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 商品管理 */}
          <TabsContent value="products" className="flex-1 overflow-auto p-6 mt-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>商品管理</CardTitle>
                  <CardDescription>店家的所有商品</CardDescription>
                </div>
                <Button onClick={() => setIsAddingProduct(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  新增商品
                </Button>
              </CardHeader>
              <CardContent>
                {isAddingProduct ? (
                  <div className="space-y-4 border rounded-lg p-4">
                    <h3 className="font-medium">新增商品</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="product-name">商品名稱</Label>
                        <Input
                          id="product-name"
                          name="name"
                          value={productForm.name}
                          onChange={handleProductFormChange}
                        />
                      </div>
                      <div>
                        <Label htmlFor="product-category">商品分類</Label>
                        <Input
                          id="product-category"
                          name="category"
                          value={productForm.category}
                          onChange={handleProductFormChange}
                        />
                      </div>
                      <div>
                        <Label htmlFor="product-original-price">原價</Label>
                        <Input
                          id="product-original-price"
                          name="originalPrice"
                          type="number"
                          value={productForm.originalPrice}
                          onChange={handleProductFormChange}
                        />
                      </div>
                      <div>
                        <Label htmlFor="product-discount-price">特價</Label>
                        <Input
                          id="product-discount-price"
                          name="discountPrice"
                          type="number"
                          value={productForm.discountPrice}
                          onChange={handleProductFormChange}
                        />
                      </div>
                      <div>
                        <Label htmlFor="product-quantity">數量</Label>
                        <Input
                          id="product-quantity"
                          name="quantity"
                          type="number"
                          value={productForm.quantity}
                          onChange={handleProductFormChange}
                        />
                      </div>
                      <div>
                        <Label htmlFor="product-expiry">到期時間</Label>
                        <Input
                          id="product-expiry"
                          name="expiryTime"
                          type="datetime-local"
                          value={productForm.expiryTime}
                          onChange={handleProductFormChange}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="product-description">商品描述</Label>
                        <Textarea
                          id="product-description"
                          name="description"
                          value={productForm.description}
                          onChange={handleProductFormChange}
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label>商品圖片</Label>
                        <div className="flex items-center space-x-2">
                          <Button type="button" variant="outline" onClick={() => productImageRef.current?.click()}>
                            <Upload className="mr-2 h-4 w-4" />
                            上傳圖片
                          </Button>
                          {productImagePreview && (
                            <img
                              src={productImagePreview || "/placeholder.svg"}
                              alt="預覽"
                              className="h-16 w-16 object-cover rounded-md"
                            />
                          )}
                        </div>
                        <input
                          ref={productImageRef}
                          type="file"
                          accept="image/*"
                          onChange={handleProductImageUpload}
                          className="hidden"
                        />
                      </div>
                      <div>
                        <Label>商品狀態</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Button
                            type="button"
                            variant={productForm.isListed ? "default" : "outline"}
                            onClick={() => handleProductStatusChange(true)}
                          >
                            上架
                          </Button>
                          <Button
                            type="button"
                            variant={!productForm.isListed ? "default" : "outline"}
                            onClick={() => handleProductStatusChange(false)}
                          >
                            下架
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsAddingProduct(false)}>
                        取消
                      </Button>
                      <Button onClick={handleAddProduct}>新增商品</Button>
                    </div>
                  </div>
                ) : null}

                {isEditingProduct && selectedProduct ? (
                  <div className="space-y-4 border rounded-lg p-4 mb-4">
                    <h3 className="font-medium">編輯商品</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-product-name">商品名稱</Label>
                        <Input
                          id="edit-product-name"
                          name="name"
                          value={productForm.name}
                          onChange={handleProductFormChange}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-product-category">商品分類</Label>
                        <Input
                          id="edit-product-category"
                          name="category"
                          value={productForm.category}
                          onChange={handleProductFormChange}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-product-original-price">原價</Label>
                        <Input
                          id="edit-product-original-price"
                          name="originalPrice"
                          type="number"
                          value={productForm.originalPrice}
                          onChange={handleProductFormChange}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-product-discount-price">特價</Label>
                        <Input
                          id="edit-product-discount-price"
                          name="discountPrice"
                          type="number"
                          value={productForm.discountPrice}
                          onChange={handleProductFormChange}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-product-quantity">數量</Label>
                        <Input
                          id="edit-product-quantity"
                          name="quantity"
                          type="number"
                          value={productForm.quantity}
                          onChange={handleProductFormChange}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-product-expiry">到期時間</Label>
                        <Input
                          id="edit-product-expiry"
                          name="expiryTime"
                          type="datetime-local"
                          value={productForm.expiryTime}
                          onChange={handleProductFormChange}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="edit-product-description">商品描述</Label>
                        <Textarea
                          id="edit-product-description"
                          name="description"
                          value={productForm.description}
                          onChange={handleProductFormChange}
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label>商品圖片</Label>
                        <div className="flex items中心 space-x-2">
                          <Button type="button" variant="outline" onClick={() => productImageRef.current?.click()}>
                            <Upload className="mr-2 h-4 w-4" />
                            上傳圖片
                          </Button>
                          {productImagePreview && (
                            <img
                              src={productImagePreview || "/placeholder.svg"}
                              alt="預覽"
                              className="h-16 w-16 object-cover rounded-md"
                            />
                          )}
                        </div>
                        <input
                          ref={productImageRef}
                          type="file"
                          accept="image/*"
                          onChange={handleProductImageUpload}
                          className="hidden"
                        />
                      </div>
                      <div>
                        <Label>商品狀態</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Button
                            type="button"
                            variant={productForm.isListed ? "default" : "outline"}
                            onClick={() => handleProductStatusChange(true)}
                          >
                            上架
                          </Button>
                          <Button
                            type="button"
                            variant={!productForm.isListed ? "default" : "outline"}
                            onClick={() => handleProductStatusChange(false)}
                          >
                            下架
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditingProduct(false)
                          setSelectedProduct(null)
                          setProductImagePreview("")
                        }}
                      >
                        取消
                      </Button>
                      <Button onClick={handleSaveProduct}>儲存變更</Button>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-4">
                  {products.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">此店家尚未新增任何商品</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>商品</TableHead>
                          <TableHead>分類</TableHead>
                          <TableHead>原價</TableHead>
                          <TableHead>特價</TableHead>
                          <TableHead>數量</TableHead>
                          <TableHead>狀態</TableHead>
                          <TableHead>到期時間</TableHead>
                          <TableHead>操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <img
                                  src={
                                    product.image ||
                                    `/placeholder.svg?height=40&width=40&text=${encodeURIComponent(product.name)}`
                                  }
                                  alt={product.name}
                                  className="h-10 w-10 object-cover rounded-md"
                                />
                                <div>
                                  <p className="font-medium">{product.name}</p>
                                  <p className="text-sm text-muted-foreground">{product.description}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{product.category}</TableCell>
                            <TableCell>NT$ {product.originalPrice}</TableCell>
                            <TableCell>NT$ {product.discountPrice}</TableCell>
                            <TableCell>{product.quantity}</TableCell>
                            <TableCell>
                              <Badge variant={product.isListed ? "default" : "secondary"}>
                                {product.isListed ? "上架" : "下架"}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDateTime(product.expiryTime)}</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm" onClick={() => handleEditProduct(product)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleDeleteProduct(product.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 訂單管理 */}
          <TabsContent value="orders" className="flex-1 overflow-auto p-6 mt-0">
            <div className="space-y-6">
              {/* 進行中訂單 */}
              <Card>
                <CardHeader>
                  <CardTitle>進行中訂單</CardTitle>
                  <CardDescription>需要處理的訂單</CardDescription>
                </CardHeader>
                <CardContent>
                  {activeOrders.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">目前沒有進行中的訂單</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>訂單編號</TableHead>
                          <TableHead>用戶</TableHead>
                          <TableHead>金額</TableHead>
                          <TableHead>狀態</TableHead>
                          <TableHead>時間</TableHead>
                          <TableHead>操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono">{order.id.slice(0, 8)}</TableCell>
                            <TableCell>{order.userName || order.userId}</TableCell>
                            <TableCell>NT$ {order.total}</TableCell>
                            <TableCell>{getOrderStatusBadge(order.status)}</TableCell>
                            <TableCell>{formatDateTime(order.createdAt)}</TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm" onClick={() => handleViewOrder(order)}>
                                <Eye className="h-4 w-4 mr-1" />
                                查看
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* 歷史訂單 */}
              <Card>
                <CardHeader>
                  <CardTitle>歷史訂單</CardTitle>
                  <CardDescription>已完成或取消的訂單</CardDescription>
                </CardHeader>
                <CardContent>
                  {completedOrders.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">尚無歷史訂單</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>訂單編號</TableHead>
                          <TableHead>用戶</TableHead>
                          <TableHead>金額</TableHead>
                          <TableHead>狀態</TableHead>
                          <TableHead>時間</TableHead>
                          <TableHead>操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {completedOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono">{order.id.slice(0, 8)}</TableCell>
                            <TableCell>{order.userName || order.userId}</TableCell>
                            <TableCell>NT$ {order.total}</TableCell>
                            <TableCell>{getOrderStatusBadge(order.status)}</TableCell>
                            <TableCell>{formatDateTime(order.createdAt)}</TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm" onClick={() => handleViewOrder(order)}>
                                <Eye className="h-4 w-4 mr-1" />
                                查看
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 營業報表 */}
          <TabsContent value="reports" className="flex-1 overflow-auto p-6 mt-0">
            <div className="space-y-6">
              {/* 銷售摘要 */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">今日銷售額</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">NT$ {salesData.today.amount}</div>
                    <p className="text-xs text-muted-foreground">{salesData.today.count} 筆訂單</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">本週銷售額</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">NT$ {salesData.week.amount}</div>
                    <p className="text-xs text-muted-foreground">{salesData.week.count} 筆訂單</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">本月銷售額</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">NT$ {salesData.month.amount}</div>
                    <p className="text-xs text-muted-foreground">{salesData.month.count} 筆訂單</p>
                  </CardContent>
                </Card>
              </div>

              {/* 銷售詳情 */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>銷售詳情</CardTitle>
                    <CardDescription>
                      校園即期食品資訊平台 -- 報表日期: {new Date().toLocaleDateString("zh-TW")}
                    </CardDescription>
                  </div>
                  <Button onClick={handleDownloadReport}>
                    <Download className="mr-2 h-4 w-4" />
                    下載報表
                  </Button>
                </CardHeader>
                <CardContent>
                  {topProducts.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">暫無銷售數據</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>商品名稱</TableHead>
                          <TableHead>單價</TableHead>
                          <TableHead>銷售數量</TableHead>
                          <TableHead>收入</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topProducts.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell>{product.name}</TableCell>
                            <TableCell>NT$ {product.price}</TableCell>
                            <TableCell>{product.quantity}</TableCell>
                            <TableCell>NT$ {product.revenue}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* 訂單詳情對話框 */}
        {selectedOrder && (
          <AdminOrderDetailDialog
            isOpen={isOrderDetailOpen}
            onClose={() => {
              setIsOrderDetailOpen(false)
              setSelectedOrder(null)
            }}
            order={selectedOrder}
            onUpdateStatus={handleUpdateOrderStatus}
          />
        )}

        {/* 刪除商品確認對話框 */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>確認刪除</AlertDialogTitle>
              <AlertDialogDescription>您確定要刪除這個商品嗎？此操作無法復原。</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteProduct}>刪除</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}

export default StoreDetailDialog
// ⚠ 修正重複匯出：此處保留 default；named 匯出已在函式宣告 `export function ...` 給出
