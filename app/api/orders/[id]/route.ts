// app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/client"

type OrderStatus = "pending" | "accepted" | "prepared" | "completed" | "cancelled" | "rejected"

const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  pending:   ["accepted", "cancelled", "rejected"],
  accepted:  ["prepared", "cancelled", "rejected"],
  prepared:  ["completed", "cancelled", "rejected"],
  completed: [],
  cancelled: [],
  rejected:  [],
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const data = await prisma.order.findUnique({ where: { id: params.id }, include: { items: true } })
  if (!data) return new NextResponse("Not Found", { status: 404 })
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const newStatus = String(body?.status || "").toLowerCase() as OrderStatus
    const reason = body?.reason ?? null
    const now = new Date()

    if (!["pending","accepted","prepared","completed","cancelled","rejected"].includes(newStatus)) {
      return new NextResponse("Invalid status", { status: 400 })
    }

    const current = await prisma.order.findUnique({
      where: { id: params.id },
      include: { items: true },
    })
    if (!current) return new NextResponse("Not Found", { status: 404 })

    if (current.status === newStatus) {
      return NextResponse.json({ data: current }) // 冪等
    }

    const allowed = ALLOWED[current.status as OrderStatus] ?? []
    if (!allowed.includes(newStatus)) {
      return new NextResponse(`Invalid transition: ${current.status} -> ${newStatus}`, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      // pending -> accepted 扣庫存；若扣完=0，isListed=false
      if (current.status === "pending" && newStatus === "accepted") {
        const ids = current.items.map((it) => it.foodItemId).filter(Boolean) as string[]
        if (ids.length) {
          const stocks = await tx.foodItem.findMany({ where: { id: { in: ids } }, select: { id: true, quantity: true } })
          for (const oi of current.items) {
            if (!oi.foodItemId) continue
            const s = stocks.find((x) => x.id === oi.foodItemId)
            const next = Number(s?.quantity ?? 0) - Number(oi.quantity)
            if (next < 0) throw new Error(`INSUFFICIENT_STOCK:${oi.foodItemId}`)
          }
          for (const oi of current.items) {
            if (!oi.foodItemId) continue
            const s = stocks.find((x) => x.id === oi.foodItemId)!
            const next = Number(s?.quantity ?? 0) - Number(oi.quantity)
            await tx.foodItem.update({
              where: { id: oi.foodItemId },
              data: { quantity: { decrement: oi.quantity } },
            })
            if (next <= 0) {
              await tx.foodItem.update({
                where: { id: oi.foodItemId },
                data: { isListed: false }, // ⭐ 賣完自動下架
              })
            }
          }
        }
      }

      // accepted/prepared -> cancelled/rejected 回補庫存（不自動上架）
      if ((newStatus === "cancelled" || newStatus === "rejected")
        && (current.status === "accepted" || current.status === "prepared")) {
        for (const oi of current.items) {
          if (!oi.foodItemId) continue
          await tx.foodItem.update({
            where: { id: oi.foodItemId },
            data: { quantity: { increment: oi.quantity } },
          })
        }
      }

      await tx.order.update({
        where: { id: params.id },
        data: {
          status: newStatus,
          statusReason: reason,
          updatedAt: now,
          acceptedAt:  newStatus === "accepted"  ? now : undefined,
          preparedAt:  newStatus === "prepared"  ? now : undefined,
          completedAt: newStatus === "completed" ? now : undefined,
          cancelledAt: newStatus === "cancelled" ? now : undefined,
          rejectedAt:  newStatus === "rejected"  ? now : undefined,
        },
      })
    })

    const refreshed = await prisma.order.findUnique({ where: { id: params.id }, include: { items: true } })
    return NextResponse.json({ data: refreshed })
  } catch (e: any) {
    const msg = String(e?.message || "")
    if (msg.startsWith("INSUFFICIENT_STOCK")) {
      return new NextResponse("庫存不足，無法接受此訂單", { status: 409 })
    }
    console.error(e)
    return new NextResponse("更新失敗", { status: 500 })
  }
}
