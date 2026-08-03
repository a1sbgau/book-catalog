import { DEFAULT_BOOKS, DEFAULT_CATEGORIES } from '../data/books'
import type { AccessLevel, AppData, Book, Chapter } from '../types'
import { createId as makeId } from '../utils/id'
import { idbGet, idbSet } from './idb'

const AUTH_KEY = 'book-catalog-admin-auth'
const ADMIN_PASSWORD = 'admin123'
const CHANNEL_NAME = 'book-catalog-sync'
const LEGACY_KEY = 'book-catalog-data-v1'

type Listener = () => void

const listeners = new Set<Listener>()
let cache: AppData | null = null
let readyPromise: Promise<void> | null = null
let channel: BroadcastChannel | null = null

function getChannel() {
  if (typeof BroadcastChannel === 'undefined') return null
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME)
    channel.onmessage = (ev) => {
      if (ev.data?.type === 'data-updated') {
        void hydrateFromIdb().then(() => notifyLocal())
      }
    }
  }
  return channel
}

function notifyLocal() {
  listeners.forEach((fn) => fn())
}

function notifyAll() {
  notifyLocal()
  try {
    getChannel()?.postMessage({ type: 'data-updated', at: Date.now() })
  } catch {
    /* ignore */
  }
}

export function defaultData(): AppData {
  return {
    categories: [...DEFAULT_CATEGORIES],
    books: structuredClone(DEFAULT_BOOKS),
    version: 1,
    favorites: [],
    updatedAt: Date.now(),
  }
}

async function hydrateFromIdb() {
  const fromIdb = await idbGet<AppData>()
  if (fromIdb && Array.isArray(fromIdb.books)) {
    cache = { favorites: [], ...fromIdb }
    return
  }
  // 迁移旧 localStorage
  try {
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy) {
      const parsed = JSON.parse(legacy) as AppData
      if (Array.isArray(parsed.books)) {
        cache = { favorites: [], ...parsed }
        await idbSet(cache)
        localStorage.removeItem(LEGACY_KEY)
        return
      }
    }
  } catch {
    /* ignore */
  }
  cache = defaultData()
  await idbSet(cache)
}

/** App 启动时调用一次 */
export function initStore() {
  if (!readyPromise) {
    readyPromise = hydrateFromIdb().then(() => {
      getChannel()
    })
  }
  return readyPromise
}

export function subscribe(listener: Listener) {
  listeners.add(listener)
  getChannel()
  return () => {
    listeners.delete(listener)
  }
}

export function loadData(): AppData {
  return cache || defaultData()
}

export async function saveData(data: AppData) {
  data.version = (data.version || 0) + 1
  data.updatedAt = Date.now()
  if (!data.favorites) data.favorites = cache?.favorites || []
  cache = data
  await idbSet(data)
  notifyAll()
}

export async function resetData() {
  const data = defaultData()
  await saveData(data)
  return data
}

export function exportDataJson() {
  return JSON.stringify(loadData(), null, 2)
}

export async function importDataJson(json: string) {
  const parsed = JSON.parse(json) as AppData
  if (!Array.isArray(parsed.categories) || !Array.isArray(parsed.books)) {
    throw new Error('数据格式不正确')
  }
  await saveData({ favorites: parsed.favorites || [], ...parsed })
  return parsed
}

export function createId(prefix = 'id') {
  return makeId(prefix)
}

export async function upsertBook(book: Book) {
  const data = loadData()
  const next = { ...book, updatedAt: Date.now() }
  const idx = data.books.findIndex((b) => b.id === book.id)
  if (idx >= 0) data.books[idx] = next
  else data.books.unshift(next)
  await saveData(data)
}

export async function deleteBook(id: string) {
  const data = loadData()
  data.books = data.books.filter((b) => b.id !== id)
  data.favorites = (data.favorites || []).filter((x) => x !== id)
  await saveData(data)
}

export async function addCategory(name: string) {
  const data = loadData()
  const trimmed = name.trim()
  if (!trimmed) throw new Error('分类名不能为空')
  if (data.categories.includes(trimmed)) throw new Error('分类已存在')
  data.categories.push(trimmed)
  await saveData(data)
}

export async function renameCategory(oldName: string, newName: string) {
  const data = loadData()
  const trimmed = newName.trim()
  if (!trimmed) throw new Error('分类名不能为空')
  if (oldName === trimmed) return
  if (data.categories.includes(trimmed)) throw new Error('分类已存在')
  data.categories = data.categories.map((c) => (c === oldName ? trimmed : c))
  data.books = data.books.map((b) =>
    b.category === oldName ? { ...b, category: trimmed } : b,
  )
  await saveData(data)
}

export async function deleteCategory(name: string) {
  const data = loadData()
  const used = data.books.some((b) => b.category === name)
  if (used) throw new Error('该分类下还有书籍，无法删除')
  data.categories = data.categories.filter((c) => c !== name)
  await saveData(data)
}

export function emptyBook(category?: string): Book {
  const data = loadData()
  return {
    id: createId('book'),
    title: '',
    series: '',
    description: '',
    author: '',
    type: 'image',
    category: category || data.categories[0] || '未分类',
    access: '免费',
    cover: '',
    date: new Date().toISOString().slice(0, 10),
    chapters: [],
    updatedAt: Date.now(),
  }
}

export function emptyChapter(): Chapter {
  return {
    id: createId('ch'),
    title: '',
    content: '',
    videoUrl: '',
    duration: 0,
    images: [],
    children: [],
  }
}

export const ACCESS_OPTIONS: AccessLevel[] = ['免费', '推荐', '需权限']

export function isAdminAuthed() {
  return sessionStorage.getItem(AUTH_KEY) === '1'
}

export function adminLogin(password: string) {
  if (password === ADMIN_PASSWORD) {
    sessionStorage.setItem(AUTH_KEY, '1')
    return true
  }
  return false
}

export function adminLogout() {
  sessionStorage.removeItem(AUTH_KEY)
}

export function getAdminPasswordHint() {
  return ADMIN_PASSWORD
}

export function getBookById(id: string) {
  return loadData().books.find((b) => b.id === id) || null
}

export async function toggleFavorite(bookId: string) {
  const data = loadData()
  const set = new Set(data.favorites || [])
  if (set.has(bookId)) set.delete(bookId)
  else set.add(bookId)
  data.favorites = [...set]
  await saveData(data)
  return set.has(bookId)
}

export function isFavorite(bookId: string) {
  return (loadData().favorites || []).includes(bookId)
}
