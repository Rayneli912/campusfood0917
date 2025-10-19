import crypto from "crypto"

/** 代碼有效分鐘數（預設 30 分鐘） */
export const TOKEN_TTL_MINS = 30

// ======================================
// 貼文代碼管理工具
// ======================================
export class PostTokenManager {
  // 生成 6 碼代碼（大寫 A-Z 去掉易混字 + 數字 2-9）
  private static readonly CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

  /** 生成 6 位貼文代碼（使用 crypto 強隨機） */
  static generateToken(): string {
    const len = 6
    const buf = crypto.randomBytes(len)
    let out = ""
    for (let i = 0; i < len; i++) {
      out += this.CHARS[buf[i] % this.CHARS.length]
    }
    return out
  }

  /** 計算代碼的 SHA-256 雜湊（可選擇加 SALT） */
  static hashToken(token: string): string {
    const salt = process.env.POST_TOKEN_SALT || ""
    return crypto
      .createHash("sha256")
      .update(`${salt}:${String(token || "").toUpperCase()}`)
      .digest("hex")
  }

  /** 驗證代碼是否匹配雜湊 */
  static verifyToken(token: string, hash: string): boolean {
    try {
      const a = Buffer.from(this.hashToken(token))
      const b = Buffer.from(hash)
      return a.length === b.length && crypto.timingSafeEqual(a, b)
    } catch {
      return false
    }
  }

  /** （相容舊版）以「天」計算過期時間（預設 7 天） */
  static getExpirationDate(days: number = 7): string {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d.toISOString()
  }

  /** 以「分鐘」計算過期時間（預設 TOKEN_TTL_MINS） */
  static getExpirationDateMinutes(minutes: number = TOKEN_TTL_MINS): string {
    return new Date(Date.now() + minutes * 60 * 1000).toISOString()
  }

  /** 檢查代碼是否已過期 */
  static isTokenExpired(expiresAt: string): boolean {
    return Date.now() > new Date(expiresAt).getTime()
  }
}

// ======================================
// LINE 訊息格式解析（寬鬆版）
// - 不強制【】
// - 全/半形冒號皆可
// - 同一行可多欄位
// - 順序不限
// - 必填：地點、物品、數量、領取期限
// - 數量支援：阿拉伯數字／全形數字／中文數字（兩、十、百、千…）；單位可寫可不寫
// ======================================

export type ParsedFields = {
  location?: string
  item?: string
  quantity?: string  // ★ 改为string，允许任何文本
  /** 使用者輸入的數量單位（杯/份/個/盒/包…），不影響數值（已废弃，保留兼容性） */
  quantityUnit?: string
  deadline?: string
  note?: string
}

const REQUIRED_KEYS: (keyof ParsedFields)[] = ["location", "item", "quantity", "deadline"]

const ALIASES: Record<keyof ParsedFields, string[]> = {
  location: ["地點", "位置", "店家", "店名", "店舖", "地點位置"],
  item: ["物品", "商品", "品項", "物件", "物品名稱"],
  quantity: ["數量", "數目", "件數", "qty", "份數"],
  deadline: ["領取期限", "領取時間", "截止時間", "領取截止", "期限", "截止"],
  note: ["備註", "備注", "備考", "註記", "說明", "其他"],
}

function allAliasUnion(): string[] {
  const set = new Set<string>()
  Object.values(ALIASES).forEach((arr) => arr.forEach((a) => set.add(a)))
  return Array.from(set)
}
const ALL_ALIASES = allAliasUnion()

function aliasToKey(label: string): keyof ParsedFields | null {
  for (const [key, arr] of Object.entries(ALIASES) as [keyof ParsedFields, string[]][]) {
    if (arr.includes(label)) return key
  }
  return null
}

function normalizeText(s: string) {
  return String(s || "")
    .replace(/^\uFEFF/, "")
    .replace(/\r/g, "\n")
    .replace(/：/g, ":")
}

/** 半/全形數字轉半形 */
function normalizeDigits(s: string) {
  return s.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFF10 + 0x30))
}

/** 中文數字 → 整數（支援 0–9999；兩=二） */
function zhNumToInt(input: string): number | null {
  const s = input.replace(/兩/g, "二").replace(/〇/g, "零")
  const digit: Record<string, number> = { 零:0, 一:1, 二:2, 三:3, 四:4, 五:5, 六:6, 七:7, 八:8, 九:9 }
  const unit: Record<string, number> = { 十:10, 百:100, 千:1000 }
  let section = 0
  let number = 0
  let hasZh = false
  for (const ch of s) {
    if (ch in digit) {
      number = digit[ch]; hasZh = true
    } else if (ch in unit) {
      hasZh = true
      const u = unit[ch]
      if (number === 0) number = 1
      section += number * u
      number = 0
    } else {
      // 非數字字元略過
    }
  }
  const total = section + number
  if (!hasZh) return null
  return total
}

/** 擷取數量與單位（5、５、五、三十、6杯、五個…） */
function extractQuantityAndUnit(raw: string): { n?: number; unit?: string } {
  let s = normalizeDigits(raw).trim()
  // 先找阿拉伯數字
  const mNum = s.match(/(\d{1,4})(?:\s*([^\d\s]{1,3}))?/)
  if (mNum) {
    const n = parseInt(mNum[1], 10)
    // 單位：常見量詞白名單（可擴充）
    const unit = (mNum[2] || "").trim()
    const allowedUnit = unit && /^(杯|份|個|碗|盒|包|袋|片|支|隻|串|塊|瓶|罐|顆|人|套|台|間|本|把)$/.test(unit) ? unit : undefined
    return { n, unit: allowedUnit }
  }
  // 再嘗試中文數字
  const mZh = s.match(/([零〇一二兩三四五六七八九十百千]+)\s*([^\d\s]{0,3})/)
  if (mZh) {
    const n = zhNumToInt(mZh[1])
    const unit = (mZh[2] || "").trim()
    const allowedUnit = unit && /^(杯|份|個|碗|盒|包|袋|片|支|隻|串|塊|瓶|罐|顆|人|套|台|間|本|把)$/.test(unit) ? unit : undefined
    return { n: n ?? undefined, unit: allowedUnit }
  }
  return {}
}

/** 將文字用「別名 + :」掃描，擷取到下一個別名出現前的值（冒號可選） */
function parseLooseKeyValues(raw: string): ParsedFields {
  const text = normalizeText(raw).replace(/[【】]/g, "")
  const aliasGroup = ALL_ALIASES.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")
  // ★ 修改正則：冒號變為可選 `:?`，支援「【地點】測試」和「【地點】：測試」兩種格式
  const re = new RegExp(`(?:^|\\s)(${aliasGroup})\\s*:?\\s*`, "gi")
  const hits: { label: string; start: number; valueStart: number }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    hits.push({ label: m[1], start: m.index, valueStart: re.lastIndex })
  }

  const fields: ParsedFields = {}
  for (let i = 0; i < hits.length; i++) {
    const cur = hits[i]
    const next = hits[i + 1]
    const value = text.slice(cur.valueStart, next ? next.start : undefined).trim()
    const key = aliasToKey(cur.label)
    if (!key) continue
    // ★ 数量字段现在直接接受任何文本
    ;(fields as any)[key] = value
  }
  return fields
}

/** 將欄位轉回「標準五行（含【】）」；數量直接使用原文本 */
export function toCanonicalContent(fields: Required<Pick<ParsedFields, "location" | "item" | "quantity" | "deadline">> & { note?: string; quantityUnit?: string }) {
  return [
    `【地點】：${fields.location}`,
    `【物品】：${fields.item}`,
    `【數量】：${fields.quantity}`,
    `【領取期限】：${fields.deadline}`,
    `【備註】：${fields.note ?? ""}`,
  ].join("\n")
}

export class LineMessageParser {
  /** 解析「五行內容」或寬鬆內容（不含代碼） */
  static parseNewPostMessage(message: string): {
    success: boolean
    data?: {
      location: string
      item: string
      quantity: string  // ★ 改为string类型
      quantityUnit?: string
      deadline?: string
      note?: string
    }
    errors?: string[]
  } {
    const fields = parseLooseKeyValues(message)
    const missing: string[] = []
    for (const k of REQUIRED_KEYS) {
      // ★ 数量字段只检查是否存在且不为空字符串
      if (!fields[k] || String(fields[k]).trim() === "") {
        missing.push(k === "location" ? "地點" : k === "item" ? "物品" : k === "quantity" ? "數量" : "領取期限")
      }
    }
    if (missing.length > 0) {
      return { success: false, errors: missing }
    }
    return {
      success: true,
      data: {
        location: fields.location!,
        item: fields.item!,
        quantity: fields.quantity!,
        quantityUnit: fields.quantityUnit,
        deadline: fields.deadline,
        note: fields.note,
      },
    }
  }

  /** 解析「修改+代碼 + 內容」（寬鬆；允許空白/全形＋） */
  static parseEditPostMessage(message: string): {
    success: boolean
    token?: string
    data?: {
      location: string
      item: string
      quantity: string  // ★ 改为string类型
      quantityUnit?: string
      deadline?: string
      note?: string
    }
    errors?: string[]
  } {
    // 允許：修改+CODE / 修改＋CODE / 修改 + CODE
    const tokenMatch = message.match(/修改\s*[+＋]\s*([A-Za-z0-9]{4,16})/i)
    if (!tokenMatch) return { success: false, errors: ["缺少「修改+貼文代碼」"] }
    const token = tokenMatch[1].toUpperCase()
    const contentPart = message.replace(tokenMatch[0], " ")
    const fields = parseLooseKeyValues(contentPart)

    const missing: string[] = []
    for (const k of REQUIRED_KEYS) {
      // ★ 数量字段只检查是否存在且不为空字符串
      if (!fields[k] || String(fields[k]).trim() === "") {
        missing.push(k === "location" ? "地點" : k === "item" ? "物品" : k === "quantity" ? "數量" : "領取期限")
      }
    }
    if (missing.length > 0) {
      return { success: false, token, errors: missing }
    }
    return {
      success: true,
      token,
      data: {
        location: fields.location!,
        item: fields.item!,
        quantity: fields.quantity!,
        quantityUnit: fields.quantityUnit,
        deadline: fields.deadline,
        note: fields.note,
      },
    }
  }

  /** 生成格式教學文字（補充：數量可寫中文或加單位） */
  static getFormatInstructions(token?: string): string {
    const t = token || "XXXXXX"
    return (
      `請於 ${TOKEN_TTL_MINS} 分鐘內回覆（以下擇一）：\n\n` +
      `方式 A（標準五行）\n` +
      `修改+${t}\n【地點】：行政大樓一樓\n【物品】：便當\n【數量】：3份（可寫「三份 / 3 / ３ / 三」）\n【領取期限】：今天 18:00\n【備註】：素食兩份\n\n` +
      `方式 B（寬鬆、同一行也可、全/半形冒號皆可）\n` +
      `修改 + ${t}  地點: 行政大樓一樓  物品: 便當  數量: 五份  領取期限: 今天18:00  備註: 可微波\n\n` +
      `＊必填：地點、物品、數量、領取期限；數量可寫中文數字且單位可省略。`
    )
  }
}
