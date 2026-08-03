import { useEffect, useMemo, useRef, useState } from 'react'
import type { AccessLevel, AppData, Book } from './types'
import { loadData, subscribe } from './store/bookStore'
import { countWords, flattenChapters, isImageBook, isVideoBook } from './utils/contentParser'
import ImageReaderPage from './ImageReaderPage'
import VideoBookPage from './VideoBookPage'
import './App.css'

type TabKey = 'home' | 'category' | 'admin'
type View =
  | { name: 'tabs' }
  | { name: 'detail'; bookId: string }
  | { name: 'reader'; bookId: string; chapterId?: string }
  | { name: 'video'; bookId: string; chapterId?: string }
  | { name: 'image'; bookId: string; chapterId?: string }

function useAppData() {
  const [data, setData] = useState<AppData>(() => loadData())
  useEffect(() => subscribe(() => setData(loadData())), [])
  return data
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" fill={active ? 'currentColor' : 'none'} />
    </svg>
  )
}

function CategoryIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  )
}

function AdminIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" fill={active ? 'currentColor' : 'none'} />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

function accessLabel(access: AccessLevel) {
  if (access === '需权限') return '年度会员'
  if (access === '推荐') return '精选推荐'
  return '免费阅读'
}

function Cover({ book, className = '' }: { book: Book; className?: string }) {
  if (book.cover) {
    return <img className={`book-cover-img ${className}`} src={book.cover} alt={book.title} />
  }
  const hue = (book.title.charCodeAt(0) * 37) % 360
  return (
    <div
      className={`book-cover-fallback ${className}`}
      style={{ background: `linear-gradient(145deg, hsl(${hue},55%,48%), hsl(${(hue + 40) % 360},45%,32%))` }}
    >
      <span>{book.title.slice(0, 1)}</span>
    </div>
  )
}

function BookCard({ book, onClick }: { book: Book; onClick: () => void }) {
  return (
    <button type="button" className="book-card book-card-with-cover" onClick={onClick}>
      <Cover book={book} className="card-cover" />
      <div className="book-card-body">
        <div className="book-title">{book.title}</div>
        <div className="book-meta">{book.author || accessLabel(book.access)}</div>
        <div className="book-desc">{book.series} · {book.description}</div>
      </div>
    </button>
  )
}

function HomePage({
  books,
  onOpenBook,
  onGoCategory,
}: {
  books: Book[]
  onOpenBook: (b: Book) => void
  onGoCategory: () => void
}) {
  const recommended = books.filter((b) => b.access === '推荐').slice(0, 4)
  const free = books.filter((b) => b.access === '免费').slice(0, 4)

  return (
    <div className="home-page">
      <header className="home-header">
        <h1 className="home-brand">学科书库</h1>
        <p className="home-sub">系统化学习资料，按学科分类查阅</p>
      </header>

      <section className="home-section">
        <div className="home-section-head">
          <h2>精选推荐</h2>
          <button type="button" className="link-btn" onClick={onGoCategory}>查看全部分类</button>
        </div>
        <div className="home-card-list">
          {recommended.length === 0 ? (
            <div className="empty-state">暂无推荐内容</div>
          ) : (
            recommended.map((book) => (
              <button key={book.id} type="button" className="home-book-card" onClick={() => onOpenBook(book)}>
                <div className="home-book-cat">{book.category}</div>
                <div className="book-title">{book.title}</div>
                <div className="book-desc">{book.series}</div>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-head">
          <h2>免费阅读</h2>
        </div>
        <div className="home-card-list">
          {free.length === 0 ? (
            <div className="empty-state">暂无免费内容</div>
          ) : (
            free.map((book) => (
              <button key={book.id} type="button" className="home-book-card" onClick={() => onOpenBook(book)}>
                <div className="home-book-cat">{book.category}</div>
                <div className="book-title">{book.title}</div>
                <div className="book-desc">{book.series}</div>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

function CategoryPage({
  keyword,
  setKeyword,
  category,
  setCategory,
  categories,
  books: list,
  onOpenBook,
}: {
  keyword: string
  setKeyword: (v: string) => void
  category: string
  setCategory: (c: string) => void
  categories: string[]
  books: Book[]
  onOpenBook: (b: Book) => void
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const sideCats = ['全部', ...categories]

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 })
  }, [category, keyword])

  return (
    <div className="category-page">
      <header className="header">
        <div className="search-bar">
          <SearchIcon />
          <input
            type="search"
            placeholder="搜索内容标题"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            enterKeyHint="search"
          />
        </div>
      </header>

      <div className="category-body">
        <aside className="side-nav">
          {sideCats.map((c) => (
            <button
              key={c}
              type="button"
              className={`side-item${category === c ? ' active' : ''}`}
              onClick={() => setCategory(c)}
            >
              <span className="side-indicator" />
              <span className="side-label">{c}</span>
            </button>
          ))}
        </aside>

        <div className="book-panel" ref={listRef}>
          {list.length === 0 ? (
            <div className="empty-state">暂无相关内容</div>
          ) : (
            list.map((book) => (
              <BookCard key={book.id} book={book} onClick={() => onOpenBook(book)} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function BookDetailPage({
  book,
  onBack,
  onRead,
}: {
  book: Book
  onBack: () => void
  onRead: (chapterId?: string) => void
}) {
  const flat = flattenChapters(book.chapters)
  const words = countWords(book)

  return (
    <div className="detail-page book-official">
      <div className="detail-nav">
        <button type="button" className="back-btn" onClick={onBack} aria-label="返回">
          <BackIcon />
        </button>
        <div className="detail-nav-title">书籍详情</div>
      </div>

      <div className="official-hero">
        <Cover book={book} className="official-cover" />
        <div className="official-info">
          <h1 className="official-title">{book.title}</h1>
          <p className="official-author">{book.author || '佚名'} · {book.category}</p>
          <p className="official-series">{book.series || '暂无丛书信息'}</p>
          <div className="official-tags">
            <span className={`badge badge-${book.access}`}>{accessLabel(book.access)}</span>
            <span className="meta-chip">{flat.length} 章节</span>
            {words > 0 && <span className="meta-chip">约 {words} 字</span>}
          </div>
        </div>
      </div>

      <div className="official-desc-card">
        <h3>内容简介</h3>
        <p>{book.description || '暂无简介'}</p>
      </div>

      <div className="official-actions">
        <button
          type="button"
          className="official-primary"
          onClick={() => onRead(flat[0]?.id)}
          disabled={flat.length === 0}
        >
          {isImageBook(book) ? '查看图片' : isVideoBook(book) ? '开始播放' : '开始阅读'}
        </button>
      </div>

      <div className="official-toc">
        <h3>目录</h3>
        {flat.length === 0 ? (
          <div className="empty-state">暂无章节，请在后台导入内容</div>
        ) : (
          <ul>
            {flat.map((ch, i) => (
              <li key={ch.id}>
                <button type="button" onClick={() => onRead(ch.id)}>
                  <span className="toc-index">{String(i + 1).padStart(2, '0')}</span>
                  <span className="toc-title">{ch.path}</span>
                  <span className="toc-arrow">›</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function ReaderPage({
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
  const flat = flattenChapters(book.chapters)
  const index = Math.max(0, flat.findIndex((c) => c.id === chapterId))
  const current = flat[index] || flat[0]
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 })
  }, [current?.id])

  if (!current) {
    return (
      <div className="reader-page">
        <div className="reader-bar">
          <button type="button" className="back-btn" onClick={onBack}><BackIcon /></button>
          <span>{book.title}</span>
        </div>
        <div className="empty-state">暂无正文</div>
      </div>
    )
  }

  const paragraphs = (current.content || '本章暂无正文内容。\n请在管理后台编辑章节，或导入 Markdown / TXT / JSON 文件。')
    .split(/\n+/)
    .filter(Boolean)

  return (
    <div className="reader-page">
      <div className="reader-bar">
        <button type="button" className="back-btn" onClick={onBack} aria-label="返回">
          <BackIcon />
        </button>
        <div className="reader-bar-title">
          <div className="reader-book">{book.title}</div>
          <div className="reader-chapter">{current.path}</div>
        </div>
      </div>

      <div className="reader-body" ref={contentRef}>
        <h2 className="reader-heading">{current.title}</h2>
        <article className="reader-article">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </article>
      </div>

      <div className="reader-footer">
        <button
          type="button"
          className="reader-nav-btn"
          disabled={index <= 0}
          onClick={() => onChangeChapter(flat[index - 1].id)}
        >
          上一章
        </button>
        <span className="reader-progress">{index + 1} / {flat.length}</span>
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

export default function FrontApp() {
  const data = useAppData()
  const [tab, setTab] = useState<TabKey>('category')
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('全部')
  const [view, setView] = useState<View>({ name: 'tabs' })
  const [toast] = useState('')

  useEffect(() => {
    if (category !== '全部' && !data.categories.includes(category)) {
      setCategory('全部')
    }
  }, [data.categories, category])

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    return data.books.filter((b) => {
      const matchCat = category === '全部' || b.category === category
      const matchKw =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.series.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        (b.author || '').toLowerCase().includes(q) ||
        b.category.includes(q)
      return matchCat && matchKw
    })
  }, [data.books, keyword, category])

  const currentBook = useMemo(() => {
    if (view.name === 'tabs') return null
    return data.books.find((b) => b.id === view.bookId) || null
  }, [data.books, view])

  useEffect(() => {
    if (view.name !== 'tabs' && !currentBook) {
      setView({ name: 'tabs' })
    }
  }, [view, currentBook])

  const openBook = (book: Book) => {
    const first = flattenChapters(book.chapters)[0]
    if (isVideoBook(book)) {
      setView({ name: 'video', bookId: book.id, chapterId: first?.id })
      return
    }
    if (isImageBook(book)) {
      setView({ name: 'image', bookId: book.id, chapterId: first?.id })
      return
    }
    setView({ name: 'detail', bookId: book.id })
  }

  return (
    <div className="app-shell">
      {view.name === 'detail' && currentBook && (
        <BookDetailPage
          book={currentBook}
          onBack={() => setView({ name: 'tabs' })}
          onRead={(chapterId) => {
            if (isImageBook(currentBook)) {
              setView({ name: 'image', bookId: currentBook.id, chapterId })
            } else if (isVideoBook(currentBook)) {
              setView({ name: 'video', bookId: currentBook.id, chapterId })
            } else {
              setView({ name: 'reader', bookId: currentBook.id, chapterId })
            }
          }}
        />
      )}

      {view.name === 'reader' && currentBook && (
        <ReaderPage
          book={currentBook}
          chapterId={view.chapterId}
          onBack={() => setView({ name: 'detail', bookId: currentBook.id })}
          onChangeChapter={(id) => setView({ name: 'reader', bookId: currentBook.id, chapterId: id })}
        />
      )}

      {view.name === 'video' && currentBook && (
        <VideoBookPage
          book={currentBook}
          chapterId={view.chapterId}
          onBack={() => setView({ name: 'tabs' })}
          onChangeChapter={(id) => setView({ name: 'video', bookId: currentBook.id, chapterId: id })}
        />
      )}

      {view.name === 'image' && currentBook && (
        <ImageReaderPage
          book={currentBook}
          chapterId={view.chapterId}
          onBack={() => setView({ name: 'tabs' })}
          onChangeChapter={(id) => setView({ name: 'image', bookId: currentBook.id, chapterId: id })}
        />
      )}

      {view.name === 'tabs' && (
        <>
          <div className="page-area">
            {tab === 'home' && (
              <HomePage
                books={data.books}
                onOpenBook={openBook}
                onGoCategory={() => setTab('category')}
              />
            )}
            {tab === 'category' && (
              <CategoryPage
                keyword={keyword}
                setKeyword={setKeyword}
                category={category}
                setCategory={setCategory}
                categories={data.categories}
                books={filtered}
                onOpenBook={openBook}
              />
            )}
            {tab === 'admin' && (
              <div className="admin-entry-page">
                <h2>内容管理</h2>
                <p>在手机上上传图片、扫描 PDF、管理书籍，全部保存在本机。</p>
                <a className="official-primary admin-entry-btn" href="#/admin">进入后台</a>
                <p className="admin-entry-tip">默认密码：admin123</p>
              </div>
            )}
          </div>

          <nav className="tab-bar">
            <button
              type="button"
              className={`tab-item${tab === 'home' ? ' active' : ''}`}
              onClick={() => setTab('home')}
            >
              <HomeIcon active={tab === 'home'} />
              <span>首页</span>
            </button>
            <button
              type="button"
              className={`tab-item${tab === 'category' ? ' active' : ''}`}
              onClick={() => setTab('category')}
            >
              <CategoryIcon active={tab === 'category'} />
              <span>分类</span>
            </button>
            <button
              type="button"
              className={`tab-item${tab === 'admin' ? ' active' : ''}`}
              onClick={() => setTab('admin')}
            >
              <AdminIcon active={tab === 'admin'} />
              <span>后台</span>
            </button>
          </nav>
        </>
      )}

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </div>
  )
}
