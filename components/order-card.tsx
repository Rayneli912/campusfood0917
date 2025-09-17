"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/sync-service"
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
import { Textarea } from "@/components/ui/textarea"
import { User, Clock, Phone, ChevronDown, ChevronUp } from "lucide-react"

interface OrderCardProps {
  order: any
  onAccept: (orderId: string) => void
  onPrepare: (orderId: string) => void
  onComplete: (orderId: string) => void
  onCancel: (reason: string) => void
  onReject: (reason: string) => void
}

export function OrderCard({ order, onAccept, onPrepare, onComplete, onCancel, onReject }: OrderCardProps) {
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)

  const handleToggleExpand = () => setIsExpanded(!isExpanded)
  const handleReject = () => setIsRejectDialogOpen(true)
  const confirmReject = () => { onReject(reason); setIsRejectDialogOpen(false); setReason("") }
  const handleCancel = () => setIsCancelDialogOpen(true)
  const confirmCancel = () => { onCancel(reason); setIsCancelDialogOpen(false); setReason("") }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 ml-2">等待確認</Badge>
      case "accepted":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 ml-2">準備中</Badge>
      case "prepared":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 ml-2">已準備</Badge>
      case "completed":
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 ml-2">已完成</Badge>
      case "rejected":
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 ml-2">已拒絕</Badge>
      case "cancelled":
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 ml-2">已取消</Badge>
      default:
        return <Badge variant="outline" className="ml-2">未知</Badge>
    }
  }

  // 顧客資訊：補上 customerInfo 來源
  const getCustomerName = () => {
    if (order.customer?.name) return order.customer.name
    if (order.customerInfo?.name) return order.customerInfo.name
    if (typeof order.customer === "string") return order.customer
    if (order.contact?.name) return order.contact.name
    return "匿名顧客"
  }

  const getCustomerPhone = () => {
    if (order.customer?.phone) return order.customer.phone
    if (order.customerInfo?.phone) return order.customerInfo.phone
    if (order.contact?.phone) return order.contact.phone
    return ""
  }

  const shouldShowDetailsButton = order.items.length > 2

  return (
    <Card className="overflow-hidden border-gray-200 hover:border-gray-300 transition-colors mb-4">
      <CardContent className="p-0">
        {/* 標題與金額 */}
        <div className="p-4 pb-2 flex justify-between items-start">
          <div className="flex items-center">
            <h3 className="font-medium text-base">訂單 #{order.id}</h3>
            {getStatusBadge(order.status)}
          </div>
          <div className="text-right">
            <div className="font-bold text-lg">${order.total}</div>
            <div className="text-sm text-muted-foreground">{order.items.length} 件商品</div>
          </div>
        </div>

        {/* 基本資訊 */}
        <div className="px-4 pb-2 flex flex-wrap gap-x-4 text-sm text-muted-foreground">
          <div className="flex items-center">
            <User className="h-4 w-4 mr-1" />
            <span>{getCustomerName()}</span>
          </div>
          {getCustomerPhone() && (
            <div className="flex items-center">
              <Phone className="h-4 w-4 mr-1" />
              <span>{getCustomerPhone()}</span>
            </div>
          )}
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            <span>{formatDateTime(order.createdAt)}</span>
          </div>
        </div>

        {/* 訂單內容 */}
        {order.items.length <= 2 ? (
          <div className="px-4 py-3 border-t border-gray-100">
            <div className="text-sm font-medium mb-2">訂單內容:</div>
            <div className="space-y-3">
              {order.items.map((item: any, index: number) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-md flex-shrink-0" />
                  <div className="flex-grow min-w-0">
                    <div className="font-medium truncate">{item.name}</div>

                    {/* ✅ 備註：只在第一個商品下方顯示一次 */}
                    {index === 0 && !!order.note && (
                      <div className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap break-words">
                        <span className="mr-1">備註：</span>{order.note}
                      </div>
                    )}

                    <div className="text-sm text-muted-foreground">x{item.quantity}</div>
                  </div>
                  <div className="font-medium">$
                    {Number(item.price) * Number(item.quantity)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {isExpanded ? (
              <div className="px-4 py-3 border-t border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm font-medium">訂單內容:</div>
                  <button onClick={handleToggleExpand} className="text-sm text-gray-500 hover:text-gray-700 flex items-center">
                    收合 <ChevronUp className="h-4 w-4 ml-1" />
                  </button>
                </div>
                <div className="space-y-3">
                  {order.items.map((item: any, index: number) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-md flex-shrink-0" />
                      <div className="flex-grow min-w-0">
                        <div className="font-medium truncate">{item.name}</div>

                        {/* ✅ 備註：展開狀態下也放在第一個商品下 */}
                        {index === 0 && !!order.note && (
                          <div className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap break-words">
                            <span className="mr-1">備註：</span>{order.note}
                          </div>
                        )}

                        <div className="text-sm text-muted-foreground">x{item.quantity}</div>
                      </div>
                      <div className="font-medium">$
                        {Number(item.price) * Number(item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-4 py-2 border-t border-gray-100">
                <button onClick={handleToggleExpand} className="w-full text-center py-1 text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center">
                  查看詳情 <ChevronDown className="h-4 w-4 ml-1" />
                </button>
              </div>
            )}
          </>
        )}

        {/* 取消/拒絕原因（有則顯示） */}
        {(order.status === "cancelled" || order.status === "rejected") && order.cancelReason && (
          <div className="px-4 py-2 border-t border-gray-100">
            <h4 className="text-sm font-medium mb-1 text-red-600">
              {order.status === "cancelled"
                ? (order.cancelledBy === "system" ? "自動取消原因" : "取消原因")
                : "拒絕原因"}
            </h4>
            <div className="p-2 bg-red-50 rounded-md text-sm text-red-700">{order.cancelReason}</div>
          </div>
        )}

        {/* 操作按鈕 */}
        <div className="p-4 border-top border-gray-100 flex justify-end gap-2">
          {order.status === "pending" && (
            <>
              <Button variant="outline" onClick={handleReject} className="bg-white hover:bg-gray-50">拒絕訂單</Button>
              <Button onClick={() => onAccept(order.id)} className="bg-green-600 hover:bg-green-700">接受訂單</Button>
            </>
          )}

          {order.status === "accepted" && (
            <>
              <Button variant="outline" onClick={handleCancel} className="bg-white hover:bg-gray-50">取消訂單</Button>
              <Button onClick={() => onPrepare(order.id)} className="bg-green-600 hover:bg-green-700">備餐完畢</Button>
            </>
          )}

          {order.status === "prepared" && (
            <>
              <Button variant="outline" onClick={handleCancel} className="bg-white hover:bg-gray-50">取消訂單</Button>
              <Button onClick={() => onComplete(order.id)} className="bg-green-600 hover:bg-green-700">完成訂單</Button>
            </>
          )}
        </div>
      </CardContent>

      {/* 拒絕對話框 */}
      <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>拒絕訂單</AlertDialogTitle>
            <AlertDialogDescription>請輸入拒絕訂單的原因，此訊息將會顯示給顧客。</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea placeholder="請輸入拒絕原因..." value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[100px]" />
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReject}>確認拒絕</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 取消對話框 */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>取消訂單</AlertDialogTitle>
            <AlertDialogDescription>請輸入取消訂單的原因，此訊息將會顯示給顧客。</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea placeholder="請輸入取消原因..." value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[100px]" />
          <AlertDialogFooter>
            <AlertDialogCancel>返回</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel}>確認取消</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
