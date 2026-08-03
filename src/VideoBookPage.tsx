import { useEffect, useMemo, useRef, useState } from 'react'
import type { Book } from './types'
import { flattenChapters, formatDuration } from './utils/contentParser'
import { getVideoProgress, setVideoProgress } from './utils/videoProgress'

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

function PlayCircleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="10" />
      <path d="M10 8.5v7l6-3.5-6-3.5z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default function VideoBookPage({
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

  const videoRef = useRef<HTMLVideoElement>(null)
  const [tab, setTab] = useState<'detail' | 'catalog'>('catalog')
  const [keyword, setKeyword] = useState('')
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(current?.duration || 0)
  const [rate, setRate] = useState(1)
  const [progressMap, setProgressMap] = useState<Record<string, number>>({})

  useEffect(() => {
    const map: Record<string, number> = {}
    flat.forEach((c) => {
      map[c.id] = getVideoProgress(book.id, c.id)
    })
    setProgressMap(map)
  }, [book.id, flat])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.load()
    setCurrentTime(0)
    setPlaying(false)
    setDuration(current?.duration || 0)
  }, [current?.id, current?.videoUrl])

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return flat
    return flat.filter((c) => c.title.toLowerCase().includes(q) || c.path.toLowerCase().includes(q))
  }, [flat, keyword])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video || !current?.videoUrl) return
    if (video.paused) {
      void video.play()
      setPlaying(true)
    } else {
      video.pause()
      setPlaying(false)
    }
  }

  const onSeek = (ratio: number) => {
    const video = videoRef.current
    if (!video || !video.duration) return
    video.currentTime = ratio * video.duration
  }

  const cycleRate = () => {
    const next = rate >= 2 ? 0.75 : rate >= 1.5 ? 2 : rate >= 1.25 ? 1.5 : rate >= 1 ? 1.25 : 1
    setRate(next)
    if (videoRef.current) videoRef.current.playbackRate = next
  }

  const enterFullscreen = () => {
    const video = videoRef.current
    if (!video) return
    if (video.requestFullscreen) void video.requestFullscreen()
    else if ('webkitEnterFullscreen' in video) {
      ;(video as HTMLVideoElement & { webkitEnterFullscreen: () => void }).webkitEnterFullscreen()
    }
  }

  return (
    <div className="video-page">
      <div className="video-player-wrap">
        <button type="button" className="video-back" onClick={onBack} aria-label="返回">
          <BackIcon />
        </button>
        {current?.videoUrl ? (
          <video
            ref={videoRef}
            className="video-el"
            src={current.videoUrl}
            playsInline
            onClick={togglePlay}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration
              if (d && Number.isFinite(d)) setDuration(d)
            }}
            onTimeUpdate={(e) => {
              const v = e.currentTarget
              setCurrentTime(v.currentTime)
              if (current && v.duration) {
                const pct = (v.currentTime / v.duration) * 100
                if (pct - (progressMap[current.id] || 0) >= 2 || pct >= 99) {
                  setVideoProgress(book.id, current.id, pct >= 97 ? 100 : pct)
                  setProgressMap((prev) => ({ ...prev, [current.id]: pct >= 97 ? 100 : Math.round(pct) }))
                }
              }
            }}
            onEnded={() => {
              if (!current) return
              setVideoProgress(book.id, current.id, 100)
              setProgressMap((prev) => ({ ...prev, [current.id]: 100 }))
              if (index < flat.length - 1) onChangeChapter(flat[index + 1].id)
            }}
          />
        ) : (
          <div className="video-empty">请选择课时或在后台填写视频地址</div>
        )}

        <div className="video-controls">
          <button type="button" className="vc-btn" onClick={togglePlay}>
            {playing ? '❚❚' : '▶'}
          </button>
          <span className="vc-time">{formatDuration(currentTime).replace(/^00:/, '00:')}</span>
          <input
            className="vc-seek"
            type="range"
            min={0}
            max={1000}
            value={duration ? Math.round((currentTime / duration) * 1000) : 0}
            onChange={(e) => onSeek(Number(e.target.value) / 1000)}
          />
          <span className="vc-time">{formatDuration(duration)}</span>
          <button type="button" className="vc-rate" onClick={cycleRate}>{rate}X</button>
          <button type="button" className="vc-btn" onClick={enterFullscreen} aria-label="全屏">⛶</button>
        </div>
      </div>

      <div className="video-main">
        <h1 className="video-title">{book.title}</h1>
        <div className="video-tabs">
          <button type="button" className={tab === 'detail' ? 'active' : ''} onClick={() => setTab('detail')}>
            详情
          </button>
          <button type="button" className={tab === 'catalog' ? 'active' : ''} onClick={() => setTab('catalog')}>
            目录
          </button>
        </div>

        {tab === 'detail' ? (
          <div className="video-detail">
            <p><strong>分类：</strong>{book.category}</p>
            <p><strong>作者：</strong>{book.author || '佚名'}</p>
            <p><strong>丛书：</strong>{book.series || '-'}</p>
            <p className="video-desc">{book.description || '暂无简介'}</p>
            <p className="video-meta">共 {flat.length} 个课时</p>
          </div>
        ) : (
          <>
            <div className="video-search">
              <SearchIcon />
              <input
                type="search"
                placeholder="请输入目录标题进行搜索"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            <ul className="video-list">
              {filtered.length === 0 ? (
                <li className="empty-state">暂无课时</li>
              ) : (
                filtered.map((item) => {
                  const active = item.id === current?.id
                  const learned = progressMap[item.id] || 0
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`video-lesson${active ? ' active' : ''}`}
                        onClick={() => onChangeChapter(item.id)}
                      >
                        <div className="video-lesson-body">
                          <div className="video-lesson-title">{item.title}</div>
                          <div className="video-lesson-meta">
                            <ClockIcon />
                            <span>{formatDuration(item.duration)}</span>
                            <span>已学{learned}%</span>
                          </div>
                        </div>
                        <span className="video-lesson-play"><PlayCircleIcon /></span>
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
          </>
        )}
      </div>

      {current?.videoUrl && (
        <button type="button" className="video-fab" onClick={togglePlay} aria-label="播放">
          {playing ? '❚❚' : '▶'}
        </button>
      )}
    </div>
  )
}
