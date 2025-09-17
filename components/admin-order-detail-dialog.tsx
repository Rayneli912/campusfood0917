"use client"

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface Props {
  isOpen: boolean
  onClose: () => void
  order: any
  onUpdateStatus: (orderId: string, newStatus: string, reason?: string) => Promise<boolean> | boolean
}

export default function AdminOrderDetailDialog({ isOpen, onClose, order, onUpdateStatus }: Props) {
  const fmt = (s?: string) => (s ? format(new Date(s), "yyyy/MM/dd HH:mm", { locale: zhTW }) : "")
  const storeCode = typeof order?.id === "string" && order.id.includes("-") ? order.id.split("-")[1] : order?.storeCode || ""

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>訂單詳情</DialogTitle>
          <DialogDescription>訂單編號：{String(order?.id ?? "")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">送出時間：{fmt(order?.createdAt)}</div>
            <div className={cn(
              "px-2 py-1 rounded-full text-sm",
              order.status === "pending" ? "bg-yellow-100 text-yellow-800" :
              order.status === "accepted" ? "bg-blue-100 text-blue-800" :
              order.status === "prepared" ? "bg-green-100 text-green-800" :
              order.status === "completed" ? "bg-green-100 text-green-800" :
              "bg-red-100 text-red-800",
            )}>
              {order.status === "pending" ? "等待確認" :
               order.status === "accepted" ? "準備中" :
               order.status === "prepared" ? "已準備" :
               order.status === "completed" ? "已完成" :
               order.status === "cancelled" ? "已取消" : "已拒絕"}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">訂單進度</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">建立時間：</span><span>{fmt(order.createdAt)}</span></div>
              {order.acceptedAt && <div className="flex justify-between"><span className="text-muted-foreground">店家接單：</span><span>{fmt(order.acceptedAt)}</span></div>}
              {order.preparedAt && <div className="flex justify-between"><span className="text-muted-foreground">準備完成：</span><span>{fmt(order.preparedAt)}</span></div>}
              {order.completedAt && <div className="flex justify-between"><span className="text-muted-foreground">訂單完成：</span><span>{fmt(order.completedAt)}</span></div>}
              {order.cancelledAt && <div className="flex justify-between"><span className="text-muted-foreground">訂單取消：</span><span>{fmt(order.cancelledAt)}</span></div>}
              {order.rejectedAt && <div className="flex justify-between"><span className="text-muted-foreground">訂單拒絕：</span><span>{fmt(order.rejectedAt)}</span></div>}
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">店家名稱：</span><span>{order.storeName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">店家代號：</span><span>{storeCode || "000"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">金額：</span><span>NT$ {order.total}</span></div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="font-medium">顧客資訊</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">姓名：</span><span>{order.customerInfo?.name}</span></div>
              <div><span className="text-muted-foreground">電話：</span><span>{order.customerInfo?.phone}</span></div>
              {order.customerInfo?.email && <div className="col-span-2"><span className="text-muted-foreground">Email：</span><span>{order.customerInfo.email}</span></div>}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="font-medium">訂單商品</h3>
            <div className="space-y-2">
              {(order.items ?? []).map((item: any) => (
                <div key={String(item.id ?? item.name)} className="flex justify-between text-sm">
                  <span>{item.name}</span>
                  <div className="space-x-4">
                    <span>x{item.quantity}</span>
                    <span className="text-muted-foreground">NT$ {item.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(order.status !== "completed" && order.status !== "cancelled" && order.status !== "rejected") && (
            <>
              <Separator />
              <div className="flex justify-end gap-2">
                {order.status === "pending" && (
                  <>
                    <Button variant="outline" onClick={() => onUpdateStatus(order.id, "rejected")}>拒絕</Button>
                    <Button onClick={() => onUpdateStatus(order.id, "accepted")}>接單</Button>
                  </>
                )}
                {order.status === "accepted" && <Button onClick={() => onUpdateStatus(order.id, "prepared")}>標記為準備完成</Button>}
                {order.status === "prepared" && <Button onClick={() => onUpdateStatus(order.id, "completed")}>完成訂單</Button>}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
