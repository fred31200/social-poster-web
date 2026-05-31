'use client'
import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, CalendarIcon, List, Calendar as CalGlyph } from 'lucide-react'
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format, isToday,
  addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth, isPast,
  isAfter, isBefore, parseISO
} from 'date-fns'
import { fr } from 'date-fns/locale'
import PostDetailModal from '../components/PostDetailModal'

const PLATFORM_DOT = {
  facebook:  'bg-blue-500',
  instagram: 'bg-gradient-to-br from-purple-400 to-pink-400',
  linkedin:  'bg-blue-600',
  threads:   'bg-warm-800',
  tiktok:    'bg-warm-700',
}

const STATUS_BORDER = {
  scheduled:  'border-sage-300 bg-sage-100/50',
  publishing: 'border-gold-400 bg-gold-300/30',
  published:  'border-sage-300 bg-sage-100/70',
  partial:    'border-gold-400 bg-gold-300/30',
  failed:     'border-[#E5C8BD] bg-[#FBEEEA]',
  cancelled:  'border-warm-200 bg-warm-50 opacity-60',
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export default function Calendar({ addToast }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedPost, setSelectedPost] = useState(null)
  const [view, setView] = useState('month') // 'month' | 'list'

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await window.api.listPosts()
      setPosts(data || [])
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel(id) {
    await window.api.cancelPost(id)
    addToast('Post annulé', 'success')
    load()
  }

  // Group posts by day (YYYY-MM-DD)
  const postsByDay = useMemo(() => {
    const map = {}
    for (const post of posts) {
      const ts = post.scheduled_at || post.created_at
      if (!ts) continue
      const dateKey = format(new Date(ts * 1000), 'yyyy-MM-dd')
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(post)
    }
    // Sort each day by time
    for (const key in map) {
      map[key].sort((a, b) => (a.scheduled_at || a.created_at) - (b.scheduled_at || b.created_at))
    }
    return map
  }, [posts])

  // Build calendar grid (Mon→Sun, 5-6 weeks)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  // Upcoming posts (next 30 days) for list view
  const upcomingDays = useMemo(() => {
    const now = new Date()
    const sorted = Object.keys(postsByDay)
      .filter(key => {
        const d = parseISO(key + 'T00:00:00')
        return !isBefore(d, new Date(now.getFullYear(), now.getMonth(), now.getDate()))
      })
      .sort()
    return sorted.map(key => ({ date: parseISO(key + 'T00:00:00'), posts: postsByDay[key] }))
  }, [postsByDay])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw size={20} className="animate-spin text-warm-500" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 md:pt-10 pb-24 md:pb-10">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-warm-700 mb-1">Calendrier</h2>
            <p className="text-sm text-warm-500">
              {posts.length} post{posts.length !== 1 ? 's' : ''} · planifiés et publiés
            </p>
          </div>
          <div className="flex items-center gap-1">
            {/* View toggle */}
            <div className="flex items-center bg-warm-100 rounded-lg p-0.5">
              <button
                onClick={() => setView('month')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  view === 'month' ? 'bg-cream text-sage-700 shadow-sm' : 'text-warm-500'
                }`}
                aria-label="Vue mois"
              >
                <CalGlyph size={13} /> <span className="hidden md:inline">Mois</span>
              </button>
              <button
                onClick={() => setView('list')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  view === 'list' ? 'bg-cream text-sage-700 shadow-sm' : 'text-warm-500'
                }`}
                aria-label="Vue liste"
              >
                <List size={13} /> <span className="hidden md:inline">Liste</span>
              </button>
            </div>
            <button onClick={load} className="text-warm-500 hover:text-warm-700 p-2 rounded-lg hover:bg-warm-100 transition-colors" title="Rafraîchir">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* ─── MONTH VIEW ─── */}
        {view === 'month' && (
          <>
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-warm-600 hover:bg-warm-100 transition-colors"
                aria-label="Mois précédent"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-warm-700 capitalize text-base">
                  {format(currentMonth, 'MMMM yyyy', { locale: fr })}
                </h3>
                {!isToday(currentMonth) && (
                  <button
                    onClick={() => setCurrentMonth(new Date())}
                    className="text-[11px] text-sage-600 hover:text-sage-700 px-2 py-0.5 rounded border border-sage-300 hover:bg-sage-100 transition-colors"
                  >
                    Aujourd'hui
                  </button>
                )}
              </div>
              <button
                onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-warm-600 hover:bg-warm-100 transition-colors"
                aria-label="Mois suivant"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Day-of-week labels */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAY_LABELS.map(d => (
                <div key={d} className="text-[10px] text-warm-400 uppercase tracking-wider font-semibold text-center py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd')
                const dayPosts = postsByDay[dateKey] || []
                const inMonth = isSameMonth(day, currentMonth)
                const today = isToday(day)
                return (
                  <div
                    key={dateKey}
                    className={`min-h-[70px] md:min-h-[100px] border rounded-lg p-1 md:p-1.5 transition-colors ${
                      today
                        ? 'border-sage-500 bg-sage-100/40 ring-1 ring-sage-300'
                        : inMonth
                          ? 'border-warm-200 bg-cream hover:border-warm-300'
                          : 'border-warm-100 bg-warm-50/50'
                    }`}
                  >
                    <div className={`text-[10px] md:text-xs mb-1 font-medium text-right pr-0.5 ${
                      today ? 'text-sage-700 font-bold' : inMonth ? 'text-warm-600' : 'text-warm-300'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {dayPosts.slice(0, 3).map(post => (
                        <button
                          key={post.id}
                          onClick={() => setSelectedPost(post)}
                          className={`w-full text-left rounded px-1 py-0.5 border ${STATUS_BORDER[post.status] || STATUS_BORDER.scheduled} hover:opacity-80 transition-opacity`}
                          title={post.content?.slice(0, 80) || 'Post sans texte'}
                        >
                          {/* Mobile: just dots. Desktop: dots + text snippet */}
                          <div className="flex items-center gap-0.5 mb-0.5">
                            {post.platforms.slice(0, 4).map(p => (
                              <div key={p} className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${PLATFORM_DOT[p] || 'bg-warm-400'}`}></div>
                            ))}
                            {post.scheduled_at && (
                              <span className="text-[8px] md:text-[9px] text-warm-500 ml-auto">
                                {format(new Date(post.scheduled_at * 1000), 'HH:mm')}
                              </span>
                            )}
                          </div>
                          <div className="hidden md:block text-[10px] text-warm-600 truncate">
                            {(post.content || '').slice(0, 30) || '—'}
                          </div>
                        </button>
                      ))}
                      {dayPosts.length > 3 && (
                        <button
                          onClick={() => setSelectedPost(dayPosts[3])}
                          className="text-[9px] text-warm-500 hover:text-warm-700 px-1"
                        >
                          +{dayPosts.length - 3}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-warm-500">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div> Facebook
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-gradient-to-br from-purple-400 to-pink-400"></div> Instagram
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-600"></div> LinkedIn
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-warm-800"></div> Threads
              </div>
            </div>
          </>
        )}

        {/* ─── LIST VIEW ─── */}
        {view === 'list' && (
          <div className="space-y-4">
            {upcomingDays.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <CalendarIcon size={40} className="text-warm-300 mb-4" />
                <p className="text-warm-500 text-sm">Aucun post à venir</p>
                <p className="text-warm-400 text-xs mt-1">Compose un post pour démarrer</p>
              </div>
            ) : (
              upcomingDays.map(({ date, posts }) => (
                <div key={date.toISOString()}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`text-xs uppercase tracking-wider font-semibold ${isToday(date) ? 'text-sage-700' : 'text-warm-500'}`}>
                      {isToday(date)
                        ? "Aujourd'hui · " + format(date, 'EEEE d MMM', { locale: fr })
                        : format(date, 'EEEE d MMMM', { locale: fr })
                      }
                    </div>
                    {isToday(date) && (
                      <div className="w-1.5 h-1.5 rounded-full bg-sage-500"></div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {posts.map(post => (
                      <button
                        key={post.id}
                        onClick={() => setSelectedPost(post)}
                        className={`w-full text-left p-3 rounded-xl border transition-all hover:shadow-sm ${
                          STATUS_BORDER[post.status] || STATUS_BORDER.scheduled
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="text-sm text-warm-700 line-clamp-2 flex-1">
                            {post.content || <span className="italic text-warm-400">Pas de texte</span>}
                          </p>
                          {post.scheduled_at && (
                            <span className="text-xs text-warm-500 font-medium flex-shrink-0">
                              {format(new Date(post.scheduled_at * 1000), 'HH:mm')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {post.platforms.map(p => (
                            <div key={p} className={`w-3 h-3 rounded-full ${PLATFORM_DOT[p] || 'bg-warm-400'}`}></div>
                          ))}
                          {post.media_paths?.length > 0 && (
                            <span className="text-[11px] text-warm-500 ml-auto">
                              📎 {post.media_paths.length}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Detail modal */}
      <PostDetailModal
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        onCancel={handleCancel}
      />
    </div>
  )
}
