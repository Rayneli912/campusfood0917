// /app/api/line/webhook/route.ts
import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { setDefaultResultOrder } from "dns"
import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  PostTokenManager,
  LineMessageParser,
  TOKEN_TTL_MINS,
  toCanonicalContent,
} from "@/lib/post-token-manager"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

try { setDefaultResultOrder("ipv4first") } catch {}

const PUBLISHED_TTL_DAYS = Number(process.env.PUBLISHED_TTL_DAYS || 7)
const REMIND_WINDOW_SECS = 60

const TABLE = "near_expiry_posts"
const BUCKET = "near_expiry_images"
const PREFS = "line_user_settings"
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || ""

const VERIFY_TOKENS = new Set([
  "00000000000000000000000000000000",
  "ffffffffffffffffffffffffffffffff",
])

/** 只有加這個：把時間顯示成 2025/09/21 11:40:25（台北時區） */
function formatTsForTW(d: Date | string | number) {
  const dt = d instanceof Date ? d : new Date(d)
  return dt.toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  })
}

// ===================== 共用：ENV / 驗章 / LINE API =====================
function env(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

function verifySignature(rawBody: string, signatureHeader: string | null) {
  if (!signatureHeader) return false
  try {
    const mac = crypto.createHmac("sha256", env("LINE_CHANNEL_SECRET"))
    mac.update(rawBody)
    const expectedB64 = mac.digest("base64")
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader, "base64"),
      Buffer.from(expectedB64, "base64"),
    )
  } catch {
    return false
  }
}

async function replyMessages(replyToken: string | undefined, messages: any[]) {
  if (!replyToken || messages.length === 0 || VERIFY_TOKENS.has(replyToken)) return
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 3500)
  try {
    const res = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env("LINE_CHANNEL_ACCESS_TOKEN")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ replyToken, messages }),
      signal: controller.signal,
    })
    if (!res.ok) {
      const errorText = await res.text()
      console.error("LINE reply error", res.status, errorText)
      // 額度用完或其他 LINE API 錯誤不應影響主要功能
      if (res.status === 429 || res.status === 403) {
        console.warn("[LINE] 訊息額度可能已用完或權限問題，但不影響資料庫操作")
      }
    }
  } catch (e) {
    console.error("LINE reply error", e)
    // 捕獲所有錯誤，確保不會影響主流程
  } finally { clearTimeout(timer) }
}
async function replyText(replyToken: string | undefined, text: string) {
  // 包裝成完全安全的操作，失敗也不會拋出錯誤
  try {
    await replyMessages(replyToken, [{ type: "text", text }])
  } catch (e) {
    console.error("replyText error (non-critical):", e)
  }
}

async function pushTo(userId: string, messages: any[]) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 3500)
  try {
    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env("LINE_CHANNEL_ACCESS_TOKEN")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: userId, messages }),
      signal: controller.signal,
    })
  } catch (e) {
    console.error("LINE push error", e)
  } finally { clearTimeout(timer) }
}
async function multicastTo(userIds: string[], messages: any[]) {
  if (!userIds.length) return
  const CHUNK = 500
  for (let i = 0; i < userIds.length; i += CHUNK) {
    const batch = userIds.slice(i, i + CHUNK)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    try {
      const res = await fetch("https://api.line.me/v2/bot/message/multicast", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env("LINE_CHANNEL_ACCESS_TOKEN")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to: batch, messages }),
        signal: controller.signal,
      })
      if (!res.ok) {
        console.warn("multicast fallback to push:", res.status, await res.text())
        for (const uid of batch) await pushTo(uid, messages)
      }
    } catch (e) {
      console.error("LINE multicast error", e)
      for (const uid of batch) await pushTo(uid, messages)
    } finally { clearTimeout(timer) }
  }
}

// ===================== LINE 用戶資料獲取 =====================
async function getLineUserProfile(userId: string): Promise<{ displayName: string } | null> {
  try {
    const controller = new AbortController()
    // ★ 縮短超時時間到 1.5 秒，避免阻塞主流程
    const timer = setTimeout(() => controller.abort(), 1500)
    const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: {
        Authorization: `Bearer ${env("LINE_CHANNEL_ACCESS_TOKEN")}`,
      },
      signal: controller.signal,
    })
    clearTimeout(timer)
    
    if (!res.ok) {
      console.warn(`[LINE] 獲取用戶資料失敗 (${res.status})，跳過更新暱稱`)
      return null
    }
    
    const data = await res.json()
    return {
      displayName: data.displayName || null,
    }
  } catch (e) {
    // ★ 靜默處理錯誤，不影響主流程
    console.warn("[LINE] 無法獲取用戶資料（網路問題），跳過更新暱稱")
    return null
  }
}

// ===================== 訂閱偏好 / 群播通知 =====================
async function upsertUserFollow(userId: string, followed: boolean, displayName?: string) {
  const updateData: any = { user_id: userId, followed }
  if (displayName) {
    updateData.display_name = displayName
    updateData.last_name_update = new Date().toISOString()
  }
  await supabaseAdmin.from(PREFS).upsert(updateData, { onConflict: "user_id" })
}
async function setNotifyPref(userId: string, enable: boolean, displayName?: string) {
  const updateData: any = { user_id: userId, notify_new_post: enable, followed: true }
  if (displayName) {
    updateData.display_name = displayName
    updateData.last_name_update = new Date().toISOString()
  }
  await supabaseAdmin.from(PREFS).upsert(updateData, { onConflict: "user_id" })
}
async function getNotifyPref(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from(PREFS)
    .select("notify_new_post")
    .eq("user_id", userId)
    .maybeSingle()
  return Boolean(data?.notify_new_post)
}
async function getSubscribedUserIds(): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from(PREFS)
    .select("user_id")
    .eq("notify_new_post", true)
    .eq("followed", true)
  if (error) { console.error("fetch subscribers error", error); return [] }
  return (data || []).map((r: any) => r.user_id)
}

// ===================== 更新用戶暱稱（非關鍵功能，完全異步） =====================
function updateUserDisplayName(userId: string) {
  // ★ 改為完全非阻塞：直接返回 Promise，不等待結果
  Promise.resolve().then(async () => {
    try {
      const profile = await getLineUserProfile(userId)
      if (profile?.displayName) {
        await supabaseAdmin.from(PREFS).upsert(
          {
            user_id: userId,
            display_name: profile.displayName,
            last_name_update: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )
        console.log(`[LINE] ✓ 已更新用戶暱稱: ${profile.displayName}`)
      }
    } catch (e) {
      // ★ 靜默處理，完全不影響主流程
      console.warn("[LINE] 更新用戶暱稱失敗（不影響發佈功能）")
    }
  }).catch(() => {
    // ★ 雙重保險，確保任何錯誤都不會冒泡
  })
}
/** ★只有改這裡：多一個時間字串參數 */
async function broadcastNewPostNotice(tsLabel: string) {
  try {
    const message =
      `${tsLabel} 有新的即期食品出現囉！快到惜食快go官網看看！👀` +
      (SITE_URL ? `\n${SITE_URL}` : "")
    const uids = await getSubscribedUserIds()
    if (!uids.length) {
      console.log("[LINE] 沒有訂閱用戶，跳過推播")
      return
    }
    console.log(`[LINE] 準備推播給 ${uids.length} 位訂閱用戶`)
    await multicastTo(uids, [{ type: "text", text: message }])
    console.log("[LINE] 推播完成")
  } catch (e) {
    // 推播失敗不應影響發佈到網頁的功能
    console.error("[LINE] 推播通知失敗（不影響發佈）:", e)
  }
}

// ===================== 圖片上傳 & 清理（原樣保留） =====================
async function fetchLineImage(messageId: string): Promise<{ buf: Buffer; mime: string } | null> {
  try {
    const r = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
      headers: { Authorization: `Bearer ${env("LINE_CHANNEL_ACCESS_TOKEN")}` },
    })
    if (!r.ok) { console.error("LINE image fetch error", r.status, await r.text()); return null }
    return { buf: Buffer.from(await r.arrayBuffer()), mime: r.headers.get("content-type") || "image/jpeg" }
  } catch (e) { console.error("LINE image fetch error", e); return null }
}
async function ensureBucket() { try { await supabaseAdmin.storage.createBucket(BUCKET, { public: true }) } catch {} }
async function uploadImageToBucket(userId: string, buf: Buffer, mime: string) {
  await ensureBucket()
  const ext = mime.includes("png") ? "png" : "jpg"
  const key = `${userId || "unknown"}/${Date.now()}.${ext}`
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(key, buf, { contentType: mime })
  if (error) throw error
  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(key)
  return { publicUrl: data.publicUrl }
}
function storagePathFromPublicUrl(u?: string | null) {
  if (!u) return null
  const m = u.match(/\/near_expiry_images\/(.+)$/)
  return m ? m[1] : null
}
async function removeFromStorage(publicUrl?: string | null) {
  const p = storagePathFromPublicUrl(publicUrl)
  if (p) await supabaseAdmin.storage.from(BUCKET).remove([p]).catch(() => {})
}
async function cleanupExpiredDrafts() {
  const nowIso = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from(TABLE).select("id,image_url").eq("status","draft")
    .lt("token_expires_at", nowIso).limit(200)
  if (error) { console.error("[cleanup] draft select", error); return }
  if (!data?.length) return
  await Promise.all(data.map((r:any)=>removeFromStorage(r.image_url)))
  const { error: delErr } = await supabaseAdmin.from(TABLE).delete().in("id", data.map((r:any)=>r.id))
  if (delErr) console.error("[cleanup] draft delete", delErr)
}
async function cleanupExpiredPublished() {
  const nowIso = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from(TABLE).select("id,image_url").eq("status","published")
    .lt("token_expires_at", nowIso).limit(200)
  if (error) { console.error("[cleanup] published select", error); return }
  if (!data?.length) return
  await Promise.all(data.map((r:any)=>removeFromStorage(r.image_url)))
  const { error: delErr } = await supabaseAdmin.from(TABLE).delete().in("id", data.map((r:any)=>r.id))
  if (delErr) console.error("[cleanup] published delete", delErr)
}
let lastCleanup = 0
function scheduleCleanup() {
  if (Date.now() - lastCleanup < 10 * 60 * 1000) return
  lastCleanup = Date.now()
  ;(async () => {
    try {
      await cleanupExpiredDrafts()
      await cleanupExpiredPublished()
    } catch (e) {
      console.error("[cleanup] error", e)
    }
  })()
}

// ===================== 指令解析（保留） =====================
const OPEN_RE   = /(開啟|訂閱).*(通知|推播)/
const CLOSE_RE  = /(關閉|取消|退訂).*(通知|推播)/
const STATUS_RE = /(通知狀態|查詢通知)/

function normalizeSimple(s: string) {
  return (s || "").replace(/\s+/g, "").replace(/[，。！!、．。]/g, "")
}

function extractToken(text: string): string | null {
  const m = text.match(/修改\s*[+＋]\s*([A-Za-z0-9]{4,16})/i)
  return m ? m[1].toUpperCase() : null
}
function extractCancelToken(text: string): string | null {
  const m = text.match(/^取消\s*[+＋]\s*([A-Za-z0-9]{4,16})$/i)
  return m ? m[1].toUpperCase() : null
}
function parsePostbackData(s?: string | null): Record<string,string> {
  const out: Record<string,string> = {}
  if (!s) return out
  for (const seg of s.split("&")) {
    const [k,v] = seg.split("=")
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v || "")
  }
  return out
}

// ===================== 取消草稿（保留） =====================
async function cancelByToken(token: string) {
  const { data, error } = await supabaseAdmin
    .from(TABLE).select("id,status,image_url").eq("post_token_hash", PostTokenManager.hashToken(token)).maybeSingle()
  if (error || !data) return { ok:false, reason:"not_found" as const }
  if ((data as any).status !== "draft") return { ok:false, reason:"not_draft" as const }
  await removeFromStorage((data as any).image_url)
  await supabaseAdmin.from(TABLE).delete().eq("id", (data as any).id)
  return { ok:true as const }
}
async function cancelAllDraftsOfUser(userId?: string) {
  if (!userId) return { ok:false, count:0 }
  const { data, error } = await supabaseAdmin
    .from(TABLE).select("id,image_url").eq("status","draft").eq("line_user_id", userId)
  if (error) return { ok:false, count:0 }
  if (!data?.length) return { ok:true, count:0 }
  await Promise.all(data.map((r:any)=>removeFromStorage(r.image_url)))
  await supabaseAdmin.from(TABLE).delete().in("id", data.map((r:any)=>r.id))
  return { ok:true, count:data.length }
}
async function handleCancel(text:string, userId:string|undefined, replyToken:string|undefined){
  const t = extractCancelToken(text)
  if (t) {
    const r = await cancelByToken(t)
    if (r.ok) await replyText(replyToken, `已取消貼文草稿（代碼 ${t}），圖片已刪除。`)
    else if (r.reason==="not_draft") await replyText(replyToken, "該代碼不是草稿（可能已發佈或已刪除）。")
    else await replyText(replyToken, "找不到對應代碼。")
    return
  }
  const r = await cancelAllDraftsOfUser(userId)
  if (r.ok) await replyText(replyToken, r.count>0 ? `已為你取消 ${r.count} 筆草稿與照片。` : "目前沒有可取消的草稿。")
  else await replyText(replyToken, "取消失敗，請稍後再試。")
}

// ===================== 最近 1 分鐘再次教學（保留） =====================
const recentHintThrottle = new Map<string, number>()
async function maybeResendHint(userId?: string, replyToken?: string) {
  if (!userId) return
  const cutoff = new Date(Date.now() - REMIND_WINDOW_SECS * 1000).toISOString()
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select("id, created_at")
    .eq("status", "draft")
    .eq("line_user_id", userId)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
  if (error || !data?.length) return
  const last = recentHintThrottle.get(userId) || 0
  if (Date.now() - last < REMIND_WINDOW_SECS * 1000) return
  recentHintThrottle.set(userId, Date.now())
  await replyText(
    replyToken,
    `你剛上傳了圖片，請在 ${TOKEN_TTL_MINS} 分鐘內回覆：\n` +
    `修改+貼文代碼 地點:xxx 物品:xxx 數量:xxx  領取期限:xxx（備註可省略）\n` +
    `＊代碼已發給你上一則訊息，請直接沿用那組。`
  )
}

// ===================== 無照片直接發佈（只加 published_at 與推播時間戳） =====================
async function publishTextOnly(
  userId: string | undefined,
  fields: { location: string; item: string; quantity: string; quantityUnit?: string; deadline: string; note?: string },
  replyToken?: string
) {
  const token = PostTokenManager.generateToken()
  const hashed = PostTokenManager.hashToken(token)
  const content = toCanonicalContent({
    location: fields.location,
    item: fields.item,
    quantity: fields.quantity,
    quantityUnit: fields.quantityUnit,
    deadline: fields.deadline,
    note: fields.note,
  })

  const nowIso = new Date().toISOString()

  // ★ 步驟1：發佈到資料庫（網頁）- 這是核心功能
  console.log(`[LINE] 無照片直接發佈（代碼: ${token}）`)
  console.log(`[LINE] 發佈資料:`, {
    location: fields.location,
    item: fields.item,
    quantity: fields.quantity,
    deadline: fields.deadline,
    note: fields.note,
  })
  
  const insertData = {
    line_user_id: userId ?? null,
    location: fields.location,
    content,
    quantity: fields.quantity,
    deadline: fields.deadline,
    note: fields.note ?? "",
    image_url: null,
    status: "published" as const,
    source: "line",
    post_token_hash: hashed,
    token_expires_at: PostTokenManager.getExpirationDate(PUBLISHED_TTL_DAYS),
    published_at: nowIso,
  }
  
  const { error } = await supabaseAdmin.from(TABLE).insert(insertData)
  
  if (error) {
    console.error("[LINE] ❌ 發佈失敗:", {
      error,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      token,
    })
    await replyText(replyToken, `系統忙碌中，請稍後再試。\n錯誤：${error.message || "發佈失敗"}`)
    return
  }

  // ★ 資料庫發佈成功！以下的 LINE 回覆和推播即使失敗也不影響發佈結果
  console.log(`[LINE] 訊息已成功發佈到網頁（代碼: ${token}）`)

  // ★ 步驟2：回覆用戶（選用功能，失敗不影響發佈）
  await replyText(
    replyToken,
    `發佈成功！（無照片）\n貼文代碼：${token}\n` +
    `【地點】${fields.location}\n【物品】${fields.item}\n` +
    `【數量】${fields.quantity}\n【領取期限】${fields.deadline}\n` +
    `${fields.note ? `【備註】${fields.note}` : ""}\n\n` +
    `＊此貼文在 ${PUBLISHED_TTL_DAYS} 天內可用「修改+代碼」重編輯；到期將自動刪除。`
  )

  // ★ 步驟3：推播給訂閱用戶（選用功能，失敗不影響發佈）
  await broadcastNewPostNotice(formatTsForTW(nowIso))
}

// ===================== 主入口（保留） =====================
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    if (!verifySignature(rawBody, req.headers.get("x-line-signature"))) {
      console.warn("[LINE] signature verify failed"); 
      return NextResponse.json({ ok: true })
    }

    const body = JSON.parse(rawBody)
    const events = body?.events ?? []

    if (events.length && events.every((e: any) => VERIFY_TOKENS.has((e as any).replyToken))) {
      return NextResponse.json({ ok: true })
    }

    scheduleCleanup()

    for (const event of events) {
      const userId: string | undefined = event.source?.userId
      const replyToken: string | undefined = (event as any).replyToken

      if (event.type === "follow") {
        // ★ 只记录用户follow状态，不发送任何消息（节省消息额度）
        if (userId) {
          const profile = await getLineUserProfile(userId)
          await upsertUserFollow(userId, true, profile?.displayName)
        }
        continue
      }
      if (event.type === "unfollow") {
        if (userId) await upsertUserFollow(userId, false)
        continue
      }

      if (event.type === "postback") {
        // 每次互動時更新用戶暱稱（非阻塞，背景執行）
        if (userId) updateUserDisplayName(userId)
        
        const data = parsePostbackData((event as any).postback?.data)
        if (userId && data.action === "notify_status") {
          const on = await getNotifyPref(userId)
          await replyText(replyToken, on ? "目前狀態：已開啟即食通知 ✅" : "目前狀態：未開啟即食通知 ❌")
          continue
        }
        if (userId && data.action === "notify_on") {
          const already = await getNotifyPref(userId)
          const profile = await getLineUserProfile(userId)
          await setNotifyPref(userId, true, profile?.displayName)
          await replyText(replyToken, already ? "你已經開啟即食通知囉！👌" : "已開啟：新品上架會主動通知你喔！")
          continue
        }
        if (userId && data.action === "notify_off") {
          const already = await getNotifyPref(userId)
          const profile = await getLineUserProfile(userId)
          await setNotifyPref(userId, false, profile?.displayName)
          await replyText(replyToken, !already ? "你目前已是關閉狀態喔～" : "已關閉：之後不再推播通知。")
          continue
        }
      }

      if (event.type === "message") {
        // 每次訊息互動時更新用戶暱稱（非阻塞，背景執行）
        if (userId) updateUserDisplayName(userId)
        
        if (event.message.type === "image") {
          await handleImageOnly(event.message.id, userId, replyToken)
          continue
        }

        if (event.message.type === "text") {
          const rawText = (event.message.text ?? "")
          const text = rawText.trim()
          const tNorm = normalizeSimple(text)

          // ★ 過濾 LINE 自動回應關鍵字，不做任何回應
          const AUTO_REPLY_KEYWORDS = [
            "說明", "使用", "使用說明", "如何使用", "怎麼用", "如何用",
            "教學", "使用教學", "如何"
          ]
          const shouldSkip = AUTO_REPLY_KEYWORDS.some(keyword => 
            tNorm.includes(normalizeSimple(keyword))
          )
          if (shouldSkip) {
            console.log(`[LINE] 偵測到自動回應關鍵字，跳過處理: ${text}`)
            continue
          }

          if (userId && STATUS_RE.test(tNorm)) {
            const on = await getNotifyPref(userId)
            await replyText(replyToken, on ? "目前狀態：已開啟即食通知 ✅" : "目前狀態：未開啟即食通知 ❌")
            continue
          }
          if (userId && OPEN_RE.test(tNorm)) {
            const already = await getNotifyPref(userId)
            const profile = await getLineUserProfile(userId)
            await setNotifyPref(userId, true, profile?.displayName)
            await replyText(replyToken, already ? "你已經開啟即食通知囉！👌" : "已開啟：新品上架會主動通知你喔！")
            continue
          }
          if (userId && CLOSE_RE.test(tNorm)) {
            const already = await getNotifyPref(userId)
            const profile = await getLineUserProfile(userId)
            await setNotifyPref(userId, false, profile?.displayName)
            await replyText(replyToken, !already ? "你目前已是關閉狀態喔～" : "已關閉：之後不再推播通知。")
            continue
          }

          if (/^取消(\s*[+＋]\s*[A-Za-z0-9]{4,16})?$/i.test(text)) {
            await handleCancel(text, userId, replyToken); continue
          }

          if (/修改\s*[+＋]/i.test(text)) {
            await handleEditPost(text, userId, replyToken)
            continue
          }

          // ★ 只有包含完整格式的消息才处理，否则不回复
          const parsed = LineMessageParser.parseNewPostMessage(text)
          if (parsed.success && parsed.data) {
            await publishTextOnly(userId, {
              location: parsed.data.location,
              item: parsed.data.item,
              quantity: parsed.data.quantity,
              quantityUnit: parsed.data.quantityUnit,
              deadline: parsed.data.deadline || "",
              note: parsed.data.note,
            }, replyToken)
          }
          // ★ 不再回复"还缺..."的教学内容，让LINE后台的自动回复处理
          continue
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[LINE webhook fatal]", e)
    return NextResponse.json({ ok: true })
  }
}

// ===================== 圖片 → 先建草稿立即回覆，之後再抓圖上傳（保留） =====================
async function handleImageOnly(messageId: string, userId: string | undefined, replyToken: string | undefined) {
  const token = PostTokenManager.generateToken()
  const hashedToken = PostTokenManager.hashToken(token)
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINS * 60 * 1000).toISOString()

  const { error: insertErr } = await supabaseAdmin.from(TABLE).insert({
    location: null,
    content: null,
    image_url: null,
    status: "draft",
    source: "line",
    line_user_id: userId ?? null,
    post_token_hash: hashedToken,
    token_expires_at: expiresAt,
  })
  if (insertErr) {
    console.error("create draft error (pre-insert):", insertErr)
    await replyText(replyToken, "系統忙碌中，請稍後再試。")
    return
  }

  await replyText(
    replyToken,
    `圖片新增成功！貼文代碼：${token}\n\n` +
    `請在 ${TOKEN_TTL_MINS} 分鐘內回覆以下內容來完成發佈：\n` +
    `修改+${token}\n【地點】：\n【物品】：\n【數量】：\n【領取期限】：\n【備註】：（可省略）\n\n` +
    `＊發佈後 7 天內仍可用同一組代碼再次修改；到期將自動刪除。`
  )

  try {
    const file = await fetchLineImage(messageId)
    if (!file) return
    const { publicUrl } = await uploadImageToBucket(userId || "unknown", file.buf, file.mime)
    await supabaseAdmin
      .from(TABLE)
      .update({ image_url: publicUrl })
      .eq("post_token_hash", hashedToken)
  } catch (e) {
    console.error("handleImageOnly upload/update error", e)
  }
}

// ===================== 修改+代碼（只有首發時多寫 published_at 與推播時間戳） =====================
async function handleEditPost(text: string, userId: string | undefined, replyToken: string | undefined) {
  const parsed = LineMessageParser.parseEditPostMessage(text)
  const token = parsed.token || extractToken(text)
  if (!token) { await replyText(replyToken, "請輸入：修改+代碼 地點:xxx 物品:xxx 數量:xxx  領取期限:今天18:00"); return }

  try {
    console.log(`[LINE] 查詢代碼: ${token}`)
    const tokenHash = PostTokenManager.hashToken(token)
    console.log(`[LINE] 代碼雜湊: ${tokenHash.substring(0, 16)}...`)
    
    const { data: rows, error } = await supabaseAdmin
      .from(TABLE).select("id,status,token_expires_at,image_url,line_user_id")
      .eq("post_token_hash", tokenHash)
      .order("created_at",{ascending:false}).limit(1)

    if (error) {
      console.error("[LINE] ❌ 查詢代碼失敗:", {
        error,
        message: error.message,
        details: error.details,
        code: error.code,
        token,
      })
      await replyText(replyToken, `系統忙碌中，請稍後再試。\n錯誤：${error.message || "查詢失敗"}`)
      return
    }
    
    if (!rows?.length) {
      console.log(`[LINE] ⚠️ 找不到代碼對應的貼文: ${token}`)
      await replyText(replyToken, "找不到對應貼文；請確認代碼或重新建立新貼文。")
      return
    }
    
    console.log(`[LINE] ✓ 找到貼文: ID=${rows[0].id}, status=${rows[0].status}`)

    if (!parsed.success) {
      await replyText(replyToken, `還缺：${(parsed.errors || []).join("、")}（代碼 ${token}）\n請補齊後再送出。`)
      return
    }

    const row = rows[0] as any
    const d = parsed.data!
    const content = toCanonicalContent({
      location: d.location, item: d.item, quantity: d.quantity, quantityUnit: d.quantityUnit, deadline: d.deadline ?? "", note: d.note,
    })

    if (row.status === "draft") {
      const expired = row.token_expires_at ? new Date(row.token_expires_at).getTime() < Date.now() : false
      if (expired) {
        await removeFromStorage(row.image_url)
        await supabaseAdmin.from(TABLE).delete().eq("id", row.id)
        await replyText(replyToken, `貼文代碼已逾時（${TOKEN_TTL_MINS} 分鐘）。草稿與圖片已刪除，請重新上傳圖片。`)
        return
      }
      if (!row.image_url) {
        await replyText(replyToken, "圖片仍在處理中，請稍等幾秒再回覆「修改+代碼」。若持續失敗，請重新上傳圖片。")
        return
      }

      const nowIso = new Date().toISOString()

      // ★ 步驟1：發佈到資料庫（網頁）- 這是核心功能
      console.log(`[LINE] 準備更新草稿為已發佈（代碼: ${token}, ID: ${row.id}）`)
      console.log(`[LINE] 更新資料:`, {
        location: d.location,
        item: d.item,
        quantity: d.quantity,
        deadline: d.deadline,
        note: d.note,
      })
      
      const updateData = {
        location: d.location,
        content,
        quantity: d.quantity,
        deadline: d.deadline ?? "",
        note: d.note ?? "",
        status: "published" as const,
        source: "line",
        line_user_id: userId ?? null,
        token_expires_at: PostTokenManager.getExpirationDate(PUBLISHED_TTL_DAYS),
        published_at: nowIso,
      }
      
      const { error: updErr } = await supabaseAdmin
        .from(TABLE)
        .update(updateData)
        .eq("id", row.id)
      
      if (updErr) {
        console.error("[LINE] ❌ 資料庫更新失敗:", {
          error: updErr,
          message: updErr.message,
          details: updErr.details,
          hint: updErr.hint,
          code: updErr.code,
          rowId: row.id,
          token,
        })
        await replyText(replyToken, `系統忙碌中，請稍後再試。\n錯誤：${updErr.message || "未知錯誤"}`)
        return
      }

      // ★ 資料庫發佈成功！以下的 LINE 回覆和推播即使失敗也不影響發佈結果
      console.log(`[LINE] 草稿已成功發佈到網頁（代碼: ${token}）`)

      // ★ 步驟2：回覆用戶（選用功能，失敗不影響發佈）
      await replyText(
        replyToken,
        `發佈成功！（代碼 ${token}）\n` +
        `【地點】${d.location}\n【物品】${d.item}\n` +
        `【數量】${d.quantity}\n【領取期限】${d.deadline}\n` +
        `${d.note ? `【備註】${d.note}` : ""}\n\n` +
        `＊此貼文在 ${PUBLISHED_TTL_DAYS} 天內可用「修改+代碼」重編輯；到期將自動刪除。`
      )

      // ★ 步驟3：推播給訂閱用戶（選用功能，失敗不影響發佈）
      await broadcastNewPostNotice(formatTsForTW(nowIso))
      return
    }

    const canEdit =
      row.token_expires_at && new Date(row.token_expires_at).getTime() > Date.now() &&
      (!row.line_user_id || !userId || row.line_user_id === userId)

    if (!canEdit) {
      await replyText(replyToken, "此貼文已超過可編輯期限，或你不是原上傳者。請重新發佈新貼文。")
      return
    }

    // ★ 步驟1：更新資料庫（網頁）- 這是核心功能
    const { error: upd2 } = await supabaseAdmin.from(TABLE).update({
      location: d.location,
      content,
      quantity: d.quantity,
      deadline: d.deadline ?? "",
      note: d.note ?? "",
    }).eq("id", row.id)
    
    if (upd2) {
      console.error("update published edit err", upd2)
      await replyText(replyToken, "系統忙碌中，請稍後再試。")
      return
    }

    // ★ 資料庫更新成功！以下的 LINE 回覆即使失敗也不影響更新結果
    console.log(`[LINE] 已發佈貼文修改成功（代碼: ${token}）`)

    // ★ 步驟2：回覆用戶（選用功能，失敗不影響更新）
    await replyText(
      replyToken,
      `修改完成！（代碼 ${token}）\n【地點】${d.location}\n【物品】${d.item}\n` +
      `【數量】${d.quantity}\n【領取期限】${d.deadline}\n` +
      `${d.note ? `【備註】${d.note}` : ""}\n\n` +
      `＊此貼文將在 ${PUBLISHED_TTL_DAYS} 天後自動刪除（或剩餘期間內可再修改）。`
    )
  } catch (e) { console.error("handleEditPost", e); await replyText(replyToken, "系統忙碌中，請稍後再試。") }
}
