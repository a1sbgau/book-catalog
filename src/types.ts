export type AccessLevel = '免费' | '需权限' | '推荐'

export interface Chapter {
  id: string
  title: string
  /** 章节正文 */
  content?: string
  children?: Chapter[]
}

export interface Book {
  id: string
  title: string
  series: string
  description: string
  category: string
  access: AccessLevel
  /** 封面：压缩后的 dataURL 或外链 */
  cover?: string
  /** 作者 */
  author?: string
  chapters: Chapter[]
  updatedAt?: number
}

export interface AppData {
  categories: string[]
  books: Book[]
  version?: number
  updatedAt?: number
}
