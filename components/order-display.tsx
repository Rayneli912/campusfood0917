"use client"

import { parseOrderId } from "@/lib/order-utils"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"

interface OrderDisplayProps {
  orderId: string
  showStoreCode?: boolean // 是否顯示店家代號
  className?: string
}

// 格式化訂單編號顯示
export function OrderIdDisplay({ orderId, showStoreCode = true, className = "" }: OrderDisplayProps) {
  try {
    const { storeCode, date, orderNumber } = parseOrderId(orderId)
    
    // 格式化日期顯示
    const formattedDate = format(
      new Date(
        parseInt(date.substring(0, 4)),
        parseInt(date.substring(4, 6)) - 1,
        parseInt(date.substring(6, 8))
      ),
      "yyyy/MM/dd",
      { locale: zhTW }
    )

    if (showStoreCode) {
      return (
        <span className={className}>
          #{storeCode}-{formattedDate}-{orderNumber}
        </span>
      )
    } else {
      return (
        <span className={className}>
          #{formattedDate}-{orderNumber}
        </span>
      )
    }
  } catch (error) {
    // 如果解析失敗，直接顯示原始訂單編號
    return <span className={className}>#{orderId}</span>
  }
}

// 訂單狀態標籤
export function OrderStatusBadge({ status }: { status: string }) {
  const statusConfig = {
    pending: {
      label: "等待確認",
      className: "bg-yellow-50 text-yellow-700 border-yellow-200",
    },
    accepted: {
      label: "準備中",
      className: "bg-blue-50 text-blue-700 border-blue-200",
    },
    prepared: {
      label: "已準備",
      className: "bg-green-50 text-green-700 border-green-200",
    },
    completed: {
      label: "已完成",
      className: "bg-green-100 text-green-800 border-green-200",
    },
    cancelled: {
      label: "已取消",
      className: "bg-red-100 text-red-800 border-red-200",
    },
    rejected: {
      label: "已拒絕",
      className: "bg-red-100 text-red-800 border-red-200",
    },
  }

  const config = statusConfig[status as keyof typeof statusConfig] || {
    label: "未知狀態",
    className: "bg-gray-100 text-gray-800 border-gray-200",
  }

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}

// 完整訂單資訊顯示
export function OrderDisplay({ order, showStoreInfo = true }: {
  order: {
    id: string
    status: string
    createdAt: string
    storeName?: string
    storeLocation?: string
    total: number
    items: Array<{
      name: string
      quantity: number
      price: number
    }>
  }
  showStoreInfo?: boolean
}) {
  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <OrderIdDisplay orderId={order.id} />
          <div className="text-sm text-muted-foreground">
            {format(new Date(order.createdAt), "yyyy/MM/dd HH:mm", { locale: zhTW })}
          </div>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {showStoreInfo && order.storeName && (
        <div className="text-sm">
          <div className="font-medium">{order.storeName}</div>
          {order.storeLocation && (
            <div className="text-muted-foreground">{order.storeLocation}</div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {order.items.map((item, index) => (
          <div key={index} className="flex justify-between text-sm">
            <span>{item.name} × {item.quantity}</span>
            <span>${item.price * item.quantity}</span>
          </div>
        ))}
        <div className="flex justify-between font-medium pt-2 border-t">
          <span>總計</span>
          <span>${order.total}</span>
        </div>
      </div>
    </div>
  )
} 