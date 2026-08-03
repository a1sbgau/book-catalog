export type AccessLevel = '免费' | '需权限' | '推荐'

export interface Chapter {
  id: string
  title: string
  children?: Chapter[]
}

export interface Book {
  id: string
  title: string
  series: string
  description: string
  category: string
  access: AccessLevel
  chapters: Chapter[]
}

export interface AppData {
  categories: string[]
  books: Book[]
}
