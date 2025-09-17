// lib/server/order-id.ts
import { prisma } from "@/lib/db/client"
import { formatInTimeZone } from "date-fns-tz"

export async function nextOrderId(storeId: string) {
  // 取店家代號；若 DB 還沒有，支援 store1/2/3 後援
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { storeCode: true },
  })

  let storeCode = store?.storeCode ?? null
  if (!storeCode) {
    const m = /^store(\d+)$/.exec(storeId)
    if (m) storeCode = String(parseInt(m[1], 10)).padStart(3, "0")
  }
  if (!storeCode) throw new Error("找不到店家代號")

  // 以台北時區生成年月日（YYYYMMDD）
  const dateStr = formatInTimeZone(new Date(), "Asia/Taipei", "yyyyMMdd")

  // 以 upsert 提升併發安全，序號自動 +1
  const c = await prisma.orderCounter.upsert({
    where: { storeId_dateStr: { storeId, dateStr } },
    create: { storeId, dateStr, seq: 1 },
    update: { seq: { increment: 1 } },
    select: { seq: true },
  })

  const seq = String(c.seq).padStart(3, "0")
  return `order-${storeCode}-${dateStr}-${seq}`
}
