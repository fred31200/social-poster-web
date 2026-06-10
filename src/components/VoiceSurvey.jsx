'use client'
import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'

const TONES = [
  'Doux & chaleureux',
  'Dynamique & motivant',
  'Posé & professionnel',
  'Poétique & inspirant',
]

/**
 * Enquête de style à la première connexion d'un compte invité :
 * permet à l'IA d'écrire les posts dans SA voix (et d'ajouter sa signature).
 */
export default function VoiceSurvey({ onDone, addToast }) {
  const [activity, setActivity] = useState('')
  const [tone, setTone] = useState(TONES[0])
  const [address, setAddress] = useState('tu')
  const [emojis, setEmojis] = useState('peu')
  const [themes, setThemes] = useState('')
  const [sample, setSample] = useState('')
  const [signature, setSignature] = useState('')
  const [saving, setSaving] = useState(false)

  async function save(skip = false) {
    setSaving(true)
    try {
      const body = skip
        ? { voiceSurveyDone: true }
        : {
            voiceSurveyDone: true,
            signature,
            voiceProfile: { activity, tone, address, emojis, themes, sample },
          }
      const r = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (d.error) { addToast(d.error, 'error'); setSaving(false); return }
      addToast(skip ? 'Tu pourras régler ta voix dans Réglages 🌿' : 'Ta voix est enregistrée — l\'IA écrira comme toi ✨', 'success')
      onDone?.()
    } catch (e) {
      addToast(e.message, 'error')
      setSaving(false)
    }
  }

  const radio = (active) =>
    `px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
      active ? 'bg-sage-600 text-white border-sage-600' : 'bg-warm-50 text-warm-600 border-warm-200 hover:bg-warm-100'
    }`

  return (
    <div className="fixed inset-0 z-50 bg-warm-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-cream rounded-2xl shadow-2xl border border-warm-200 w-full max-w-lg max-h-[92vh] overflow-y-auto p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-warm-700 flex items-center gap-2">
            <Sparkles size={18} className="text-sage-600" /> Bienvenue ! Parle-moi de ta plume
          </h2>
          <p className="text-xs text-warm-500 mt-1">
            2 minutes pour que l'IA écrive tes posts <strong>comme toi</strong>. Modifiable à tout moment dans Réglages.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-warm-600 mb-1.5">Ton activité ?</label>
          <input value={activity} onChange={e => setActivity(e.target.value)}
            placeholder="ex : praticienne reiki et sophrologue à Lyon"
            className="w-full bg-warm-50 border border-warm-200 rounded-lg px-3 py-2.5 text-sm text-warm-700 placeholder-warm-400 outline-none focus:border-sage-500" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-warm-600 mb-1.5">Ton ton d'écriture ?</label>
          <div className="flex flex-wrap gap-1.5">
            {TONES.map(t => (
              <button key={t} onClick={() => setTone(t)} className={radio(tone === t)}>{t}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-warm-600 mb-1.5">Tu dis…</label>
            <div className="flex gap-1.5">
              <button onClick={() => setAddress('tu')} className={radio(address === 'tu')}>« tu »</button>
              <button onClick={() => setAddress('vous')} className={radio(address === 'vous')}>« vous »</button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-warm-600 mb-1.5">Les emojis ?</label>
            <div className="flex gap-1.5">
              <button onClick={() => setEmojis('aucun')} className={radio(emojis === 'aucun')}>Aucun</button>
              <button onClick={() => setEmojis('peu')} className={radio(emojis === 'peu')}>Quelques-uns</button>
              <button onClick={() => setEmojis('beaucoup')} className={radio(emojis === 'beaucoup')}>Beaucoup</button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-warm-600 mb-1.5">Tes thèmes favoris ?</label>
          <input value={themes} onChange={e => setThemes(e.target.value)}
            placeholder="ex : énergie, lâcher-prise, cycles de la lune, ancrage…"
            className="w-full bg-warm-50 border border-warm-200 rounded-lg px-3 py-2.5 text-sm text-warm-700 placeholder-warm-400 outline-none focus:border-sage-500" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-warm-600 mb-1.5">
            Colle un texte que TU as écrit <span className="font-normal text-warm-400">(optionnel mais magique ✨)</span>
          </label>
          <textarea value={sample} onChange={e => setSample(e.target.value)} rows={4}
            placeholder="Un post, un mail, quelques lignes… l'IA s'imprègnera de ton rythme et de ton vocabulaire."
            className="w-full bg-warm-50 border border-warm-200 rounded-lg px-3 py-2.5 text-sm text-warm-700 placeholder-warm-400 outline-none focus:border-sage-500 resize-none" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-warm-600 mb-1.5">
            Ta signature de fin de post <span className="font-normal text-warm-400">(optionnel)</span>
          </label>
          <input value={signature} onChange={e => setSignature(e.target.value)}
            placeholder="ex : ✨ Marie — Reiki & Sophrologie  #reikilyon"
            className="w-full bg-warm-50 border border-warm-200 rounded-lg px-3 py-2.5 text-sm text-warm-700 placeholder-warm-400 outline-none focus:border-sage-500" />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button onClick={() => save(true)} disabled={saving}
            className="px-4 py-2.5 text-sm text-warm-500 hover:text-warm-700 font-medium disabled:opacity-50">
            Plus tard
          </button>
          <button onClick={() => save(false)} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white bg-sage-600 hover:bg-sage-500 disabled:opacity-50 transition-all shadow-sm shadow-sage-500/20">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            C'est ma voix, c'est parti !
          </button>
        </div>
      </div>
    </div>
  )
}
