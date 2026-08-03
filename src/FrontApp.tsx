import { useEffect, useMemo, useRef, useState } from 'react'
import type { AccessLevel, AppData, Book, Chapter } from './types'
import { loadData, subscribe } from './store/bookStore'
import './App.css'

type TabKey = 'home' | 'category'

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

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg className={`chevron${open ? ' open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
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

function Badge({ access }: { access: AccessLevel }) {
  return <span className={`badge badge-${access}`}>{access}</span>
}

function accessLabel(access: AccessLevel) {
  if (access === '需权限') return '年度会员'
  if (access === '推荐') return '精选推荐'
  return '免费阅读'
}

function BookCard({ book, onClick }: { book: Book; onClick: () => void }) {
  return (
    <button type="button" className="book-card" onClick={onClick}>
      <div className="book-title">{book.title}</div>
      <div className="book-meta">{accessLabel(book.access)}</div>
      <div className="book-desc">{book.series} · {book.description}</div>
    </button>
  )
}

function ChapterGroup({ chapter, onSelect }: { chapter: Chapter; onSelect: (title: string) => void }) {
  const [open, setOpen] = useState(true)
  const hasChildren = chapter.children && chapter.children.length > 0

  return (
    <div className="chapter-group">
      <button
        type="button"
        className="chapter-group-header"
        onClick={() => {
          if (hasChildren) setOpen((v) => !v)
          else onSelect(chapter.title)
        }}
      >
        <span>{chapter.title}</span>
        {hasChildren && <ChevronDownIcon open={open} />}
      </button>
      {hasChildren && open && (
        <div className="chapter-children">
          {chapter.children!.map((child) => (
            <button
              key={child.id}
              type="button"
              className="chapter-item"
              onClick={() => onSelect(child.title)}
            >
              <span className="chapter-dot" />
              {child.title}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function DetailView({
  book,
  onBack,
  onToast,
}: {
  book: Book
  onBack: () => void
  onToast: (msg: string) => void
}) {
  return (
    <div className="detail-page">
      <div className="detail-nav">
        <button type="button" className="back-btn" onClick={onBack} aria-label="返回">
          <BackIcon />
        </button>
        <div className="detail-nav-title">目录</div>
      </div>

      <div className="detail-hero">
        <div className="book-title">{book.title}</div>
        <div className="book-series">{book.series}</div>
        <div className="book-desc">{book.description}</div>
        <div className="detail-meta">
          <span className="detail-category">{book.category}</span>
          <Badge access={book.access} />
        </div>
      </div>

      <div className="chapter-section">
        <div className="chapter-section-title">章节目录</div>
        {book.chapters.map((ch) => (
          <ChapterGroup
            key={ch.id}
            chapter={ch}
            onSelect={(title) => onToast(`已选择：${title}`)}
          />
        ))}
      </div>
    </div>
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

      <div className="home-admin-entry">
        <a href="#/admin">电脑端管理后台 →</a>
      </div>
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

export default function FrontApp() {
  const data = useAppData()
  const [tab, setTab] = useState<TabKey>('category')
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('全部')
  const [selected, setSelected] = useState<Book | null>(null)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<number | null>(null)

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
        b.category.includes(q)
      return matchCat && matchKw
    })
  }, [data.books, keyword, category])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [selected, tab])

  const showToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 1800)
  }

  const openBook = (book: Book) => setSelected(book)

  return (
    <div className="app-shell">
      {selected ? (
        <DetailView
          book={selected}
          onBack={() => setSelected(null)}
          onToast={showToast}
        />
      ) : (
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
          </nav>
        </>
      )}

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </div>
  )
}
