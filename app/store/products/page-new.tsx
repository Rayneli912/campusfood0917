"use client"

import { useState, useEffect } from "react"
import { useStoreAuth } from "@/components/store-auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { PlusCircle, Edit, Trash2, Image as ImageIcon, RefreshCw } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import type { Product } from "@/lib/db/product-service"

export default function StoreProductsPage() {
  const { store } = useStoreAuth()
  const { toast } = useToast()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("list")
  
  // 新增/編輯商品對話框
  const [showProductDialog, setShowProductDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    original_price: "",
    discount_price: "",
    quantity: "",
    expiry_date: "",
    image_url: "",
    category: "",
  })
  const [submitting, setSubmitting] = useState(false)

  // 刪除確認對話框
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)

  // 載入商品列表
  const loadProducts = async () => {
    if (!store?.id) return

    setLoading(true)
    try {
      const response = await fetch(`/api/store/products?storeId=${store.id}`)
      const data = await response.json()

      if (data.success) {
        setProducts(data.products)
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      console.error("載入商品列表時發生錯誤:", error)
      toast({
        title: "錯誤",
        description: "載入商品列表時發生錯誤",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [store?.id])

  // 打開新增商品對話框
  const handleAddProduct = () => {
    setEditingProduct(null)
    setProductForm({
      name: "",
      description: "",
      original_price: "",
      discount_price: "",
      quantity: "",
      expiry_date: "",
      image_url: "",
      category: "",
    })
    setShowProductDialog(true)
    setActiveTab("add")
  }

  // 打開編輯商品對話框
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setProductForm({
      name: product.name,
      description: product.description || "",
      original_price: product.original_price?.toString() || "",
      discount_price: product.discount_price.toString(),
      quantity: product.quantity.toString(),
      expiry_date: product.expiry_date ? new Date(product.expiry_date).toISOString().slice(0, 16) : "",
      image_url: product.image_url || "",
      category: product.category || "",
    })
    setShowProductDialog(true)
  }

  // 提交商品表單
  const handleSubmitProduct = async () => {
    if (!store?.id) return

    // 驗證必填欄位
    if (!productForm.name || !productForm.discount_price || !productForm.quantity) {
      toast({
        title: "錯誤",
        description: "請填寫所有必填欄位",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const productData = {
        store_id: store.id,
        name: productForm.name,
        description: productForm.description || null,
        original_price: productForm.original_price ? parseFloat(productForm.original_price) : null,
        discount_price: parseFloat(productForm.discount_price),
        quantity: parseInt(productForm.quantity),
        expiry_date: productForm.expiry_date ? new Date(productForm.expiry_date).toISOString() : null,
        image_url: productForm.image_url || null,
        category: productForm.category || null,
      }

      if (editingProduct) {
        // 更新商品
        const response = await fetch("/api/store/products", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: editingProduct.id,
            ...productData,
          }),
        })

        const result = await response.json()

        if (result.success) {
          toast({
            title: "成功",
            description: "商品更新成功",
          })
          await loadProducts()
          setShowProductDialog(false)
        } else {
          throw new Error(result.message)
        }
      } else {
        // 新增商品
        const response = await fetch("/api/store/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productData),
        })

        const result = await response.json()

        if (result.success) {
          toast({
            title: "成功",
            description: "商品新增成功",
          })
          await loadProducts()
          setShowProductDialog(false)
          setActiveTab("list")
        } else {
          throw new Error(result.message)
        }
      }
    } catch (error: any) {
      console.error("提交商品時發生錯誤:", error)
      toast({
        title: "錯誤",
        description: error.message || "提交商品時發生錯誤",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  // 刪除商品
  const handleDeleteProduct = async () => {
    if (!productToDelete) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/store/products?productId=${productToDelete.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "成功",
          description: "商品刪除成功",
        })
        await loadProducts()
      } else {
        throw new Error(result.message)
      }
    } catch (error: any) {
      console.error("刪除商品時發生錯誤:", error)
      toast({
        title: "錯誤",
        description: error.message || "刪除商品時發生錯誤",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
      setProductToDelete(null)
    }
  }

  // 切換商品上架狀態
  const toggleProductAvailability = async (productId: string, isAvailable: boolean) => {
    try {
      const response = await fetch("/api/store/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          is_available: isAvailable,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "成功",
          description: isAvailable ? "商品已上架" : "商品已下架",
        })
        await loadProducts()
      } else {
        throw new Error(result.message)
      }
    } catch (error: any) {
      console.error("切換商品狀態時發生錯誤:", error)
      toast({
        title: "錯誤",
        description: error.message || "切換商品狀態時發生錯誤",
        variant: "destructive",
      })
    }
  }

  if (!store) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg text-muted-foreground">請先登入店家帳號</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">商品管理</h1>
          <p className="text-muted-foreground mt-1">管理您的商品清單和優惠</p>
        </div>
        <Button onClick={handleAddProduct}>
          <PlusCircle className="h-4 w-4 mr-2" />
          新增商品
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">商品列表</TabsTrigger>
          <TabsTrigger value="add">新增商品</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              共 {products.length} 件商品，其中 {products.filter(p => p.is_available).length} 件已上架
            </div>
            <Button variant="outline" onClick={loadProducts} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              重新整理
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : products.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">尚無商品</p>
                <p className="text-sm text-muted-foreground mb-4">點擊「新增商品」開始上架您的第一件商品</p>
                <Button onClick={handleAddProduct}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  新增商品
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <Card key={product.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <Switch
                        checked={product.is_available}
                        onCheckedChange={(checked) => toggleProductAvailability(product.id, checked)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {product.image_url && (
                      <div className="relative w-full h-32 rounded-md overflow-hidden">
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      </div>
                    )}
                    {product.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">原價：</span>
                        <span className="line-through">${product.original_price || "-"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">特價：</span>
                        <span className="text-lg font-bold text-green-600">${product.discount_price}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">庫存：</span>
                        <span className={product.quantity > 0 ? "text-green-600" : "text-red-600"}>
                          {product.quantity} 件
                        </span>
                      </div>
                      {product.expiry_date && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">到期時間：</span>
                          <span className="text-orange-600">
                            {new Date(product.expiry_date).toLocaleString("zh-TW")}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => handleEditProduct(product)}>
                      <Edit className="h-4 w-4 mr-2" />
                      編輯
                    </Button>
                    <Button variant="destructive" onClick={() => { setProductToDelete(product); setShowDeleteDialog(true); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="add" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{editingProduct ? "編輯商品" : "新增商品"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">商品名稱 *</Label>
                  <Input
                    id="name"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    placeholder="輸入商品名稱"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">分類</Label>
                  <Input
                    id="category"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    placeholder="例如：主食、湯品、點心"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="original_price">原價</Label>
                  <Input
                    id="original_price"
                    type="number"
                    value={productForm.original_price}
                    onChange={(e) => setProductForm({ ...productForm, original_price: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount_price">特價 *</Label>
                  <Input
                    id="discount_price"
                    type="number"
                    value={productForm.discount_price}
                    onChange={(e) => setProductForm({ ...productForm, discount_price: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">數量 *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={productForm.quantity}
                    onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiry_date">到期時間</Label>
                  <Input
                    id="expiry_date"
                    type="datetime-local"
                    value={productForm.expiry_date}
                    onChange={(e) => setProductForm({ ...productForm, expiry_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">商品描述</Label>
                <Textarea
                  id="description"
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="輸入商品描述"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url">商品圖片網址</Label>
                <Input
                  id="image_url"
                  value={productForm.image_url}
                  onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
                {productForm.image_url && (
                  <div className="relative w-full h-48 rounded-md overflow-hidden border">
                    <Image
                      src={productForm.image_url}
                      alt="預覽"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setActiveTab("list")} className="flex-1">
                取消
              </Button>
              <Button onClick={handleSubmitProduct} disabled={submitting} className="flex-1">
                {submitting ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> 提交中...</>
                ) : (
                  editingProduct ? "更新商品" : "新增商品"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 刪除確認對話框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              您確定要刪除「{productToDelete?.name}」嗎？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} disabled={deleting}>
              {deleting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
