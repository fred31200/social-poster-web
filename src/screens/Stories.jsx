'use client'
import { useState, useRef, useEffect } from 'react'
import { Smartphone, Send, CalendarClock, Loader2, X, Image as ImageIcon, Sparkles, Palette, Type } from 'lucide-react'

// Fonds dégradés prêts à l'emploi (façon mode « Créer » d'Instagram)
const GRADIENTS = [
  { id: 'sauge',   from: '#7c9473', to: '#3f5a40' },
  { id: 'aurore',  from: '#f6d365', to: '#fda085' },
  { id: 'ocean',   from: '#84b6c4', to: '#2b5f6e' },
  { id: 'lavande', from: '#b8a9d9', to: '#6b5b95' },
  { id: 'dore',    from: '#e8c17a', to: '#9a6b2f' },
  { id: 'nuit',    from: '#43484f', to: '#16181d' },
]
const TEXT_COLORS = ['#ffffff', '#2f3a2f', '#f3dca3']

function wrapLines(ctx, text, maxWidth) {
  const words = text.split(/\s+/)
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w }
    else line = test
  }
  if (line) lines.push(line)
  return lines
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export default function Stories({ accounts, addToast }) {
  const igConnected = (accounts || []).some(a => a.platform === 'instagram')
  const canvasRef = useRef(null)
  const fileRef = useRef(null)

  // Fond
  const [bgType, setBgType] = useState('gradient') // 'gradient' | 'image' | 'video'
  const [gradientId, setGradientId] = useState('sauge')
  const [bgImage, setBgImage] = useState(null)       // HTMLImageElement
  const [videoFile, setVideoFile] = useState(null)   // File (vidéo : publication directe, sans texte)
  const [videoPreview, setVideoPreview] = useState(null)
  // Texte
  const [text, setText] = useState('')
  const [textColor, setTextColor] = useState('#ffffff')
  const [textPos, setTextPos] = useState('center')   // 'top' | 'center' | 'bottom'
  const [textBg, setTextBg] = useState(true)
  // IA
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [textBusy, setTextBusy] = useState(false)
  // Publication
  const [publishing, setPublishing] = useState(false)
  const [scheduleMode, setScheduleMode] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')

  // Rendu du canvas (aperçu temps réel + export à la publication)
  function drawStory(canvas) {
    const W = 1080, H = 1920
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')
    if (bgType === 'image' && bgImage) {
      const s = Math.max(W / bgImage.width, H / bgImage.height)
      const w = bgImage.width * s, h = bgImage.height * s
      ctx.drawImage(bgImage, (W - w) / 2, (H - h) / 2, w, h)
    } else {
      const g = GRADIENTS.find(x => x.id === gradientId) || GRADIENTS[0]
      const grad = ctx.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, g.from); grad.addColorStop(1, g.to)
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)
    }
    if (text.trim()) {
      const fontSize = 78
      ctx.font = `bold ${fontSize}px Georgia, serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const lines = wrapLines(ctx, text.trim(), W - 220)
      const lh = fontSize * 1.32
      const blockH = lines.length * lh
      const y0 = textPos === 'top' ? 300 : textPos === 'bottom' ? H - 300 - blockH : (H - blockH) / 2
      if (textBg) {
        ctx.fillStyle = 'rgba(18,22,18,0.45)'
        roundRect(ctx, 70, y0 - lh * 0.45, W - 140, blockH + lh * 0.9, 40)
        ctx.fill()
      } else {
        ctx.shadowColor = 'rgba(0,0,0,0.55)'
        ctx.shadowBlur = 20
      }
      ctx.fillStyle = textColor
      lines.forEach((ln, i) => ctx.fillText(ln, W / 2, y0 + lh * (i + 0.5)))
      ctx.shadowBlur = 0
    }
  }

  useEffect(() => {
    if (bgType !== 'video' && canvasRef.current) drawStory(canvasRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgType, gradientId, bgImage, text, textColor, textPos, textBg])

  function pickFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.type.startsWith('video')) {
      setVideoFile(f)
      setVideoPreview(URL.createObjectURL(f))
      setBgType('video')
      return
    }
    const url = URL.createObjectURL(f)
    const img = new window.Image()
    img.onload = () => { setBgImage(img); setBgType('image'); setVideoFile(null) }
    img.onerror = () => addToast('Image illisible', 'error')
    img.src = url
  }

  // ✨ Fond généré par l'IA (Gemini) — chargé via le proxy same-origin (canvas OK)
  async function generateAiImage() {
    if (!aiPrompt.trim()) { addToast('Décris d\'abord l\'image que tu imagines', 'error'); return }
    setAiBusy(true)
    try {
      const r = await fetch('/api/ai/image-generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt.trim() + ' — composition VERTICALE adaptée à une story Instagram (9:16)' }),
      })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      const url = d.urls?.[0]
      if (!url) throw new Error('Aucune image générée — réessaie')
      const img = new window.Image()
      await new Promise((res, rej) => {
        img.onload = res
        img.onerror = () => rej(new Error('Chargement de l\'image impossible'))
        img.src = url
      })
      setBgImage(img); setBgType('image'); setVideoFile(null)
      addToast('Fond généré ✨', 'success')
    } catch (e) { addToast(e.message, 'error') }
    finally { setAiBusy(false) }
  }

  // ✨ Texte court généré dans la voix de Frédéric
  async function generateAiText() {
    setTextBusy(true)
    try {
      const theme = text.trim() || aiPrompt.trim() || 'la douceur, l\'amour de soi, le bien-être'
      const r = await fetch('/api/ai/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'generate', platform: null,
          topic: `UNE seule phrase courte et lumineuse pour une story Instagram (15 mots MAXIMUM, pas de hashtag, pas d'emoji, pas de guillemets), sur le thème : ${theme}`,
        }),
      })
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || `Erreur ${r.status}`) }
      const reader = r.body.getReader(); const dec = new TextDecoder()
      let buf = '', acc = ''
      while (true) {
        const { value, done } = await reader.read(); if (done) break
        buf += dec.decode(value, { stream: true })
        const evts = buf.split('\n\n'); buf = evts.pop() || ''
        for (const e of evts) {
          const l = e.trim(); if (!l.startsWith('data: ')) continue
          try { const d = JSON.parse(l.slice(6)); if (d.error) throw new Error(d.error); if (d.text) acc += d.text } catch (err) { if (err.message && !err.message.includes('JSON')) throw err }
        }
      }
      setText(acc.trim().replace(/^["«\s]+|["»\s]+$/g, ''))
    } catch (e) { addToast(e.message, 'error') }
    finally { setTextBusy(false) }
  }

  async function publish() {
    if (scheduleMode && !scheduledAt) { addToast('Choisis la date et l\'heure', 'error'); return }
    setPublishing(true)
    try {
      let mediaPath
      if (bgType === 'video' && videoFile) {
        const up = await window.api.uploadFile(videoFile, null)
        if (up.error) throw new Error(up.error)
        mediaPath = up.path
      } else {
        // Export du montage canvas en JPEG 1080×1920
        const canvas = document.createElement('canvas')
        drawStory(canvas)
        const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92))
        const f = new File([blob], `story-${Date.now()}.jpg`, { type: 'image/jpeg' })
        const up = await window.api.uploadFile(f, null)
        if (up.error) throw new Error(up.error)
        mediaPath = up.path
      }

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
        const ok = (res.results || []).find(x => x.status === 'published')
        if (ok) addToast('Story publiée sur Instagram 📱✨', 'success')
        else addToast((res.results || [])[0]?.error || 'Échec de la publication', 'error')
      } else {
        addToast('Story planifiée 📅', 'success')
      }
      setText(''); setScheduleMode(false); setScheduledAt('')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setPublishing(false)
    }
  }

  const segBtn = (active) =>
    `flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition-colors ${
      active ? 'bg-sage-600 text-white border-sage-600' : 'bg-warm-50 text-warm-600 border-warm-200 hover:bg-warm-100'
    }`

  return (
    <div className="p-4 md:p-6 md:pt-10 pb-24 md:pb-10">
      <div className="max-w-3xl mx-auto">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-warm-700 mb-1 flex items-center gap-2">
            <Smartphone size={20} className="text-sage-600" /> Studio Stories
          </h2>
          <p className="text-sm text-warm-500">Crée ta story comme sur Insta : fond, texte, et c'est parti 📱</p>
        </div>

        {!igConnected && (
          <div className="bg-warm-50 border border-warm-200 rounded-xl p-4 text-sm text-warm-600 mb-4">
            Connecte d'abord ton compte Instagram dans l'onglet <strong>Comptes</strong>.
          </div>
        )}

        <div className="grid md:grid-cols-[260px_1fr] gap-6 items-start">
          {/* Aperçu téléphone */}
          <div className="flex justify-center md:sticky md:top-6">
            <div className="relative w-[240px] aspect-[9/16] rounded-3xl border-4 border-warm-700 bg-warm-100 overflow-hidden shadow-xl">
              {bgType === 'video' && videoPreview ? (
                <>
                  <video src={videoPreview} className="w-full h-full object-cover" muted autoPlay loop playsInline />
                  <button onClick={() => { setVideoFile(null); setVideoPreview(null); setBgType('gradient') }}
                    className="absolute top-2 right-2 bg-warm-900/60 text-white rounded-full p-1.5"><X size={14} /></button>
                </>
              ) : (
                <canvas ref={canvasRef} className="w-full h-full" />
              )}
            </div>
          </div>

          {/* Contrôles */}
          <div className="space-y-4">
            {/* 1. Le fond */}
            <div className="bg-cream border border-warm-200 rounded-2xl p-4">
              <p className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Palette size={12} /> 1 · Le fond
              </p>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setBgType('gradient')} className={segBtn(bgType === 'gradient')}>🎨 Couleurs</button>
                <button onClick={() => fileRef.current?.click()} className={segBtn(bgType === 'image' && !aiBusy)}>📷 Photo/Vidéo</button>
                <button onClick={() => document.getElementById('ai-bg-input')?.focus()} className={segBtn(false)}>✨ Image IA</button>
              </div>
              <input ref={fileRef} type="file" accept="image/*,video/mp4,video/quicktime" onChange={pickFile} className="hidden" />

              {bgType === 'gradient' && (
                <div className="flex gap-2 flex-wrap">
                  {GRADIENTS.map(g => (
                    <button key={g.id} onClick={() => setGradientId(g.id)}
                      className={`w-9 h-9 rounded-full border-2 transition-transform ${gradientId === g.id ? 'border-sage-600 scale-110' : 'border-warm-200'}`}
                      style={{ background: `linear-gradient(180deg, ${g.from}, ${g.to})` }} />
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-3">
                <input
                  id="ai-bg-input"
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder="✨ Décris un fond : bougie et fleurs dans une ambiance dorée…"
                  className="flex-1 bg-warm-50 border border-warm-200 rounded-lg px-3 py-2 text-sm text-warm-700 placeholder-warm-400 outline-none focus:border-sage-500"
                />
                <button onClick={generateAiImage} disabled={aiBusy}
                  className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-sage-700 bg-sage-100 hover:bg-sage-200 border border-sage-300 rounded-lg px-3 disabled:opacity-50">
                  {aiBusy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Générer
                </button>
              </div>
            </div>

            {/* 2. Le texte */}
            <div className={`bg-cream border border-warm-200 rounded-2xl p-4 ${bgType === 'video' ? 'opacity-50 pointer-events-none' : ''}`}>
              <p className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Type size={12} /> 2 · Le texte {bgType === 'video' && '(indisponible sur vidéo)'}
              </p>
              <div className="flex gap-2 mb-3">
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  rows={2}
                  placeholder="Écris ton message… ou laisse l'IA le faire 👇"
                  className="flex-1 bg-warm-50 border border-warm-200 rounded-lg px-3 py-2 text-sm text-warm-700 placeholder-warm-400 outline-none focus:border-sage-500 resize-none"
                />
                <button onClick={generateAiText} disabled={textBusy}
                  className="shrink-0 flex flex-col items-center justify-center gap-1 text-[10px] font-semibold text-sage-700 bg-sage-100 hover:bg-sage-200 border border-sage-300 rounded-lg px-2.5 disabled:opacity-50">
                  {textBusy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Écris pour moi
                </button>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex gap-1.5">
                  {TEXT_COLORS.map(c => (
                    <button key={c} onClick={() => setTextColor(c)}
                      className={`w-7 h-7 rounded-full border-2 ${textColor === c ? 'border-sage-600 scale-110' : 'border-warm-200'}`}
                      style={{ background: c }} />
                  ))}
                </div>
                <div className="flex gap-1">
                  {[['top', 'Haut'], ['center', 'Milieu'], ['bottom', 'Bas']].map(([v, l]) => (
                    <button key={v} onClick={() => setTextPos(v)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium ${textPos === v ? 'bg-sage-600 text-white border-sage-600' : 'bg-warm-50 text-warm-500 border-warm-200'}`}>
                      {l}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-1.5 text-[11px] text-warm-500 cursor-pointer">
                  <input type="checkbox" checked={textBg} onChange={e => setTextBg(e.target.checked)} className="accent-sage-600" />
                  Bandeau derrière le texte
                </label>
              </div>
            </div>

            {/* 3. Publier */}
            <div className="bg-cream border border-warm-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <button onClick={() => setScheduleMode(!scheduleMode)}
                  className={`flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-2 border transition-colors ${
                    scheduleMode ? 'text-sage-700 bg-sage-100 border-sage-300' : 'text-warm-500 bg-warm-50 border-warm-200 hover:bg-warm-100'
                  }`}>
                  <CalendarClock size={14} /> Planifier
                </button>
                {scheduleMode && (
                  <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                    className="bg-warm-50 border border-warm-200 rounded-lg px-2 py-1.5 text-sm text-warm-700 outline-none focus:border-sage-500" />
                )}
              </div>
              <button onClick={publish} disabled={publishing || !igConnected}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-semibold text-[15px] text-white bg-sage-600 hover:bg-sage-500 active:bg-sage-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-sage-500/30">
                {publishing ? (
                  <><Loader2 size={17} className="animate-spin" /> Publication en cours…</>
                ) : scheduleMode ? (
                  <><CalendarClock size={17} /> Planifier la story</>
                ) : (
                  <><Send size={17} /> Publier la story</>
                )}
              </button>
              <p className="text-[11px] text-warm-400 leading-relaxed">
                🎵 La musique ne peut être ajoutée que dans l'app Instagram elle-même — Meta ne l'autorise à aucune appli externe.
                Ta story disparaît après 24 h, comme une story normale. 🌿
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
