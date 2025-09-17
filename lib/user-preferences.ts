// lib/user-preferences.ts
"use client"

export type FavStore = { id: string; name?: string; location?: string }
export type RecentView = { id: string; name?: string; location?: string; viewedAt: string }

const evtFavA = "favoritesUpdated"
const evtFavB = "FAVORITES_UPDATED"
const evtRecA = "recentViewsUpdated"
const evtRecB = "RECENT_VIEWS_UPDATED"

function getUserId(): string | null {
  try {
    const raw = localStorage.getItem("user")
    if (!raw) return null
    const u = JSON.parse(raw)
    return String(u?.id ?? u?._id ?? "") || null
  } catch { return null }
}

function keyFav(uid: string)   { return `user_${uid}_favorites` }
function keyRecent(uid: string){ return `user_${uid}_recentViews` }

function dispatch(name: string, detail?: any) {
  try { window.dispatchEvent(new CustomEvent(name, { detail })) } catch {}
  // 觸發 storage 同步（同分頁不會觸發 storage，所以用自訂事件 + :touch）
  try { localStorage.setItem(`${name}:__touch__`, String(Date.now())) } catch {}
}

/** 收藏相關 */
export function getFavorites(uid?: string): string[] {
  const id = uid ?? getUserId()
  if (!id) return []
  try {
    const raw = localStorage.getItem(keyFav(id))
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.map(String) : []
  } catch { return [] }
}

export function isStoreFavorite(storeId: string, uid?: string) {
  return getFavorites(uid).includes(String(storeId))
}

export function toggleFavoriteStore(store: FavStore, uid?: string): string[] {
  const id = uid ?? getUserId()
  if (!id) return []
  const cur = new Set(getFavorites(id))
  const sid = String(store.id)
  if (cur.has(sid)) cur.delete(sid); else cur.add(sid)
  const next = Array.from(cur)
  localStorage.setItem(keyFav(id), JSON.stringify(next))
  dispatch(evtFavA, next); dispatch(evtFavB, next)
  return next
}

/** 近期瀏覽相關（保留最近 30 筆） */
const RECENT_MAX = 30

export function getRecentViews(uid?: string): RecentView[] {
  const id = uid ?? getUserId()
  if (!id) return []
  try {
    const raw = localStorage.getItem(keyRecent(id))
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}

export function recordRecentStoreView(store: FavStore, uid?: string) {
  const id = uid ?? getUserId()
  if (!id || !store?.id) return
  const list = getRecentViews(id).filter(x => String(x.id) !== String(store.id))
  list.unshift({ id: String(store.id), name: store.name, location: store.location, viewedAt: new Date().toISOString() })
  const next = list.slice(0, RECENT_MAX)
  localStorage.setItem(keyRecent(id), JSON.stringify(next))
  dispatch(evtRecA, next); dispatch(evtRecB, next)
}

export function clearRecentViews(uid?: string) {
  const id = uid ?? getUserId()
  if (!id) return
  localStorage.setItem(keyRecent(id), JSON.stringify([]))
  dispatch(evtRecA, []); dispatch(evtRecB, [])
}
