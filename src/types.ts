export type AccessLevel = '免费' | '需权限' | '推荐'
export type BookType = 'text' | 'video'

export interface Chapter {
  id: string
  title: string
  /** 章节正文（图文书） */
  content?: string
  /** 视频地址（视频书，支持 mp4 / webm 直链） */
  videoUrl?: string
  /** 时长（秒） */
  duration?: number
  children?: Chapter[]
}

export interface Book {
  id: string
  title: string
  series: string
  description: string
  category: string
  access: AccessLevel
  /** 书籍类型：图文 / 视频 */
  type?: BookType
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

export interface FlatChapter {
  id: string
  title: string
  content: string
  path: string
  videoUrl?: string
  duration?: number
}
