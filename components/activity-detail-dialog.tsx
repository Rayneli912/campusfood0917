"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ActivityService, type ActivityRecord } from "@/lib/activity-service"
import { formatCurrency } from "@/lib/utils"

interface ActivityDetailDialogProps {
  activity: ActivityRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ActivityDetailDialog({ activity, open, onOpenChange }: ActivityDetailDialogProps) {
  if (!activity) return null

  const getStatusColor = (type: ActivityRecord["type"]) => {
    switch (type) {
      case "order_created":
        return "bg-blue-100 text-blue-800"
      case "order_cancelled":
        return "bg-red-100 text-red-800"
      case "order_completed":
        return "bg-green-100 text-green-800"
      case "user_registered":
        return "bg-purple-100 text-purple-800"
      case "store_registered":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (type: ActivityRecord["type"]) => {
    switch (type) {
      case "order_created":
        return "訂單成立"
      case "order_cancelled":
        return "訂單取消"
      case "order_completed":
        return "訂單完成"
      case "user_registered":
        return "用戶註冊"
      case "store_registered":
        return "店家註冊"
      default:
        return "未知活動"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">{ActivityService.getActivityIcon(activity.type)}</span>
            活動詳情
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 活動類型 */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">活動類型</span>
            <Badge className={getStatusColor(activity.type)}>{getStatusText(activity.type)}</Badge>
          </div>

          {/* 時間 */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">發生時間</span>
            <span className="text-sm">{new Date(activity.timestamp).toLocaleString("zh-TW")}</span>
          </div>

          <Separator />

          {/* 詳細資訊 */}
          <div className="space-y-3">
            {activity.details.username && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">用戶</span>
                <span className="text-sm font-mono">{activity.details.username}</span>
              </div>
            )}

            {activity.details.storeName && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">店家</span>
                <span className="text-sm">{activity.details.storeName}</span>
              </div>
            )}

            {activity.orderId && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">訂單編號</span>
                <span className="text-sm font-mono">{activity.orderId}</span>
              </div>
            )}

            {activity.details.orderTotal && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">訂單金額</span>
                <span className="text-sm font-medium">{formatCurrency(activity.details.orderTotal)}</span>
              </div>
            )}

            {activity.details.orderItems && activity.details.orderItems.length > 0 && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">訂單商品</span>
                <div className="mt-2 space-y-1">
                  {activity.details.orderItems.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-xs bg-muted/50 p-2 rounded">
                      <span>
                        {item.name} x{item.quantity}
                      </span>
                      <span>{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* 活動描述 */}
          <div>
            <span className="text-sm font-medium text-muted-foreground">活動描述</span>
            <p className="text-sm mt-1 p-2 bg-muted/50 rounded">
              {ActivityService.formatActivityDescription(activity)}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
