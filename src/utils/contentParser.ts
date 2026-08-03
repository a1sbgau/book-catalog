import type { Book, Chapter, FlatChapter } from '../types'
import { createId } from './id'

export type ImportFormat = 'json' | 'markdown' | 'txt' | 'auto'

function detectFormat(filename: string, text: string): Exclude<ImportFormat, 'auto'> {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.json')) return 'json'
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'markdown'
  if (lower.endsWith('.txt')) return 'txt'
  const trimmed = text.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json'
  if (/^#{1,3}\s+/m.test(trimmed)) return 'markdown'
  return 'txt'
}

function cleanTitle(raw: string) {
  return raw.replace(/^#+\s*/, '').replace(/^第.+?[章节回]\s*/, (m) => m).trim() || '未命名章节'
}

/** 解析后台导出的 JSON（整库 / 单本书 / 章节数组） */
export function parseJsonBook(text: string): Partial<Book> & { chapters: Chapter[] } {
  const data = JSON.parse(text) as unknown

  if (Array.isArray(data)) {
    return { chapters: normalizeChapters(data) }
  }

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    // 整库格式
    if (Array.isArray(obj.books) && obj.books[0]) {
      const first = obj.books[0] as Book
      return {
        title: first.title,
        series: first.series,
        description: first.description,
        category: first.category,
        access: first.access,
        cover: first.cover,
        author: first.author,
        chapters: normalizeChapters(first.chapters || []),
      }
    }
    // 单书格式
    return {
      title: typeof obj.title === 'string' ? obj.title : undefined,
      series: typeof obj.series === 'string' ? obj.series : undefined,
      description: typeof obj.description === 'string' ? obj.description : undefined,
      category: typeof obj.category === 'string' ? obj.category : undefined,
      author: typeof obj.author === 'string' ? obj.author : undefined,
      cover: typeof obj.cover === 'string' ? obj.cover : undefined,
      chapters: normalizeChapters((obj.chapters as unknown[]) || []),
    }
  }

  throw new Error('无法识别的 JSON 结构')
}

function normalizeChapters(list: unknown[]): Chapter[] {
  return list
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const c = item as Record<string, unknown>
      const title = String(c.title || c.name || '').trim()
      if (!title) return null
      const children = Array.isArray(c.children) ? normalizeChapters(c.children) : undefined
      const content =
        typeof c.content === 'string'
          ? c.content
          : typeof c.body === 'string'
            ? c.body
            : typeof c.text === 'string'
              ? c.text
              : undefined
      const videoUrl =
        typeof c.videoUrl === 'string'
          ? c.videoUrl
          : typeof c.video === 'string'
            ? c.video
            : typeof c.url === 'string'
              ? c.url
              : undefined
      const duration = typeof c.duration === 'number' ? c.duration : undefined
      return {
        id: typeof c.id === 'string' ? c.id : createId('ch'),
        title,
        content,
        videoUrl,
        duration,
        children: children?.length ? children : undefined,
      } satisfies Chapter
    })
    .filter(Boolean) as Chapter[]
}

/** Markdown：按 # / ## / ### 切分章节 */
export function parseMarkdownBook(text: string): { title?: string; chapters: Chapter[] } {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  let bookTitle: string | undefined
  const chapters: Chapter[] = []
  let current: Chapter | null = null
  let currentChild: Chapter | null = null
  let buf: string[] = []

  const flush = () => {
    const content = buf.join('\n').trim()
    buf = []
    if (currentChild) {
      currentChild.content = content || currentChild.content
      currentChild = null
    } else if (current) {
      current.content = content || current.content
    }
  }

  for (const line of lines) {
    const h1 = line.match(/^#\s+(.+)/)
    const h2 = line.match(/^##\s+(.+)/)
    const h3 = line.match(/^###\s+(.+)/)

    if (h1) {
      flush()
      if (!bookTitle && chapters.length === 0 && !current) {
        bookTitle = h1[1].trim()
      } else {
        current = { id: createId('ch'), title: h1[1].trim(), children: [] }
        chapters.push(current)
      }
      continue
    }
    if (h2) {
      flush()
      current = { id: createId('ch'), title: h2[1].trim(), children: [] }
      chapters.push(current)
      continue
    }
    if (h3) {
      flush()
      if (!current) {
        current = { id: createId('ch'), title: '正文', children: [] }
        chapters.push(current)
      }
      currentChild = { id: createId('sub'), title: h3[1].trim() }
      if (!current.children) current.children = []
      current.children.push(currentChild)
      continue
    }
    buf.push(line)
  }
  flush()

  if (chapters.length === 0) {
    const body = text.trim()
    if (body) {
      chapters.push({ id: createId('ch'), title: bookTitle || '全文', content: body })
    }
  }

  return { title: bookTitle, chapters }
}

/** TXT：按「第X章/节」或空行分隔解析 */
export function parseTxtBook(text: string): { title?: string; chapters: Chapter[] } {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  if (!normalized) return { chapters: [] }

  const chapterRe = /^(第[\d一二三四五六七八九十百千零两]+[章节回部卷]|Chapter\s+\d+)[、.．:\s]*(.*)$/gim
  const matches = [...normalized.matchAll(chapterRe)]

  if (matches.length > 0) {
    const chapters: Chapter[] = []
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i]
      const start = (m.index || 0) + m[0].length
      const end = i + 1 < matches.length ? matches[i + 1].index || normalized.length : normalized.length
      const title = cleanTitle(`${m[1]}${m[2] ? ' ' + m[2] : ''}`)
      const content = normalized.slice(start, end).trim()
      chapters.push({ id: createId('ch'), title, content })
    }
    const head = normalized.slice(0, matches[0].index || 0).trim()
    const titleLine = head.split('\n').find((l) => l.trim())
    return { title: titleLine?.slice(0, 40), chapters }
  }

  // 按双空行分块
  const blocks = normalized.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
  if (blocks.length >= 2) {
    return {
      title: blocks[0].split('\n')[0].slice(0, 40),
      chapters: blocks.map((b, i) => {
        const lines = b.split('\n')
        const title = lines[0].slice(0, 40) || `第 ${i + 1} 节`
        const content = lines.slice(1).join('\n').trim() || b
        return { id: createId('ch'), title, content }
      }),
    }
  }

  return {
    chapters: [{ id: createId('ch'), title: '全文', content: normalized }],
  }
}

export function parseBookContent(
  text: string,
  filename = '',
  format: ImportFormat = 'auto',
): Partial<Book> & { chapters: Chapter[]; detectedFormat: string } {
  const kind = format === 'auto' ? detectFormat(filename, text) : format
  if (kind === 'json') {
    const parsed = parseJsonBook(text)
    return { ...parsed, detectedFormat: 'JSON' }
  }
  if (kind === 'markdown') {
    const parsed = parseMarkdownBook(text)
    return { ...parsed, detectedFormat: 'Markdown' }
  }
  const parsed = parseTxtBook(text)
  return { ...parsed, detectedFormat: 'TXT' }
}

/** 展平章节为阅读 / 播放列表 */
export function flattenChapters(chapters: Chapter[]): FlatChapter[] {
  const list: FlatChapter[] = []
  for (const ch of chapters) {
    if (ch.children?.length) {
      for (const child of ch.children) {
        list.push({
          id: child.id,
          title: child.title,
          content: child.content || ch.content || '',
          path: `${ch.title} / ${child.title}`,
          videoUrl: child.videoUrl || ch.videoUrl,
          duration: child.duration ?? ch.duration,
        })
      }
    } else {
      list.push({
        id: ch.id,
        title: ch.title,
        content: ch.content || '',
        path: ch.title,
        videoUrl: ch.videoUrl,
        duration: ch.duration,
      })
    }
  }
  return list
}

export function formatDuration(seconds?: number) {
  const s = Math.max(0, Math.floor(seconds || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  if (h > 0) return `${String(h).padStart(2, '0')}:${mm}:${ss}`
  return `00:${mm}:${ss}`
}

export function isVideoBook(book: Book) {
  if (book.type === 'video') return true
  if (book.type === 'text') return false
  const flat = flattenChapters(book.chapters)
  return flat.length > 0 && flat.every((c) => !!c.videoUrl)
}

export function countWords(book: Book) {
  return flattenChapters(book.chapters).reduce((sum, c) => sum + (c.content?.replace(/\s/g, '').length || 0), 0)
}
