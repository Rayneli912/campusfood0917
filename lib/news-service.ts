"use client"

type Id = string
export type NewsStatus = "draft" | "published"
export interface NewsItem {
  id: Id
  title: string
  content: string
  source?: string
  status: NewsStatus
  publishDate?: string   // YYYY-MM-DD
  publishTime?: string   // HH:mm
  createdAt: string
  updatedAt: string
}

const KEY = "__news_items__"
const EV = "newsUpdated"

function nowIso() {
  const d = new Date()
  const yy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  const hh = String(d.getHours()).padStart(2, "0")
  const mi = String(d.getMinutes()).padStart(2, "0")
  const ss = String(d.getSeconds()).padStart(2, "0")
  return `${yy}-${mm}-${dd}T${hh}:${mi}:${ss}`
}

function load(): NewsItem[] {
  try {
    const raw = localStorage.getItem(KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}
function save(list: NewsItem[]) {
  localStorage.setItem(KEY, JSON.stringify(list))
}
function emit(list: NewsItem[]) {
  try {
    window.dispatchEvent(new CustomEvent(EV, { detail: { list } }))
  } catch {}
}

export function onNewsUpdated(handler: (e: CustomEvent<{ list: NewsItem[] }>) => void) {
  window.addEventListener(EV, handler as EventListener)
  return () => window.removeEventListener(EV, handler as EventListener)
}

export async function getAllNews(): Promise<NewsItem[]> {
  return load()
}

export async function addNews(input: Omit<NewsItem, "id" | "createdAt" | "updatedAt">): Promise<NewsItem[]> {
  const list = load()
  const item: NewsItem = {
    ...input,
    id: `news_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  const next = [item, ...list]
  save(next)
  emit(next)
  return next
}

export async function updateNews(id: Id, patch: Partial<NewsItem>): Promise<NewsItem[]> {
  const list = load()
  const next = list.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: nowIso() } : n))
  save(next)
  emit(next)
  return next
}

export async function deleteNews(id: Id): Promise<NewsItem[]> {
  const list = load()
  const next = list.filter((n) => n.id !== id)
  save(next)
  emit(next)
  return next
}
