'use client'
import { useState, useRef, useEffect } from 'react'
import { Image, Video, X, Send, CalendarClock, Loader2, AlertCircle, Square, RectangleVertical, RectangleHorizontal, Maximize, Sparkles } from 'lucide-react'
import { format, addMinutes } from 'date-fns'
import { fr } from 'date-fns/locale'
import AIModal from '@/components/AIModal'

const IG_FORMATS = [
  { id: 'square', label: '1:1', desc: 'Carré (recadré)', icon: Square, w: 1080, h: 1080 },
  { id: 'portrait', label: '4:5', desc: 'Portrait (recadré)', icon: RectangleVertical, w: 1080, h: 1350 },
  { id: 'landscape', label: '1.91:1', desc: 'Paysage (recadré)', icon: RectangleHorizontal, w: 1080, h: 566 },
  { id: 'fit-square', label: '1:1 fit', desc: 'Carré (sans recadrer, fond blanc)', icon: Maximize, w: 1080, h: 1080 },
]

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', emoji: '📸', requiresMedia: true, note: 'Image/vidéo requis' },
  { id: 'facebook', label: 'Facebook', emoji: '📘', requiresMedia: false },
  { id: 'linkedin', label: 'LinkedIn', emoji: '💼', requiresMedia: false },
  { id: 'tiktok', label: 'TikTok', emoji: '🎵', requiresMedia: true, note: 'Vidéo/image requis' },
  { id: 'threads', label: 'Threads', emoji: '🧵', requiresMedia: false, note: 'Texte seulement (max 500)' },
]

const MAX_CHARS = { instagram: 2200, facebook: 63206, linkedin: 3000, tiktok: 150, threads: 500 }

export default function Composer({ accounts, addToast }) {
  const [content, setContent] = useState('')
  const [mediaFiles, setMediaFiles] = useState([])
  const [mediaMeta, setMediaMeta] = useState({}) // { filePath: { width, height, ratio } }
  const [igFormats, setIgFormats] = useState({}) // { filePath: 'square'|'portrait'|'landscape'|'fit-square' }
  const [selectedPlatforms, setSelectedPlatforms] = useState([])
  const [scheduleMode, setScheduleMode] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [results, setResults] = useState(null)
  const [aiOpen, setAiOpen] = useState(false)

  const connectedPlatforms = [...new Set(accounts.map(a => a.platform))]

  const minDateTime = format(addMinutes(new Date(), 5), "yyyy-MM-dd'T'HH:mm")

  function togglePlatform(pid) {
    setSelectedPlatforms(prev =>
      prev.includes(pid) ? prev.filter(p => p !== pid) : [...prev, pid]
    )
    setResults(null)
  }

  // Helper: build an entry from a File object (used by picker AND by AI-generated images)
  async function addFileAsEntry(file) {
    if (mediaFiles.length >= 10) return null
    const id = (crypto.randomUUID?.() || Date.now() + '-' + Math.random())
    const isVideoFile = /^video\//.test(file.type) || /\.(mp4|mov|avi|webm)$/i.test(file.name)
    const entry = {
      id,
      file,
      name: file.name,
      isVideo: isVideoFile,
      previewUrl: !isVideoFile ? URL.createObjectURL(file) : null,
    }
    setMediaFiles(prev => [...prev, entry].slice(0, 10))

    if (!isVideoFile) {
      const m = await window.api.imageMetadata(file)
      if (m.success) {
        setMediaMeta(prev => ({ ...prev, [id]: { width: m.width, height: m.height, ratio: m.ratio } }))
        let suggested = 'square'
        if (m.ratio < 0.85)            suggested = 'portrait'
        else if (m.ratio > 1.5)        suggested = 'landscape'
        else if (m.ratio >= 0.95 && m.ratio <= 1.05) suggested = 'square'
        else                           suggested = 'fit-square'
        setIgFormats(prev => ({ ...prev, [id]: suggested }))
      }
    }
    return entry
  }

  // mediaFiles now holds entries: { id, file, name, isVideo, previewUrl }
  async function handlePickMedia() {
    if (!window.api) return
    const files = await window.api.pickFiles()
    if (files.length === 0) return
    const toAdd = files.slice(0, 10 - mediaFiles.length)

    const newEntries = toAdd.map(file => {
      const id = (crypto.randomUUID?.() || Date.now() + '-' + Math.random())
      const isVideoFile = /^video\//.test(file.type) || /\.(mp4|mov|avi|webm)$/i.test(file.name)
      return {
        id,
        file,
        name: file.name,
        isVideo: isVideoFile,
        previewUrl: !isVideoFile ? URL.createObjectURL(file) : null,
      }
    })
    setMediaFiles(prev => [...prev, ...newEntries].slice(0, 10))

    // Pre-load metadata + auto-pick best Instagram format
    for (const entry of newEntries) {
      if (entry.isVideo) continue
      const m = await window.api.imageMetadata(entry.file)
      if (m.success) {
        setMediaMeta(prev => ({ ...prev, [entry.id]: { width: m.width, height: m.height, ratio: m.ratio } }))
        let suggested = 'square'
        if (m.ratio < 0.85)            suggested = 'portrait'    // tall
        else if (m.ratio > 1.5)        suggested = 'landscape'   // wide
        else if (m.ratio >= 0.95 && m.ratio <= 1.05) suggested = 'square'
        else                           suggested = 'fit-square'
        setIgFormats(prev => ({ ...prev, [entry.id]: suggested }))
      }
    }
  }

  function removeMedia(idx) {
    const entry = mediaFiles[idx]
    if (entry?.previewUrl) URL.revokeObjectURL(entry.previewUrl)
    setMediaFiles(prev => prev.filter((_, i) => i !== idx))
    setMediaMeta(prev => { const { [entry.id]: _, ...rest } = prev; return rest })
    setIgFormats(prev => { const { [entry.id]: _, ...rest } = prev; return rest })
  }

  function getFileName(entry) {
    return entry?.name || ''
  }

  function isVideo(entry) {
    return !!entry?.isVideo
  }

  function validate() {
    if (!content.trim() && mediaFiles.length === 0) return 'Écris quelque chose ou ajoute un média.'
    if (selectedPlatforms.length === 0) return 'Sélectionne au moins une plateforme.'

    for (const pid of selectedPlatforms) {
      const platform = PLATFORMS.find(p => p.id === pid)
      if (platform?.requiresMedia && mediaFiles.length === 0) {
        return `${platform.label} nécessite une image ou vidéo.`
      }
    }

    if (scheduleMode && !scheduledAt) return 'Choisis une date/heure de publication.'

    // Check accounts are connected
    for (const pid of selectedPlatforms) {
      if (!connectedPlatforms.includes(pid)) {
        const platform = PLATFORMS.find(p => p.id === pid)
        return `Connecte ton compte ${platform?.label} d'abord.`
      }
    }

    return null
  }

  async function handlePublish() {
    const error = validate()
    if (error) { addToast(error, 'error'); return }

    setPublishing(true)
    setResults(null)

    try {
      const scheduledAtTs = scheduleMode && scheduledAt
        ? Math.floor(new Date(scheduledAt).getTime() / 1000)
        : null

      // Upload all files to the server first. If Instagram is selected, also generate
      // the transformed JPEG in the same request (igMode).
      const wantsIg = selectedPlatforms.includes('instagram')
      const mediaPaths = []
      const mediaPathsInstagram = []
      for (const entry of mediaFiles) {
        const mode = wantsIg && !entry.isVideo ? (igFormats[entry.id] || 'square') : null
        const r = await window.api.uploadFile(entry.file, mode)
        if (r.error) {
          addToast(`Erreur upload ${entry.name}: ${r.error}`, 'error')
          throw new Error(r.error)
        }
        mediaPaths.push(r.path)
        mediaPathsInstagram.push(r.igPath || r.path)
      }

      const res = await window.api.createPost({
        content,
        mediaPaths,
        mediaPathsInstagram: wantsIg ? mediaPathsInstagram : null,
        platforms: selectedPlatforms,
        scheduledAt: scheduledAtTs,
      })

      if (res.error) {
        addToast(res.error, 'error')
        return
      }

      if (res.immediate) {
        setResults(res.results)
        const ok = res.results.filter(r => r.status === 'published').length
        const fail = res.results.filter(r => r.status === 'failed').length
        if (ok > 0 && fail === 0) {
          addToast(`Publié sur ${ok} plateforme${ok > 1 ? 's' : ''} !`, 'success')
          resetForm()
        } else if (fail > 0 && ok === 0) {
          addToast('Échec de toutes les publications', 'error')
        } else {
          addToast(`${ok} succès, ${fail} échec(s)`, 'warning')
        }
      } else {
        const dt = new Date(scheduledAt)
        addToast(`Planifié pour le ${format(dt, 'dd/MM à HH:mm', { locale: fr })}`, 'success')
        resetForm()
      }
    } finally {
      setPublishing(false)
    }
  }

  function resetForm() {
    setContent('')
    setMediaFiles([])
    setSelectedPlatforms([])
    setScheduleMode(false)
    setScheduledAt('')
  }

  const activeLimit = selectedPlatforms.length > 0
    ? Math.min(...selectedPlatforms.map(p => MAX_CHARS[p] || 9999))
    : null

  return (
    <div className="p-4 md:p-6 md:pt-10 pb-24 md:pb-10">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-lg md:text-xl font-bold text-warm-700 mb-0.5 md:mb-1 hidden md:block">Nouveau post</h2>
        <p className="text-sm text-warm-500 mb-4 md:mb-6 hidden md:block">Publie sur toutes tes plateformes en un clic</p>

        {/* Platform selector */}
        <div className="mb-4 md:mb-5">
          <p className="text-[10px] md:text-xs text-warm-500 uppercase tracking-wider font-semibold mb-2 md:mb-3">Plateformes</p>
          <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
            {PLATFORMS.map(({ id, label, emoji, requiresMedia, note }) => {
              const isConnected = connectedPlatforms.includes(id)
              const isSelected = selectedPlatforms.includes(id)
              return (
                <button
                  key={id}
                  onClick={() => isConnected && togglePlatform(id)}
                  disabled={!isConnected}
                  title={!isConnected ? `Connecte ton compte ${label} dans Comptes` : note}
                  className={`flex items-center justify-center md:justify-start gap-2 px-3 md:px-3.5 py-2.5 md:py-2 rounded-xl text-sm font-medium transition-all border ${
                    !isConnected
                      ? 'opacity-40 cursor-not-allowed border-warm-100 text-warm-500'
                      : isSelected
                        ? 'border-sage-500 bg-sage-100 text-sage-700 shadow-sm shadow-sage-500/20'
                        : 'border-warm-200 bg-cream text-warm-600 hover:border-warm-300 hover:bg-warm-50 active:bg-warm-100'
                  }`}
                >
                  <span className="text-base">{emoji}</span>
                  <span>{label}</span>
                  {requiresMedia && <span className="text-xs opacity-50">*</span>}
                </button>
              )
            })}
          </div>
          {selectedPlatforms.some(p => PLATFORMS.find(pl => pl.id === p)?.requiresMedia) && mediaFiles.length === 0 && (
            <p className="mt-2 text-xs text-gold-600 flex items-center gap-1.5">
              <AlertCircle size={12} /> * Certaines plateformes sélectionnées nécessitent un média
            </p>
          )}
        </div>

        {/* Text editor */}
        <div className="bg-cream border border-warm-200 rounded-2xl overflow-hidden mb-4 shadow-sm">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Qu'est-ce que tu veux partager ?"
            rows={8}
            maxLength={activeLimit || undefined}
            className="w-full bg-transparent px-4 md:px-5 py-3.5 md:py-4 text-[15px] md:text-sm text-warm-700 placeholder-warm-400 resize-none outline-none leading-relaxed"
          />
          <div className="flex items-center justify-between px-5 py-3 border-t border-warm-100">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAiOpen(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-sage-700 hover:text-sage-800 transition-colors"
              >
                <Sparkles size={14} /> Générer avec IA
              </button>
              <span className="text-warm-300">·</span>
              <button
                onClick={handlePickMedia}
                className="flex items-center gap-1.5 text-xs text-warm-500 hover:text-sage-600 transition-colors"
              >
                <Image size={15} /> Image
              </button>
              <span className="text-warm-300">·</span>
              <button
                onClick={handlePickMedia}
                className="flex items-center gap-1.5 text-xs text-warm-500 hover:text-sage-600 transition-colors"
              >
                <Video size={15} /> Vidéo
              </button>
            </div>
            {activeLimit && (
              <span className={`text-xs ${content.length > activeLimit * 0.9 ? 'text-gold-600' : 'text-warm-400'}`}>
                {content.length}/{activeLimit}
              </span>
            )}
          </div>
        </div>

        {/* AI Modal */}
        <AIModal
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          onInsert={(text) => setContent(text)}
          onAddImage={(file) => addFileAsEntry(file)}
          platform={selectedPlatforms.length === 1 ? selectedPlatforms[0] : null}
          currentText={content}
        />


        {/* Media preview */}
        {mediaFiles.length > 0 && (
          <div className="mb-4 space-y-3">
            <p className="text-xs text-warm-500 uppercase tracking-wider font-semibold">Médias ({mediaFiles.length})</p>
            {mediaFiles.map((entry, i) => {
              const video = entry.isVideo
              const meta = mediaMeta[entry.id]
              const showIgFormat = selectedPlatforms.includes('instagram') && !video
              return (
                <div key={entry.id} className="bg-warm-50 border border-warm-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-3 text-xs text-warm-600">
                    {entry.previewUrl
                      ? <img src={entry.previewUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-warm-200" />
                      : <div className="w-12 h-12 rounded-lg bg-warm-200 flex items-center justify-center text-lg">🎬</div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-warm-700">{entry.name}</p>
                      {meta && <p className="text-warm-400 text-[10px]">{meta.width}×{meta.height} · ratio {meta.ratio.toFixed(2)}</p>}
                    </div>
                    <button onClick={() => removeMedia(i)} className="text-warm-400 hover:text-[#B07060] transition-colors p-1.5">
                      <X size={16} />
                    </button>
                  </div>
                  {showIgFormat && (
                    <div className="pt-2 border-t border-warm-100">
                      <p className="text-[10px] text-warm-500 uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1">
                        📸 Format Instagram
                      </p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {IG_FORMATS.map(({ id, label, desc, icon: Icon }) => {
                          const active = igFormats[entry.id] === id
                          return (
                            <button
                              key={id}
                              onClick={() => setIgFormats(prev => ({ ...prev, [entry.id]: id }))}
                              title={desc}
                              className={`flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg text-[10px] font-medium transition-all border ${
                                active
                                  ? 'border-sage-500 bg-sage-100 text-sage-700'
                                  : 'border-warm-200 bg-cream text-warm-500 hover:border-warm-300'
                              }`}
                            >
                              <Icon size={14} />
                              <span>{label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Schedule toggle */}
        <div className="mb-5">
          <button
            onClick={() => setScheduleMode(!scheduleMode)}
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${
              scheduleMode ? 'text-sage-600' : 'text-warm-500 hover:text-warm-600'
            }`}
          >
            <CalendarClock size={16} />
            {scheduleMode ? 'Planification activée' : 'Planifier pour plus tard'}
          </button>

          {scheduleMode && (
            <div className="mt-3">
              <input
                type="datetime-local"
                value={scheduledAt}
                min={minDateTime}
                onChange={e => setScheduledAt(e.target.value)}
                className="bg-cream border border-warm-200 rounded-xl px-4 py-2.5 text-sm text-warm-700 outline-none focus:border-sage-500 transition-colors"
              />
            </div>
          )}
        </div>

        {/* Publish results */}
        {results && (
          <div className="mb-5 space-y-2">
            {results.map(r => (
              <div key={r.platform} className={`flex items-start gap-3 p-3 rounded-xl text-sm border ${
                r.status === 'published'
                  ? 'bg-sage-100 border-sage-300 text-sage-700'
                  : 'bg-[#FBEEEA] border-[#E5C8BD] text-[#B07060]'
              }`}>
                <span>{r.status === 'published' ? '✅' : '❌'}</span>
                <div>
                  <span className="capitalize font-medium">{r.platform}</span>
                  {r.error && <p className="text-xs opacity-75 mt-0.5">{r.error}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Publish button */}
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 md:py-3.5 rounded-xl font-semibold text-[15px] md:text-sm text-white bg-sage-600 hover:bg-sage-500 active:bg-sage-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-sage-500/30"
        >
          {publishing ? (
            <><Loader2 size={17} className="animate-spin" /> Publication en cours…</>
          ) : scheduleMode ? (
            <><CalendarClock size={17} /> Planifier</>
          ) : (
            <><Send size={17} /> Publier maintenant</>
          )}
        </button>
      </div>
    </div>
  )
}
