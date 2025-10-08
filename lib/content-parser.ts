// lib/content-parser.ts
"use client"

export type ParsedLinePost = {
  location?: string
  item?: string
  quantity?: string  // ★ 改为string，支持任意文本
  deadline?: string
  note?: string
}

const KEY_MAP: Record<string, keyof ParsedLinePost> = {
  // 地點
  "地點": "location", "位置": "location", "店家": "location", "店舖": "location", "店名": "location", "地點位置": "location",
  // 物品
  "物品": "item", "商品": "item", "品項": "item", "物件": "item", "物品名稱": "item",
  // 數量
  "數量": "quantity", "數目": "quantity", "件數": "quantity", "qty": "quantity", "份數": "quantity",
  // 期限
  "領取期限": "deadline", "期限": "deadline", "領取時間": "deadline", "截止": "deadline", "截止時間": "deadline", "領取截止": "deadline",
  // 備註
  "備註": "note", "備考": "note", "註記": "note", "備注": "note", "說明": "note", "其他": "note",
}

function normalize(text: string) {
  return (text || "")
    .replace(/^\uFEFF/, "")
    .replace(/\r/g, "\n")
    .replace(/：/g, ":")
    .trim()
}

/** 解析：先試【】五行；不成再用寬鬆別名掃描（可同一行多欄位） */
export function parseLineContent(raw: string): ParsedLinePost {
  const text = normalize(raw)
  const out: ParsedLinePost = {}
  if (!text) return out

  // 1) 優先嘗試【】五行
  const reBox = /【\s*([^】]+?)\s*】\s*[:：]?\s*([\s\S]*?)(?=(?:\n?\s*【)|$)/g
  let matched = false
  let m: RegExpExecArray | null
  while ((m = reBox.exec(text)) !== null) {
    matched = true
    const rawKey = m[1].trim()
    const val = (m[2] ?? "").trim()
    const key =
      KEY_MAP[rawKey] ||
      KEY_MAP[rawKey.replace(/\s+/g, "")]
    if (!key) continue
    // ★ 数量字段现在直接接受任何文本
    ;(out as any)[key] = val
  }
  if (matched) return out

  // 2) 寬鬆解析：別名 + : 直到下一個別名或結尾
  const aliasList = Object.keys(KEY_MAP)
  const aliasGroup = aliasList.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")
  const re = new RegExp(`(?:^|\\s)(${aliasGroup})\\s*:\\s*`, "gi")
  const hits: { label: string; start: number; valueStart: number }[] = []
  while ((m = re.exec(text.replace(/[【】]/g, ""))) !== null) {
    hits.push({ label: m[1], start: m.index, valueStart: re.lastIndex })
  }
  for (let i = 0; i < hits.length; i++) {
    const cur = hits[i]
    const next = hits[i + 1]
    const value = text.slice(cur.valueStart, next ? next.start : undefined).trim()
    const key = KEY_MAP[cur.label]
    if (!key) continue
    // ★ 数量字段现在直接接受任何文本
    ;(out as any)[key] = value
  }
  return out
}

export function validateLinePost(raw: string) {
  const data = parseLineContent(raw)
  const missing: string[] = []
  if (!data.location) missing.push("地點")
  if (!data.item) missing.push("物品")
  // ★ 数量字段只检查是否存在且不为空字符串
  if (!data.quantity || data.quantity.trim() === "") missing.push("數量")
  if (!data.deadline) missing.push("領取期限")
  return { ok: missing.length === 0, missing, data }
}
