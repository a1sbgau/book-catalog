export type AccessLevel = '免费' | '需权限' | '推荐'
export type BookType = 'text' | 'video' | 'image'

export interface Chapter {
  id: string
  title: string
  /** 图文正文 */
  content?: string
  /** 视频地址 */
  videoUrl?: string
  duration?: number
  /** 章节图片（含 PDF 扫描转成的页面），dataURL */
  images?: string[]
  children?: Chapter[]
}

export interface Book {
  id: string
  title: string
  series: string
  description: string
  category: string
  access: AccessLevel
  /** 图文 / 视频 / 图片(含扫描件) */
  type?: BookType
  cover?: string
  author?: string
  /** 展示用日期 */
  date?: string
  chapters: Chapter[]
  updatedAt?: number
}

export interface AppData {
  categories: string[]
  books: Book[]
  version?: number
  updatedAt?: number
  favorites?: string[]
}

export interface FlatChapter {
  id: string
  title: string
  content: string
  path: string
  videoUrl?: string
  duration?: number
  images?: string[]
}
