import { DEFAULT_BOOKS, DEFAULT_CATEGORIES } from '../data/books'
import type { AccessLevel, AppData, Book, Chapter } from '../types'
import { createId as makeId } from '../utils/id'
import { fetchRemoteData } from './remote'

const STORAGE_KEY = 'book-catalog-data-v1'
const AUTH_KEY = 'book-catalog-admin-auth'
const ADMIN_PASSWORD = 'admin123'
const CHANNEL_NAME = 'book-catalog-sync'

type Listener = () => void

const listeners = new Set<Listener>()
let channel: BroadcastChannel | null = null

function getChannel() {
  if (typeof BroadcastChannel === 'undefined') return null
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME)
    channel.onmessage = (ev) => {
      if (ev.data?.type === 'data-updated') notifyLocal()
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

export function subscribe(listener: Listener) {
  listeners.add(listener)
  getChannel()

  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) notifyLocal()
  }
  window.addEventListener('storage', onStorage)

  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function defaultData(): AppData {
  return {
    categories: [...DEFAULT_CATEGORIES],
    books: structuredClone(DEFAULT_BOOKS),
    version: 1,
  }
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultData()
    const parsed = JSON.parse(raw) as AppData
    if (!Array.isArray(parsed.categories) || !Array.isArray(parsed.books)) {
      return defaultData()
    }
    return parsed
  } catch {
    return defaultData()
  }
}

export function saveData(data: AppData) {
  data.version = (data.version || 0) + 1
  data.updatedAt = Date.now()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  notifyAll()
}

/** 用远程数据覆盖本地缓存（不额外抬高 version） */
export function applyRemoteData(data: AppData) {
  const next: AppData = {
    ...data,
    version: data.version || 1,
    updatedAt: data.updatedAt || Date.now(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  notifyAll()
  return next
}

/** App 端：从 GitHub 拉最新数据，别人手机也能看到同一份 */
export async function syncFromRemote() {
  const remote = await fetchRemoteData()
  return applyRemoteData(remote)
}

export function resetData() {
  const data = defaultData()
  saveData(data)
  return data
}

export function exportDataJson() {
  return JSON.stringify(loadData(), null, 2)
}

export function importDataJson(json: string) {
  const parsed = JSON.parse(json) as AppData
  if (!Array.isArray(parsed.categories) || !Array.isArray(parsed.books)) {
    throw new Error('数据格式不正确')
  }
  saveData(parsed)
  return parsed
}

export function createId(prefix = 'id') {
  return makeId(prefix)
}

export function upsertBook(book: Book) {
  const data = loadData()
  const next = { ...book, updatedAt: Date.now() }
  const idx = data.books.findIndex((b) => b.id === book.id)
  if (idx >= 0) data.books[idx] = next
  else data.books.unshift(next)
  saveData(data)
}

export function deleteBook(id: string) {
  const data = loadData()
  data.books = data.books.filter((b) => b.id !== id)
  saveData(data)
}

export function addCategory(name: string) {
  const data = loadData()
  const trimmed = name.trim()
  if (!trimmed) throw new Error('分类名不能为空')
  if (data.categories.includes(trimmed)) throw new Error('分类已存在')
  data.categories.push(trimmed)
  saveData(data)
}

export function renameCategory(oldName: string, newName: string) {
  const data = loadData()
  const trimmed = newName.trim()
  if (!trimmed) throw new Error('分类名不能为空')
  if (oldName === trimmed) return
  if (data.categories.includes(trimmed)) throw new Error('分类已存在')
  data.categories = data.categories.map((c) => (c === oldName ? trimmed : c))
  data.books = data.books.map((b) =>
    b.category === oldName ? { ...b, category: trimmed } : b,
  )
  saveData(data)
}

export function deleteCategory(name: string) {
  const data = loadData()
  const used = data.books.some((b) => b.category === name)
  if (used) throw new Error('该分类下还有书籍，无法删除')
  data.categories = data.categories.filter((c) => c !== name)
  saveData(data)
}

export function emptyBook(category?: string): Book {
  const data = loadData()
  return {
    id: createId('book'),
    title: '',
    series: '',
    description: '',
    author: '',
    category: category || data.categories[0] || '未分类',
    access: '免费',
    cover: '',
    chapters: [],
    updatedAt: Date.now(),
  }
}

export function emptyChapter(): Chapter {
  return { id: createId('ch'), title: '', content: '', children: [] }
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
