import { useEffect, useMemo, useRef, useState } from 'react'
import type { Book } from './types'
import { flattenChapters } from './utils/contentParser'
import { isFavorite, toggleFavorite } from './store/bookStore'

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

export default function ImageReaderPage({
  book,
  chapterId,
  onBack,
  onChangeChapter,
}: {
  book: Book
  chapterId?: string
  onBack: () => void
  onChangeChapter: (id: string) => void
}) {
  const flat = useMemo(() => flattenChapters(book.chapters), [book.chapters])
  const index = Math.max(0, flat.findIndex((c) => c.id === chapterId))
  const current = flat[index] || flat[0]
  const images = current?.images || []
  const [fav, setFav] = useState(() => isFavorite(book.id))
  const [page, setPage] = useState(0)
  const scrollerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setPage(0)
    scrollerRef.current?.scrollTo({ top: 0 })
  }, [current?.id])

  if (!current) {
    return (
      <div className="img-reader">
        <div className="img-reader-bar">
          <button type="button" className="back-btn" onClick={onBack}><BackIcon /></button>
        </div>
        <div className="empty-state">暂无章节图片，请在后台上传</div>
      </div>
    )
  }

  return (
    <div className="img-reader">
      <div className="img-reader-bar">
        <button type="button" className="back-btn" onClick={onBack} aria-label="返回">
          <BackIcon />
        </button>
        <div className="img-reader-head">
          <div className="img-series">{book.series || book.category}</div>
          <div className="img-title">{current.title || book.title}</div>
          <div className="img-date">{book.date || (book.updatedAt ? new Date(book.updatedAt).toISOString().slice(0, 10) : '')}</div>
        </div>
        <button
          type="button"
          className={`img-fav${fav ? ' on' : ''}`}
          onClick={() => {
            void toggleFavorite(book.id).then(setFav)
          }}
        >
          {fav ? '已收藏' : '收藏'}
        </button>
      </div>

      <div className="img-reader-body" ref={scrollerRef}>
        {images.length === 0 ? (
          <div className="empty-state">本章暂无图片 / PDF 页面</div>
        ) : (
          images.map((src, i) => (
            <figure key={`${current.id}-${i}`} className="img-page">
              <img
                src={src}
                alt={`第 ${i + 1} 页`}
                onLoad={() => {
                  if (i === page) setPage(i)
                }}
              />
            </figure>
          ))
        )}
      </div>

      <div className="img-reader-footer">
        <button
          type="button"
          className="reader-nav-btn"
          disabled={index <= 0}
          onClick={() => onChangeChapter(flat[index - 1].id)}
        >
          上一章
        </button>
        <span className="reader-progress">
          {index + 1}/{flat.length} · {images.length}页
        </span>
        <button
          type="button"
          className="reader-nav-btn"
          disabled={index >= flat.length - 1}
          onClick={() => onChangeChapter(flat[index + 1].id)}
        >
          下一章
        </button>
      </div>
    </div>
  )
}
