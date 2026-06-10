'use client'
import { useState } from 'react'
import { Smartphone, Send, CalendarClock, Loader2, X, Image as ImageIcon } from 'lucide-react'

export default function Stories({ accounts, addToast }) {
  const igConnected = (accounts || []).some(a => a.platform === 'instagram')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [publishing, setPublishing] = useState(false)
  const [scheduleMode, setScheduleMode] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')

  function pick(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function clearMedia(e) {
    e.preventDefault()
    e.stopPropagation()
    setFile(null)
    setPreview(null)
  }

  async function publish() {
    if (!file) { addToast('Choisis d\'abord une image ou une vidéo', 'error'); return }
    if (scheduleMode && !scheduledAt) { addToast('Choisis la date et l\'heure', 'error'); return }
    setPublishing(true)
    try {
      const isVideo = file.type.startsWith('video')
      // Les images sont recadrées au format story 9:16 (1080×1920) à l'upload
      const up = await window.api.uploadFile(file, isVideo ? null : 'story')
      if (up.error) throw new Error(up.error)
      const mediaPath = up.igPath || up.path

      const ts = scheduleMode ? Math.floor(new Date(scheduledAt).getTime() / 1000) : null
      const res = await window.api.createPost({
        content: '📱 Story Instagram',
        mediaPaths: [mediaPath],
        mediaPathsInstagram: null,
        platforms: ['instagram_story'],
        scheduledAt: ts,
      })
      if (res.error) throw new Error(res.error)

      if (res.immediate) {
        const ok = (res.results || []).find(r => r.status === 'published')
        if (ok) addToast('Story publiée sur Instagram 📱✨', 'success')
        else addToast((res.results || [])[0]?.error || 'Échec de la publication', 'error')
      } else {
        addToast('Story planifiée 📅', 'success')
      }
      setFile(null); setPreview(null); setScheduleMode(false); setScheduledAt('')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="p-4 md:p-6 md:pt-10 pb-24 md:pb-10">
      <div className="max-w-md mx-auto space-y-5">
        <div>
          <h2 className="text-xl font-bold text-warm-700 mb-1 flex items-center gap-2">
            <Smartphone size={20} className="text-sage-600" /> Stories Instagram
          </h2>
          <p className="text-sm text-warm-500">Publie ou planifie une story au format 9:16 📱</p>
        </div>

        {!igConnected && (
          <div className="bg-warm-50 border border-warm-200 rounded-xl p-4 text-sm text-warm-600">
            Connecte d'abord ton compte Instagram dans l'onglet <strong>Comptes</strong>.
          </div>
        )}

        {/* Aperçu façon téléphone (9:16) */}
        <div className="flex justify-center">
          <label className="relative block w-[240px] aspect-[9/16] rounded-3xl border-4 border-warm-700 bg-warm-100 overflow-hidden cursor-pointer shadow-xl hover:border-sage-600 transition-colors">
            <input type="file" accept="image/*,video/mp4,video/quicktime" onChange={pick} className="hidden" />
            {preview ? (
              file?.type?.startsWith('video') ? (
                <video src={preview} className="w-full h-full object-cover" muted autoPlay loop playsInline />
              ) : (
                <img src={preview} alt="aperçu story" className="w-full h-full object-cover" />
              )
            ) : (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-warm-400 text-center px-4">
                <ImageIcon size={28} className="text-sage-500" />
                <span className="text-xs font-medium leading-relaxed">Clique pour choisir<br />une image ou une vidéo</span>
              </span>
            )}
            {preview && (
              <button
                type="button"
                onClick={clearMedia}
                className="absolute top-2 right-2 bg-warm-900/60 hover:bg-warm-900/80 text-white rounded-full p-1.5 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </label>
        </div>

        {/* Planification */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setScheduleMode(!scheduleMode)}
            className={`flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-2 border transition-colors ${
              scheduleMode
                ? 'text-sage-700 bg-sage-100 border-sage-300'
                : 'text-warm-500 bg-warm-50 border-warm-200 hover:bg-warm-100'
            }`}
          >
            <CalendarClock size={14} /> Planifier
          </button>
          {scheduleMode && (
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              className="bg-warm-50 border border-warm-200 rounded-lg px-2 py-1.5 text-sm text-warm-700 outline-none focus:border-sage-500"
            />
          )}
        </div>

        <button
          onClick={publish}
          disabled={publishing || !file || !igConnected}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-semibold text-[15px] text-white bg-sage-600 hover:bg-sage-500 active:bg-sage-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-sage-500/30"
        >
          {publishing ? (
            <><Loader2 size={17} className="animate-spin" /> Publication en cours…</>
          ) : scheduleMode ? (
            <><CalendarClock size={17} /> Planifier la story</>
          ) : (
            <><Send size={17} /> Publier la story</>
          )}
        </button>

        <p className="text-[11px] text-warm-400 text-center leading-relaxed">
          Ton image est recadrée au format 9:16. Comme toute story, elle disparaît après 24 h. 🌿
        </p>
      </div>
    </div>
  )
}
