import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/client"

// 前端請傳 items:[{ foodItemId?, name, price, quantity }]

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const userId   = String(body?.userId || "demo-user")
    const storeId  = String(body?.storeId || "")
    const note     = body?.note ? String(body.note) : null
    const expiresAt = body?.expiresAt ? new Date(body.expiresAt) : null
    const items = Array.isArray(body?.items) ? body.items : []

    if (!storeId) {
      return NextResponse.json({ error: "缺少 storeId" }, { status: 400 })
    }
    if (items.length === 0) {
      return NextResponse.json({ error: "items 不能為空" }, { status: 400 })
    }

    // （可選）確認店家存在
    const store = await prisma.store.findUnique({ where: { id: storeId }, select: { id: true } })
    if (!store) {
      return NextResponse.json({ error: "店家不存在" }, { status: 404 })
    }

    // 建立訂單（狀態沿用你現有小寫字串）
    const order = await prisma.order.create({
      data: {
        userId,
        storeId,
        status: "pending",
        note,
        expiresAt,
        items: {
          create: items.map((it: any) => ({
            foodItemId: it.foodItemId ?? null, // 若有關聯商品就帶；沒有也可為 null
            name: String(it.name),
            price: Number(it.price),
            quantity: Number(it.quantity),
          })),
        },
      },
      include: { items: true },
    })

    // 你若有 OrderEvent 模型、想記錄事件，可在這裡再建立一筆 CREATED 事件

    return NextResponse.json({ data: order }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "建立訂單失敗" }, { status: 500 })
  }
}
