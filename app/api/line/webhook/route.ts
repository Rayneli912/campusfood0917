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
try { setDefaultResultOrder("ipv4first") } catch {}

/** 發佈後可編輯/存活天數（預設 7；可用 env PUBLISHED_TTL_DAYS 覆寫） */
const PUBLISHED_TTL_DAYS = Number(process.env.PUBLISHED_TTL_DAYS || 7)
/** 上傳圖片後，1 分鐘內非修改訊息就再次推教學（不含代碼） */
const REMIND_WINDOW_SECS = 60

const TABLE = "near_expiry_posts"
const BUCKET = "near_expiry_images"
const PREFS = "line_user_settings"
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "" // 官網連結（可留空）

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
    // 正確的作法：兩邊都用 base64 bytes 比對
    const expectedB64 = mac.digest("base64")
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader, "base64"),
      Buffer.from(expectedB64, "base64")
    )
  } catch {
    return false
  }
}

async function replyMessages(replyToken: string | undefined, messages: any[]) {
  if (!replyToken || messages.length === 0) return
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
    if (!res.ok) console.error("LINE reply error", res.status, await res.text())
  } catch (e) {
    console.error("LINE reply error", e)
  } finally { clearTimeout(timer) }
}
async function replyText(replyToken: string | undefined, text: string) {
  await replyMessages(replyToken, [{ type: "text", text }])
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

// ===================== 訂閱偏好 / 群播通知 =====================
async function upsertUserFollow(userId: string, followed: boolean) {
  await supabaseAdmin.from(PREFS).upsert({ user_id: userId, followed }, { onConflict: "user_id" })
}
async function setNotifyPref(userId: string, enable: boolean) {
  await supabaseAdmin.from(PREFS).upsert({ user_id: userId, notify_new_post: enable, followed: true }, { onConflict: "user_id" })
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
async function broadcastNewPostNotice() {
  const message = `有新的即期食品出現囉！快到惜食快go官網看看！👀${SITE_URL ? `\n${SITE_URL}` : ""}`
  const uids = await getSubscribedUserIds()
  if (!uids.length) return
  await multicastTo(uids, [{ type: "text", text: message }])
}

// ===================== 圖片上傳 & 清理 =====================
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

// ===================== 指令解析（更寬鬆） =====================
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

// ===================== 取消草稿 =====================
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

// ===================== 1 分鐘再次教學（節流） =====================
const recentHintThrottle = new Map<string, number>() // userId -> ts(ms)
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
    `修改+貼文代碼 地點:xxx 物品:xxx 數量:3  領取期限:今天18:00（備註可省略）\n` +
    `＊代碼已發給你上一則訊息，請直接沿用那組。`
  )
}

// ===================== 文字直接發佈（7 天內可改；發佈後推播） =====================
async function publishTextOnly(
  userId: string | undefined,
  fields: { location: string; item: string; quantity: number; quantityUnit?: string; deadline: string; note?: string },
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

  const { error } = await supabaseAdmin.from(TABLE).insert({
    line_user_id: userId ?? null,
    location: fields.location,
    content,
    quantity: fields.quantity,
    deadline: fields.deadline,
    note: fields.note ?? "",
    image_url: null,
    status: "published",
    source: "line",
    post_token_hash: hashed, // 7 天內可再編輯
    token_expires_at: PostTokenManager.getExpirationDate(PUBLISHED_TTL_DAYS),
  })
  if (error) { console.error("publishTextOnly insert error:", error); await replyText(replyToken, "系統忙碌中，請稍後再試。"); return }

  await replyText(
    replyToken,
    `發佈成功！（無照片）\n貼文代碼：${token}\n` +
    `【地點】${fields.location}\n【物品】${fields.item}\n` +
    `【數量】${fields.quantity}${fields.quantityUnit ?? ""}\n【領取期限】${fields.deadline}\n` +
    `${fields.note ? `【備註】${fields.note}` : ""}\n\n` +
    `＊此貼文在 ${PUBLISHED_TTL_DAYS} 天內可用「修改+代碼」重編輯；到期將自動刪除。`
  )

  await broadcastNewPostNotice()
}

// ===================== 主入口：先回 200，再背景處理 =====================
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get("x-line-signature")
    const isValid = verifySignature(rawBody, signature)

    // 立刻回 200（避免 LINE Verify 超時）
    setImmediate(() => {
      handleWebhook(rawBody, isValid).catch((e) => console.error("[webhook bg error]", e))
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[LINE webhook fatal]", e)
    // 仍回 200，避免 Verify 失敗
    return NextResponse.json({ ok: true })
  }
}

// 背景工作：真正處理事件（與你原本邏輯相同）
async function handleWebhook(rawBody: string, signatureOk: boolean) {
  try {
    // 簽章不對直接丟棄（但不阻擋外層 200）
    if (!signatureOk) { console.warn("[LINE] signature verify failed"); return }

    await cleanupExpiredDrafts()
    await cleanupExpiredPublished()

    const body = JSON.parse(rawBody)

    for (const event of body.events ?? []) {
      const userId: string | undefined = event.source?.userId
      const replyToken: string | undefined = (event as any).replyToken

      // 關係事件
      if (event.type === "follow") {
        if (userId) await upsertUserFollow(userId, true)
        await replyMessages(replyToken, [
          {
            type: "text",
            text: "歡迎加入！是否開啟「即食通知」？（之後可輸入：開啟即食通知 / 關閉即食通知 / 通知狀態）",
            quickReply: {
              items: [
                { type: "action", action: { type: "message", label: "開啟", text: "開啟即食通知" } },
                { type: "action", action: { type: "message", label: "暫不", text: "關閉即食通知" } },
              ],
            },
          },
          {
            type: "text",
            text:
              "發佈方式：\n【有照片】先傳一張照片，收到代碼後在 30 分鐘內回：\n修改+代碼 地點:xxx 物品:xxx 數量:3 領取期限:今天18:00\n【無照片】直接輸入四欄位即可發佈。",
          },
        ])
        continue
      }
      if (event.type === "unfollow") {
        if (userId) await upsertUserFollow(userId, false)
        continue
      }

      // Postback（Rich Menu/QuickReply）
      if (event.type === "postback") {
        const data = parsePostbackData((event as any).postback?.data)
        if (userId && data.action === "notify_status") {
          const on = await getNotifyPref(userId)
          await replyText(replyToken, on ? "目前狀態：已開啟即食通知 ✅" : "目前狀態：未開啟即食通知 ❌")
          continue
        }
        if (userId && data.action === "notify_on") {
          const already = await getNotifyPref(userId)
          await setNotifyPref(userId, true)
          await replyText(replyToken, already ? "你已經開啟即食通知囉！👌" : "已開啟：新品上架會主動通知你喔！")
          continue
        }
        if (userId && data.action === "notify_off") {
          const already = await getNotifyPref(userId)
          await setNotifyPref(userId, false)
          await replyText(replyToken, !already ? "你目前已是關閉狀態喔～" : "已關閉：之後不再推播通知。")
          continue
        }
      }

      // 訊息事件
      if (event.type === "message") {
        if (event.message.type === "image") {
          await handleImageOnly(event.message.id, userId, replyToken)
          continue
        }

        if (event.message.type === "text") {
          const rawText = (event.message.text ?? "")
          const text = rawText.trim()
          const tNorm = normalizeSimple(text)

          // 訂閱指令
          if (userId && STATUS_RE.test(tNorm)) {
            const on = await getNotifyPref(userId)
            await replyText(replyToken, on ? "目前狀態：已開啟即食通知 ✅" : "目前狀態：未開啟即食通知 ❌")
            continue
          }
          if (userId && OPEN_RE.test(tNorm)) {
            const already = await getNotifyPref(userId)
            await setNotifyPref(userId, true)
            await replyText(replyToken, already ? "你已經開啟即食通知囉！👌" : "已開啟：新品上架會主動通知你喔！")
            continue
          }
          if (userId && CLOSE_RE.test(tNorm)) {
            const already = await getNotifyPref(userId)
            await setNotifyPref(userId, false)
            await replyText(replyToken, !already ? "你目前已是關閉狀態喔～" : "已關閉：之後不再推播通知。")
            continue
          }

          // 取消指令
          if (/^取消(\s*[+＋]\s*[A-Za-z0-9]{4,16})?$/i.test(text)) {
            await handleCancel(text, userId, replyToken); continue
          }

          // 修改+代碼
          if (/修改\s*[+＋]/i.test(text)) {
            await handleEditPost(text, userId, replyToken)
            continue
          }

          // 非修改文字：若 60 秒內剛上傳過圖片 → 補送一次教學
          await maybeResendHint(userId, replyToken)

          // 無照片直接發佈
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
          } else {
            const miss = parsed.errors?.length ? `還缺：${parsed.errors!.join("、")}\n` : ""
            await replyText(
              replyToken,
              `${miss}發佈請擇一：\n1) 上傳圖片 → 回覆「修改+代碼」+四欄位（${TOKEN_TTL_MINS} 分鐘內）\n2) 直接輸入四欄位（無照片）：地點:xxx 物品:xxx 數量:三份/3  領取期限:今天18:00\n（發佈後 7 天內可再用「修改+代碼」編輯）`
            )
          }
          continue
        }
      }
    }
  } catch (e) {
    console.error("[handleWebhook error]", e)
  }
}

// ===================== 圖片 → 先建草稿立即回覆，之後再抓圖上傳 =====================
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
    console.error("handleImageOnly upload/update error:", e)
  }
}

// ===================== 修改+代碼：草稿首發 / 已發佈重編輯 =====================
async function handleEditPost(text: string, userId: string | undefined, replyToken: string | undefined) {
  const parsed = LineMessageParser.parseEditPostMessage(text)
  const token = parsed.token || extractToken(text)
  if (!token) { await replyText(replyToken, "請輸入：修改+代碼 地點:xxx 物品:xxx 數量:三/3  領取期限:今天18:00"); return }

  try {
    const { data: rows, error } = await supabaseAdmin
      .from(TABLE).select("id,status,token_expires_at,image_url,line_user_id")
      .eq("post_token_hash", PostTokenManager.hashToken(token))
      .order("created_at",{ascending:false}).limit(1)

    if (error) { console.error("fetch by token error", error); await replyText(replyToken, "系統忙碌中，請稍後再試。"); return }
    if (!rows?.length) { await replyText(replyToken, "找不到對應貼文；請確認代碼或重新建立新貼文。"); return }

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
      const { error: updErr } = await supabaseAdmin.from(TABLE).update({
        location: d.location,
        content,
        quantity: d.quantity,
        deadline: d.deadline ?? "",
        note: d.note ?? "",
        status: "published",
        source: "line",
        line_user_id: userId ?? null,
        token_expires_at: PostTokenManager.getExpirationDate(PUBLISHED_TTL_DAYS),
      }).eq("id", row.id)
      if (updErr) { console.error("update draft->publish err", updErr); await replyText(replyToken, "系統忙碌中，請稍後再試。"); return }

      await replyText(
        replyToken,
        `發佈成功！（代碼 ${token}）\n` +
        `【地點】${d.location}\n【物品】${d.item}\n` +
        `【數量】${d.quantity}${d.quantityUnit ?? ""}\n【領取期限】${d.deadline}\n` +
        `${d.note ? `【備註】${d.note}` : ""}\n\n` +
        `＊此貼文在 ${PUBLISHED_TTL_DAYS} 天內可用「修改+代碼」重編輯；到期將自動刪除。`
      )
      await broadcastNewPostNotice()
      return
    }

    // 已發佈：7 天內可改（僅原上傳者）
    const canEdit =
      row.token_expires_at && new Date(row.token_expires_at).getTime() > Date.now() &&
      (!row.line_user_id || !userId || row.line_user_id === userId)

    if (!canEdit) {
      await replyText(replyToken, "此貼文已超過可編輯期限，或你不是原上傳者。請重新發佈新貼文。")
      return
    }

    const { error: upd2 } = await supabaseAdmin.from(TABLE).update({
      location: d.location,
      content,
      quantity: d.quantity,
      deadline: d.deadline ?? "",
      note: d.note ?? "",
    }).eq("id", row.id)
    if (upd2) { console.error("update published edit err", upd2); await replyText(replyToken, "系統忙碌中，請稍後再試。"); return }

    await replyText(
      replyToken,
      `修改完成！（代碼 ${token}）\n【地點】${d.location}\n【物品】${d.item}\n` +
      `【數量】${d.quantity}${d.quantityUnit ?? ""}\n【領取期限】${d.deadline}\n` +
      `${d.note ? `【備註】${d.note}` : ""}\n\n` +
      `＊此貼文將在 ${PUBLISHED_TTL_DAYS} 天後自動刪除（或剩餘期間內可再修改）。`
    )
  } catch (e) { console.error("handleEditPost", e); await replyText(replyToken, "系統忙碌中，請稍後再試。") }
}
