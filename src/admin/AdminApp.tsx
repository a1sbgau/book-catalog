import { useEffect, useMemo, useState } from 'react'
import type { AccessLevel, AppData, Book, Chapter } from '../types'
import {
  ACCESS_OPTIONS,
  addCategory,
  adminLogin,
  adminLogout,
  createId,
  deleteBook,
  deleteCategory,
  emptyBook,
  emptyChapter,
  exportDataJson,
  getAdminPasswordHint,
  importDataJson,
  isAdminAuthed,
  loadData,
  renameCategory,
  resetData,
  subscribe,
  upsertBook,
} from '../store/bookStore'
import { parseBookContent } from '../utils/contentParser'
import { compressCover } from '../utils/image'
import './Admin.css'

type MenuKey = 'dashboard' | 'books' | 'categories' | 'data'

function useAppData() {
  const [data, setData] = useState<AppData>(() => loadData())
  useEffect(() => subscribe(() => setData(loadData())), [])
  return data
}

function AccessTag({ access }: { access: AccessLevel }) {
  const cls =
    access === '推荐'
      ? 'ry-tag-primary'
      : access === '免费'
        ? 'ry-tag-success'
        : 'ry-tag-warning'
  return <span className={`ry-tag ${cls}`}>{access}</span>
}

function LoginView({ onSuccess }: { onSuccess: () => void }) {
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState('')

  return (
    <div className="ry-root ry-login">
      <div className="ry-login-card">
        <div className="ry-login-title">学科书库后台</div>
        <div className="ry-login-sub">若依风格管理端 · 本地数据存储</div>
        {error && <div className="ry-login-error">{error}</div>}
        <div className="ry-form-item">
          <label>管理员密码</label>
          <input
            className="ry-input"
            type="password"
            placeholder="请输入密码"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (adminLogin(pwd)) onSuccess()
                else setError('密码错误')
              }
            }}
          />
          <div className="ry-hint">默认密码：{getAdminPasswordHint()}</div>
        </div>
        <button
          type="button"
          className="ry-btn ry-btn-primary"
          onClick={() => {
            if (adminLogin(pwd)) onSuccess()
            else setError('密码错误')
          }}
        >
          登 录
        </button>
      </div>
    </div>
  )
}

function BookDialog({
  initial,
  categories,
  onClose,
  onSave,
}: {
  initial: Book
  categories: string[]
  onClose: () => void
  onSave: (book: Book) => void
}) {
  const [form, setForm] = useState<Book>(() => structuredClone(initial))
  const [importHint, setImportHint] = useState('')

  const setField = <K extends keyof Book>(key: K, value: Book[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const updateChapter = (ci: number, patch: Partial<Chapter>) => {
    setForm((prev) => {
      const chapters = [...prev.chapters]
      chapters[ci] = { ...chapters[ci], ...patch }
      return { ...prev, chapters }
    })
  }

  const updateChild = (ci: number, childIdx: number, patch: Partial<Chapter>) => {
    setForm((prev) => {
      const chapters = [...prev.chapters]
      const children = [...(chapters[ci].children || [])]
      children[childIdx] = { ...children[childIdx], ...patch }
      chapters[ci] = { ...chapters[ci], children }
      return { ...prev, chapters }
    })
  }

  const onCoverChange = async (file?: File | null) => {
    if (!file) return
    try {
      const cover = await compressCover(file)
      setField('cover', cover)
    } catch (err) {
      alert(err instanceof Error ? err.message : '封面上传失败')
    }
  }

  const onImportContent = async (file?: File | null) => {
    if (!file) return
    try {
      const text = await file.text()
      const parsed = parseBookContent(text, file.name, 'auto')
      setForm((prev) => ({
        ...prev,
        title: prev.title || parsed.title || prev.title,
        series: prev.series || parsed.series || prev.series,
        description: prev.description || parsed.description || prev.description,
        author: prev.author || parsed.author || prev.author,
        category: parsed.category && categories.includes(parsed.category) ? parsed.category : prev.category,
        cover: parsed.cover || prev.cover,
        chapters: parsed.chapters.length ? parsed.chapters : prev.chapters,
      }))
      setImportHint(`已解析为 ${parsed.detectedFormat}，共 ${parsed.chapters.length} 个章节`)
    } catch (err) {
      alert(err instanceof Error ? err.message : '内容解析失败')
    }
  }

  return (
    <div className="ry-mask" onClick={onClose}>
      <div className="ry-dialog ry-dialog-lg" onClick={(e) => e.stopPropagation()}>
        <div className="ry-dialog-header">
          <span>{initial.title ? '编辑书籍' : '新增书籍'}</span>
          <button type="button" className="ry-dialog-close" onClick={onClose}>×</button>
        </div>
        <div className="ry-dialog-body">
          <div className="ry-cover-row">
            <div className="ry-cover-preview">
              {form.cover ? (
                <img src={form.cover} alt="封面" />
              ) : (
                <span>暂无封面</span>
              )}
            </div>
            <div className="ry-cover-actions">
              <label className="ry-btn ry-btn-primary" style={{ cursor: 'pointer' }}>
                上传封面
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    void onCoverChange(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
              </label>
              {form.cover && (
                <button type="button" className="ry-btn" onClick={() => setField('cover', '')}>
                  移除封面
                </button>
              )}
              <div className="ry-hint">支持 JPG / PNG，自动压缩；建议竖版封面</div>
              <label className="ry-btn ry-btn-success" style={{ cursor: 'pointer', marginTop: 10 }}>
                导入书籍内容
                <input
                  type="file"
                  accept=".json,.md,.markdown,.txt,application/json,text/plain,text/markdown"
                  hidden
                  onChange={(e) => {
                    void onImportContent(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
              </label>
              <div className="ry-hint">
                自动识别 JSON / Markdown / TXT（支持「第X章」标题）
                {importHint ? ` · ${importHint}` : ''}
              </div>
            </div>
          </div>

          <div className="ry-form-row">
            <div className="ry-form-item">
              <label>书名 *</label>
              <input className="ry-input" value={form.title} onChange={(e) => setField('title', e.target.value)} />
            </div>
            <div className="ry-form-item">
              <label>作者</label>
              <input className="ry-input" value={form.author || ''} onChange={(e) => setField('author', e.target.value)} />
            </div>
          </div>
          <div className="ry-form-row">
            <div className="ry-form-item">
              <label>丛书 / 系列</label>
              <input className="ry-input" value={form.series} onChange={(e) => setField('series', e.target.value)} />
            </div>
            <div className="ry-form-item">
              <label>分类</label>
              <select className="ry-select" value={form.category} onChange={(e) => setField('category', e.target.value)}>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="ry-form-row">
            <div className="ry-form-item">
              <label>权限标签</label>
              <select
                className="ry-select"
                value={form.access}
                onChange={(e) => setField('access', e.target.value as AccessLevel)}
              >
                {ACCESS_OPTIONS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div className="ry-form-item">
              <label>简介</label>
              <input className="ry-input" value={form.description} onChange={(e) => setField('description', e.target.value)} />
            </div>
          </div>

          <div className="ry-form-item">
            <label>章节目录与正文</label>
            {form.chapters.map((ch, ci) => (
              <div key={ch.id} className="ry-chapter-box">
                <div className="ry-chapter-row">
                  <input
                    className="ry-input"
                    placeholder="单元 / 章节标题"
                    value={ch.title}
                    onChange={(e) => updateChapter(ci, { title: e.target.value })}
                  />
                  <button
                    type="button"
                    className="ry-btn"
                    onClick={() => {
                      const children = [...(ch.children || []), { id: createId('sub'), title: '', content: '' }]
                      updateChapter(ci, { children })
                    }}
                  >
                    加小节
                  </button>
                  <button
                    type="button"
                    className="ry-btn"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        chapters: prev.chapters.filter((_, i) => i !== ci),
                      }))
                    }
                  >
                    删除
                  </button>
                </div>
                {!(ch.children && ch.children.length) && (
                  <textarea
                    className="ry-textarea"
                    placeholder="章节正文（可选）"
                    value={ch.content || ''}
                    onChange={(e) => updateChapter(ci, { content: e.target.value })}
                  />
                )}
                <div className="ry-child-list">
                  {(ch.children || []).map((child, childIdx) => (
                    <div key={child.id} style={{ marginBottom: 8 }}>
                      <div className="ry-chapter-row">
                        <input
                          className="ry-input"
                          placeholder="小节标题"
                          value={child.title}
                          onChange={(e) => updateChild(ci, childIdx, { title: e.target.value })}
                        />
                        <button
                          type="button"
                          className="ry-btn"
                          onClick={() => {
                            const children = (ch.children || []).filter((_, i) => i !== childIdx)
                            updateChapter(ci, { children })
                          }}
                        >
                          删
                        </button>
                      </div>
                      <textarea
                        className="ry-textarea"
                        placeholder="小节正文"
                        value={child.content || ''}
                        onChange={(e) => updateChild(ci, childIdx, { content: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button
              type="button"
              className="ry-btn"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  chapters: [...prev.chapters, emptyChapter()],
                }))
              }
            >
              + 添加章节
            </button>
          </div>
        </div>
        <div className="ry-dialog-footer">
          <button type="button" className="ry-btn" onClick={onClose}>取 消</button>
          <button
            type="button"
            className="ry-btn ry-btn-primary"
            onClick={() => {
              if (!form.title.trim()) {
                alert('请填写书名')
                return
              }
              onSave({
                ...form,
                title: form.title.trim(),
                author: (form.author || '').trim(),
                chapters: form.chapters
                  .filter((c) => c.title.trim())
                  .map((c) => ({
                    ...c,
                    title: c.title.trim(),
                    content: c.content?.trim() || '',
                    children: (c.children || [])
                      .filter((x) => x.title.trim())
                      .map((x) => ({ ...x, title: x.title.trim(), content: x.content?.trim() || '' })),
                  })),
              })
            }}
          >
            保存并同步到 App
          </button>
        </div>
      </div>
    </div>
  )
}

function Dashboard({ data }: { data: AppData }) {
  const free = data.books.filter((b) => b.access === '免费').length
  const vip = data.books.filter((b) => b.access === '需权限').length
  const rec = data.books.filter((b) => b.access === '推荐').length

  return (
    <>
      <div className="ry-stats">
        <div className="ry-stat-card">
          <div className="label">书籍总数</div>
          <div className="value primary">{data.books.length}</div>
        </div>
        <div className="ry-stat-card">
          <div className="label">学科分类</div>
          <div className="value success">{data.categories.length}</div>
        </div>
        <div className="ry-stat-card">
          <div className="label">推荐内容</div>
          <div className="value warning">{rec}</div>
        </div>
        <div className="ry-stat-card">
          <div className="label">免费 / 需权限</div>
          <div className="value danger">{free} / {vip}</div>
        </div>
      </div>
      <div className="ry-card">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>使用说明</div>
        <p style={{ fontSize: 13, color: '#606266', lineHeight: 1.8 }}>
          本后台为电脑端管理界面。保存书籍后，同浏览器打开的 App 会自动同步，无需手动刷新。
          支持上传封面，并导入 JSON / Markdown / TXT 书籍内容。
          数据保存在本机浏览器，跨设备请使用「数据管理」导出/导入 JSON。
        </p>
      </div>
    </>
  )
}

function BooksPage({ data }: { data: AppData }) {
  const [kw, setKw] = useState('')
  const [cat, setCat] = useState('全部')
  const [editing, setEditing] = useState<Book | null>(null)

  const list = useMemo(() => {
    const q = kw.trim().toLowerCase()
    return data.books.filter((b) => {
      const matchCat = cat === '全部' || b.category === cat
      const matchKw =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.series.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q)
      return matchCat && matchKw
    })
  }, [data.books, kw, cat])

  return (
    <div className="ry-card">
      <div className="ry-toolbar">
        <input
          className="ry-input"
          style={{ width: 220 }}
          placeholder="搜索书名 / 丛书 / 简介"
          value={kw}
          onChange={(e) => setKw(e.target.value)}
        />
        <select className="ry-select" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="全部">全部分类</option>
          {data.categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="ry-toolbar-right">
          <button
            type="button"
            className="ry-btn ry-btn-primary"
            onClick={() => setEditing(emptyBook(cat === '全部' ? undefined : cat))}
          >
            新增书籍
          </button>
        </div>
      </div>

      <div className="ry-table-wrap">
        <table className="ry-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>序号</th>
              <th style={{ width: 70 }}>封面</th>
              <th>书名</th>
              <th>作者</th>
              <th style={{ width: 90 }}>分类</th>
              <th style={{ width: 90 }}>权限</th>
              <th style={{ width: 80 }}>章节数</th>
              <th style={{ width: 140 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={8} className="ry-empty">暂无数据</td>
              </tr>
            ) : (
              list.map((book, i) => (
                <tr key={book.id}>
                  <td>{i + 1}</td>
                  <td>
                    <div className="ry-table-cover">
                      {book.cover ? <img src={book.cover} alt="" /> : <span>无</span>}
                    </div>
                  </td>
                  <td>
                    <div>{book.title}</div>
                    <div className="ry-sub">{book.series || '-'}</div>
                  </td>
                  <td>{book.author || '-'}</td>
                  <td>{book.category}</td>
                  <td><AccessTag access={book.access} /></td>
                  <td>{book.chapters.length}</td>
                  <td>
                    <button type="button" className="ry-btn-text" onClick={() => setEditing(structuredClone(book))}>
                      修改
                    </button>
                    <button
                      type="button"
                      className="ry-btn-text danger"
                      onClick={() => {
                        if (confirm(`确认删除《${book.title}》？`)) deleteBook(book.id)
                      }}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <BookDialog
          initial={editing}
          categories={data.categories}
          onClose={() => setEditing(null)}
          onSave={(book) => {
            upsertBook(book)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function CategoriesPage({ data }: { data: AppData }) {
  const [name, setName] = useState('')
  const [rename, setRename] = useState<{ old: string; value: string } | null>(null)

  return (
    <div className="ry-card">
      <div className="ry-toolbar">
        <input
          className="ry-input"
          style={{ width: 200 }}
          placeholder="新分类名称"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              try {
                addCategory(name)
                setName('')
              } catch (err) {
                alert(err instanceof Error ? err.message : '添加失败')
              }
            }
          }}
        />
        <button
          type="button"
          className="ry-btn ry-btn-primary"
          onClick={() => {
            try {
              addCategory(name)
              setName('')
            } catch (err) {
              alert(err instanceof Error ? err.message : '添加失败')
            }
          }}
        >
          新增分类
        </button>
      </div>

      <div className="ry-table-wrap">
        <table className="ry-table">
          <thead>
            <tr>
              <th style={{ width: 80 }}>序号</th>
              <th>分类名称</th>
              <th style={{ width: 120 }}>书籍数量</th>
              <th style={{ width: 160 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {data.categories.map((c, i) => {
              const count = data.books.filter((b) => b.category === c).length
              return (
                <tr key={c}>
                  <td>{i + 1}</td>
                  <td>{c}</td>
                  <td>{count}</td>
                  <td>
                    <button
                      type="button"
                      className="ry-btn-text"
                      onClick={() => setRename({ old: c, value: c })}
                    >
                      重命名
                    </button>
                    <button
                      type="button"
                      className="ry-btn-text danger"
                      onClick={() => {
                        try {
                          if (confirm(`确认删除分类「${c}」？`)) deleteCategory(c)
                        } catch (err) {
                          alert(err instanceof Error ? err.message : '删除失败')
                        }
                      }}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {rename && (
        <div className="ry-mask" onClick={() => setRename(null)}>
          <div className="ry-dialog ry-dialog-sm" onClick={(e) => e.stopPropagation()}>
            <div className="ry-dialog-header">
              <span>重命名分类</span>
              <button type="button" className="ry-dialog-close" onClick={() => setRename(null)}>×</button>
            </div>
            <div className="ry-dialog-body">
              <div className="ry-form-item">
                <label>分类名称</label>
                <input
                  className="ry-input"
                  value={rename.value}
                  onChange={(e) => setRename({ ...rename, value: e.target.value })}
                />
              </div>
            </div>
            <div className="ry-dialog-footer">
              <button type="button" className="ry-btn" onClick={() => setRename(null)}>取 消</button>
              <button
                type="button"
                className="ry-btn ry-btn-primary"
                onClick={() => {
                  try {
                    renameCategory(rename.old, rename.value)
                    setRename(null)
                  } catch (err) {
                    alert(err instanceof Error ? err.message : '重命名失败')
                  }
                }}
              >
                确 定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DataPage() {
  const [text, setText] = useState(() => exportDataJson())

  return (
    <div className="ry-card">
      <div className="ry-toolbar">
        <button type="button" className="ry-btn" onClick={() => setText(exportDataJson())}>
          刷新预览
        </button>
        <button
          type="button"
          className="ry-btn ry-btn-success"
          onClick={() => {
            const blob = new Blob([exportDataJson()], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `book-catalog-${new Date().toISOString().slice(0, 10)}.json`
            a.click()
            URL.revokeObjectURL(url)
          }}
        >
          导出 JSON
        </button>
        <label className="ry-btn" style={{ cursor: 'pointer' }}>
          导入 JSON
          <input
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                const json = await file.text()
                importDataJson(json)
                setText(exportDataJson())
                alert('导入成功')
              } catch (err) {
                alert(err instanceof Error ? err.message : '导入失败')
              }
              e.target.value = ''
            }}
          />
        </label>
        <button
          type="button"
          className="ry-btn ry-btn-warning"
          onClick={() => {
            try {
              importDataJson(text)
              alert('已从编辑区写入数据')
            } catch (err) {
              alert(err instanceof Error ? err.message : '写入失败')
            }
          }}
        >
          保存编辑区
        </button>
        <button
          type="button"
          className="ry-btn ry-btn-danger"
          onClick={() => {
            if (confirm('确认恢复默认示例数据？当前本地数据将被覆盖。')) {
              resetData()
              setText(exportDataJson())
            }
          }}
        >
          恢复默认数据
        </button>
      </div>
      <textarea
        className="ry-textarea"
        style={{ minHeight: 420, fontFamily: 'Consolas, Monaco, monospace', fontSize: 12 }}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="ry-hint">数据保存在本机浏览器，换电脑或清缓存需重新导入备份。</div>
    </div>
  )
}

const MENUS: { key: MenuKey; label: string }[] = [
  { key: 'dashboard', label: '首页' },
  { key: 'books', label: '书籍管理' },
  { key: 'categories', label: '分类管理' },
  { key: 'data', label: '数据管理' },
]

const TITLES: Record<MenuKey, string> = {
  dashboard: '首页',
  books: '书籍管理',
  categories: '分类管理',
  data: '数据管理',
}

export default function AdminApp() {
  const [authed, setAuthed] = useState(() => isAdminAuthed())
  const [menu, setMenu] = useState<MenuKey>('dashboard')
  const data = useAppData()

  if (!authed) {
    return <LoginView onSuccess={() => setAuthed(true)} />
  }

  return (
    <div className="ry-root">
      <div className="ry-layout">
        <aside className="ry-sidebar">
          <div className="ry-logo">
            <span className="ry-logo-mark">书</span>
            学科书库
          </div>
          <nav className="ry-menu">
            {MENUS.map((m) => (
              <button
                key={m.key}
                type="button"
                className={`ry-menu-item${menu === m.key ? ' active' : ''}`}
                onClick={() => setMenu(m.key)}
              >
                {m.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="ry-main">
          <header className="ry-header">
            <div className="ry-breadcrumb">
              后台管理 / <strong>{TITLES[menu]}</strong>
            </div>
            <div className="ry-header-right">
              <a className="ry-link" href="#/">返回前台</a>
              <span>管理员</span>
              <button
                type="button"
                className="ry-link"
                onClick={() => {
                  adminLogout()
                  setAuthed(false)
                }}
              >
                退出登录
              </button>
            </div>
          </header>

          <main className="ry-content">
            {menu === 'dashboard' && <Dashboard data={data} />}
            {menu === 'books' && <BooksPage data={data} />}
            {menu === 'categories' && <CategoriesPage data={data} />}
            {menu === 'data' && <DataPage />}
          </main>
        </div>
      </div>
    </div>
  )
}
