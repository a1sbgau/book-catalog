const KEY = 'book-catalog-video-progress'

type ProgressMap = Record<string, Record<string, number>>

function loadAll(): ProgressMap {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') as ProgressMap
  } catch {
    return {}
  }
}

export function getVideoProgress(bookId: string, chapterId: string) {
  return loadAll()[bookId]?.[chapterId] || 0
}

export function setVideoProgress(bookId: string, chapterId: string, percent: number) {
  const all = loadAll()
  if (!all[bookId]) all[bookId] = {}
  all[bookId][chapterId] = Math.min(100, Math.max(0, Math.round(percent)))
  localStorage.setItem(KEY, JSON.stringify(all))
}
