// components/cancel-order-dialog.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cancelOrder, canComplete } from "@/lib/order-service";

export function CancelOrderDialog({ order }: { order: any }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const disabled =
    !order ||
    order.status === "completed" ||
    order.status === "canceled";

  if (disabled) return null;

  const onConfirm = () => {
    cancelOrder(order.id, reason.trim());
    setOpen(false);
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        取消訂單
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認取消訂單？</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <div className="text-sm text-muted-foreground">
              取消後無法復原，請輸入取消原因（可留空）。
            </div>
            <Textarea
              placeholder="輸入取消原因（選填）"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              返回
            </Button>
            <Button variant="destructive" onClick={onConfirm}>
              確認取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
