"use client"

import { Badge } from "@/components/ui/badge"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { CreditCard, Trash2, Plus, Check, AlertCircle } from "lucide-react"

// 模擬付款方式數據
const paymentMethods = [
  {
    id: "card-1",
    type: "credit",
    name: "王小明",
    number: "•••• •••• •••• 1234",
    expiry: "12/25",
    isDefault: true,
  },
  {
    id: "card-2",
    type: "credit",
    name: "王小明",
    number: "•••• •••• •••• 5678",
    expiry: "06/24",
    isDefault: false,
  },
]

export default function PaymentMethodsPage() {
  const { toast } = useToast()
  const [cards, setCards] = useState(paymentMethods)
  const [showAddCard, setShowAddCard] = useState(false)
  const [newCard, setNewCard] = useState({
    name: "",
    number: "",
    expiry: "",
    cvc: "",
    isDefault: false,
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewCard({
      ...newCard,
      [name]: value,
    })
  }

  const handleSwitchChange = (checked: boolean) => {
    setNewCard({
      ...newCard,
      isDefault: checked,
    })
  }

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault()

    // 簡單驗證
    if (!newCard.name || !newCard.number || !newCard.expiry || !newCard.cvc) {
      toast({
        title: "錯誤",
        description: "請填寫所有必填欄位",
        variant: "destructive",
      })
      return
    }

    // 創建新卡片
    const newCardObj = {
      id: `card-${Date.now()}`,
      type: "credit",
      name: newCard.name,
      number: `•••• •••• •••• ${newCard.number.slice(-4)}`,
      expiry: newCard.expiry,
      isDefault: newCard.isDefault,
    }

    // 如果新卡片設為預設，則更新其他卡片
    const updatedCards = cards.map((card) => ({
      ...card,
      isDefault: newCard.isDefault ? false : card.isDefault,
    }))

    // 添加新卡片
    setCards([...updatedCards, newCardObj])

    // 重置表單
    setNewCard({
      name: "",
      number: "",
      expiry: "",
      cvc: "",
      isDefault: false,
    })
    setShowAddCard(false)

    toast({
      title: "成功",
      description: "已成功添加新的付款方式",
    })
  }

  const handleSetDefault = (id: string) => {
    setCards(
      cards.map((card) => ({
        ...card,
        isDefault: card.id === id,
      })),
    )

    toast({
      title: "已更新",
      description: "已設定為預設付款方式",
    })
  }

  const handleDeleteCard = (id: string) => {
    const cardToDelete = cards.find((card) => card.id === id)

    // 如果刪除的是預設卡片且有其他卡片，則設置第一張卡片為預設
    if (cardToDelete?.isDefault && cards.length > 1) {
      const otherCards = cards.filter((card) => card.id !== id)
      otherCards[0].isDefault = true
    }

    setCards(cards.filter((card) => card.id !== id))

    toast({
      title: "已刪除",
      description: "付款方式已成功刪除",
    })
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">付款方式</h1>
        <p className="text-muted-foreground">管理您的付款方式和偏好設定</p>
      </div>

      <div className="grid gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">已儲存的付款方式</h2>
          <Button onClick={() => setShowAddCard(!showAddCard)}>
            {showAddCard ? (
              "取消"
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" /> 新增付款方式
              </>
            )}
          </Button>
        </div>

        {showAddCard && (
          <Card>
            <CardHeader>
              <CardTitle>新增信用卡</CardTitle>
              <CardDescription>請填寫您的信用卡資訊</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddCard} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">持卡人姓名</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="請輸入持卡人姓名"
                    value={newCard.name}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="number">卡號</Label>
                  <Input
                    id="number"
                    name="number"
                    placeholder="請輸入卡號"
                    value={newCard.number}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="expiry">到期日</Label>
                    <Input
                      id="expiry"
                      name="expiry"
                      placeholder="MM/YY"
                      value={newCard.expiry}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cvc">安全碼</Label>
                    <Input id="cvc" name="cvc" placeholder="CVC" value={newCard.cvc} onChange={handleInputChange} />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="default-payment" checked={newCard.isDefault} onCheckedChange={handleSwitchChange} />
                  <Label htmlFor="default-payment">設為預設付款方式</Label>
                </div>
              </form>
            </CardContent>
            <CardFooter>
              <Button type="submit" onClick={handleAddCard}>
                新增卡片
              </Button>
            </CardFooter>
          </Card>
        )}

        {cards.length > 0 ? (
          <div className="space-y-4">
            {cards.map((card) => (
              <Card key={card.id} className={card.isDefault ? "border-brand-primary/50" : ""}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="mr-4 p-2 bg-brand-primary/10 rounded-full">
                        <CreditCard className="h-6 w-6 text-brand-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{card.number}</div>
                        <div className="text-sm text-muted-foreground">
                          {card.name} • 到期日 {card.expiry}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {card.isDefault ? (
                        <Badge
                          variant="outline"
                          className="bg-brand-primary/10 text-brand-primary border-brand-primary/20"
                        >
                          <Check className="mr-1 h-3 w-3" />
                          預設
                        </Badge>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => handleSetDefault(card.id)}>
                          設為預設
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteCard(card.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">刪除</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 flex flex-col items-center justify-center text-center py-12">
              <div className="bg-muted p-4 rounded-full mb-4">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">尚未添加付款方式</h3>
              <p className="text-muted-foreground mb-4">添加付款方式以便快速結帳</p>
              <Button onClick={() => setShowAddCard(true)}>
                <Plus className="mr-2 h-4 w-4" />
                新增付款方式
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
