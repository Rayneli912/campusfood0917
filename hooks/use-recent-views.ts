"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { storage } from "@/lib/storage-adapter"
import { USE_BACKEND, apiUrl } from "@/lib/env"
import { notifyDataUpdate, RECENT_VIEWS_UPDATED } from "@/lib/sync-service"
import type { RecentViewItem as RecentView } from "@/types"

const MAX_VIEWS = 20

function readUserId(): string | null {
  try {
    const raw = storage.local.getItem("user") || storage.local.getItem("currentUser")
    return raw ? JSON.parse(raw)?.id ?? null : null
  } catch {
    return null
  }
}

const keyNew = (uid: string) => `user_${uid}_recentViews`
const keyOld = (uid: string) => `user:${uid}:recentViews`

export function useRecentViews() {
  const [views, setViews] = useState<RecentView[]>([])
  const [loading, setLoading] = useState(true)

  const migrateIfNeeded = (uid: string) => {
    try {
      const oldArr = storage.local.getJSON<RecentView[]>(keyOld(uid), null as any)
      if (oldArr && Array.isArray(oldArr)) {
        storage.local.setJSON(keyNew(uid), oldArr)
        storage.local.removeItem(keyOld(uid))
      }
    } catch {}
  }

  const loadLocal = useCallback(() => {
    const uid = readUserId()
    if (!uid) {
      setViews([])
      setLoading(false)
      return
    }
    migrateIfNeeded(uid)
    const arr = storage.local.getJSON<RecentView[]>(keyNew(uid), [])
    setViews(Array.isArray(arr) ? arr : [])
    setLoading(false)
  }, [])

  const loadBackend = useCallback(async () => {
    try {
      setLoading(true)
      const uid = readUserId()
      if (!uid) {
        setViews([])
        setLoading(false)
        return
      }
      const r = await fetch(apiUrl(`/api/recent-views?userId=${uid}`), { 
        method: "GET",
        headers: { "x-user-id": uid }
      })
      if (!r.ok) throw new Error("fetch recent-views failed")
      const data = await r.json()
      setViews(Array.isArray(data) ? data : (data?.items ?? []))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // ✅ 强制使用数据库
    loadBackend()
  }, [loadBackend])

  useEffect(() => {
    const onUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.items) setViews(detail.items)
      else loadLocal()
    }
    // 舊事件 + 新事件
    window.addEventListener("recentViewsUpdated" as any, onUpdated)
    window.addEventListener(RECENT_VIEWS_UPDATED as any, onUpdated)
    // 跨分頁
    window.addEventListener("storage", loadLocal as EventListener)

    return () => {
      window.removeEventListener("recentViewsUpdated" as any, onUpdated)
      window.removeEventListener(RECENT_VIEWS_UPDATED as any, onUpdated)
      window.removeEventListener("storage", loadLocal as EventListener)
    }
  }, [loadLocal])

  const saveLocal = (next: RecentView[]) => {
    const uid = readUserId()
    if (!uid) return
    storage.local.setJSON(keyNew(uid), next)
    setViews(next)
    // 舊事件
    window.dispatchEvent(new CustomEvent("recentViewsUpdated", { detail: { userId: uid, items: next } }))
    // 新事件（後台同步）
    notifyDataUpdate(RECENT_VIEWS_UPDATED, { userId: uid, recentViews: next })
  }

  const addLocal = (payload: Omit<RecentView, "viewedAt">) => {
    if (!payload?.id) return
    const now = new Date().toISOString()
    const deduped = views.filter(v => String(v.id) !== String(payload.id))
    const next: RecentView[] = [{ ...payload, viewedAt: now }, ...deduped].slice(0, MAX_VIEWS)
    saveLocal(next)
  }

  const clearLocal = () => saveLocal([])

  const addBackend = async (payload: Omit<RecentView, "viewedAt">) => {
    const uid = readUserId()
    if (!uid) return
    
    const r = await fetch(apiUrl("/api/recent-views"), {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-user-id": uid
      },
      body: JSON.stringify(payload),
    })
    if (!r.ok) throw new Error("add recent view failed")
    const next = await r.json()
    const items = Array.isArray(next) ? next : (next?.items ?? [])
    setViews(items)
    window.dispatchEvent(new CustomEvent("recentViewsUpdated", { detail: { items } }))
    notifyDataUpdate(RECENT_VIEWS_UPDATED, { userId: uid, recentViews: items })
  }

  const clearBackend = async () => {
    const uid = readUserId()
    if (!uid) return
    
    const r = await fetch(apiUrl("/api/recent-views"), { 
      method: "DELETE",
      headers: { "x-user-id": uid }
    })
    if (!r.ok) throw new Error("clear recent views failed")
    setViews([])
    window.dispatchEvent(new CustomEvent("recentViewsUpdated", { detail: { items: [] } }))
    notifyDataUpdate(RECENT_VIEWS_UPDATED, { userId: uid, recentViews: [] })
  }

  // ✅ 强制使用数据库
  const add = useCallback(async (payload: Omit<RecentView, "viewedAt">) => addBackend(payload), [])
  const clear = useCallback(async () => clearBackend(), [])

  const count = useMemo(() => views.length, [views])
  const refresh = useCallback(() => loadBackend(), [loadBackend])

  return { views, add, clear, count, loading, refresh }
}
