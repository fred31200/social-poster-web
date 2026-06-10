'use client'
import { useState, useEffect } from 'react'
import { Save, Eye, EyeOff, Key, Sparkles, Info, Lock, CalendarClock } from 'lucide-react'

export default function UserSettings({ currentUser, addToast }) {
  const [anthropicKey, setAnthropicKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [hasOwnKey, setHasOwnKey] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(false)
  const [saving, setSaving] = useState(false)

  // Password change
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [showPwds, setShowPwds] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)

  // Créneaux de publication (file d'attente façon Buffer)
  const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
  const [slots, setSlots] = useState([])
  const [savingSlots, setSavingSlots] = useState(false)

  useEffect(() => {
    fetch('/api/user/settings').then(r => r.json()).then(d => {
      if (Array.isArray(d.postingSlots)) setSlots(d.postingSlots)
    }).catch(() => {})
  }, [])

  function updateSlot(i, patch) {
    setSlots(slots.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  }

  async function saveSlots() {
    setSavingSlots(true)
    try {
      const r = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postingSlots: slots }),
      })
      const d = await r.json()
      if (d.error) addToast(d.error, 'error')
      else addToast('Créneaux enregistrés 📅', 'success')
    } catch (e) { addToast(e.message, 'error') }
    setSavingSlots(false)
  }

  useEffect(() => {
    fetch('/api/user/settings').then(r => r.json()).then(d => {
      setHasOwnKey(d.hasOwnKey)
      setAiEnabled(d.aiEnabled)
    }).catch(() => {})
  }, [])

  async function handleSaveKey(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anthropicKey: anthropicKey.trim() }),
      })
      const data = await r.json()
      if (!r.ok) { addToast(data.error, 'error'); return }
      setHasOwnKey(!!anthropicKey.trim())
      setAnthropicKey('')
      addToast('Clé sauvegardée !', 'success')
    } catch (err) { addToast(err.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleRemoveKey() {
    setSaving(true)
    try {
      const r = await fetch('/api/user/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ anthropicKey: '' }) })
      if (r.ok) { setHasOwnKey(false); addToast('Clé supprimée', 'success') }
    } finally { setSaving(false) }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setSavingPwd(true)
    try {
      const r = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      })
      const data = await r.json()
      if (!r.ok) { addToast(data.error, 'error'); return }
      setCurrentPwd(''); setNewPwd('')
      addToast('Mot de passe modifié !', 'success')
    } catch (err) { addToast(err.message, 'error') }
    finally { setSavingPwd(false) }
  }

  return (
    <div className="p-4 md:p-6 md:pt-10 pb-24 md:pb-10">
      <div className="max-w-xl mx-auto space-y-5">
        <div>
          <h2 className="text-xl font-bold text-warm-700 mb-1">Réglages</h2>
          <p className="text-sm text-warm-500">{currentUser?.email}</p>
        </div>

        {/* IA status banner */}
        <div className={`flex items-start gap-3 p-4 rounded-xl border ${aiEnabled ? 'bg-sage-50 border-sage-200' : 'bg-warm-50 border-warm-200'}`}>
          <Sparkles size={16} className={`mt-0.5 flex-shrink-0 ${aiEnabled ? 'text-sage-600' : 'text-warm-400'}`} />
          <p className="text-xs leading-relaxed">
            {aiEnabled
              ? <span className="text-sage-700 font-medium">IA activée par l'admin — tu peux utiliser la génération sans clé personnelle.</span>
              : <span className="text-warm-600">IA non activée par l'admin. Entre ta propre clé Anthropic ci-dessous.</span>
            }
          </p>
        </div>

        {/* Créneaux de publication (file d'attente) */}
        <div className="bg-cream border border-warm-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock size={15} className="text-warm-500" />
            <h3 className="text-sm font-semibold text-warm-700">Mes créneaux de publication</h3>
          </div>
          <p className="text-xs text-warm-500 mb-4">
            Définis tes moments préférés : le bouton « Ajouter à la file » du Composer planifiera chaque post au prochain créneau libre.
          </p>
          <div className="space-y-2">
            {slots.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={s.day}
                  onChange={e => updateSlot(i, { day: Number(e.target.value) })}
                  className="flex-1 bg-warm-50 border border-warm-200 rounded-lg px-2 py-2 text-sm text-warm-700 outline-none focus:border-sage-500"
                >
                  {DAYS.map((d, di) => <option key={di} value={di}>{d}</option>)}
                </select>
                <input
                  type="time"
                  value={s.time}
                  onChange={e => updateSlot(i, { time: e.target.value })}
                  className="bg-warm-50 border border-warm-200 rounded-lg px-2 py-1.5 text-sm text-warm-700 outline-none focus:border-sage-500"
                />
                <button onClick={() => setSlots(slots.filter((_, j) => j !== i))} className="text-warm-400 hover:text-[#B07060] p-1" title="Supprimer ce créneau">✕</button>
              </div>
            ))}
            {slots.length === 0 && (
              <p className="text-xs text-warm-400 italic">Aucun créneau — ajoute par exemple Mardi 18:30 et Dimanche 10:00.</p>
            )}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button onClick={() => setSlots([...slots, { day: 2, time: '18:30' }])} className="text-xs text-sage-700 font-medium hover:underline">
              + Ajouter un créneau
            </button>
            <button
              onClick={saveSlots}
              disabled={savingSlots}
              className="ml-auto text-xs font-semibold text-white bg-sage-600 hover:bg-sage-500 rounded-lg px-3 py-1.5 disabled:opacity-50"
            >
              {savingSlots ? 'Enregistrement…' : 'Enregistrer les créneaux'}
            </button>
          </div>
        </div>

        {/* Anthropic key */}
        <div className="bg-cream border border-warm-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Key size={15} className="text-warm-500" />
            <h3 className="text-sm font-semibold text-warm-700">Clé Anthropic personnelle</h3>
            {hasOwnKey && <span className="ml-auto text-xs bg-sage-100 text-sage-700 px-2 py-0.5 rounded-full font-medium">Active</span>}
          </div>
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
            <Info size={13} className="text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-600 leading-relaxed">
              Obtiens ta clé sur <strong>console.anthropic.com</strong> → API Keys. Elle commence par <code className="bg-blue-100 px-1 rounded">sk-ant-</code>
            </p>
          </div>
          {hasOwnKey ? (
            <div className="space-y-3">
              <p className="text-xs text-warm-500">Une clé personnelle est configurée.</p>
              <button onClick={handleRemoveKey} disabled={saving} className="text-xs text-[#B07060] hover:underline disabled:opacity-50">Supprimer la clé</button>
            </div>
          ) : (
            <form onSubmit={handleSaveKey} className="space-y-3">
              <div className="relative">
                <input type={showKey ? 'text' : 'password'} value={anthropicKey} onChange={e => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="w-full bg-warm-50 border border-warm-200 rounded-xl px-4 py-2.5 pr-11 text-sm text-warm-700 placeholder-warm-300 outline-none focus:border-sage-500 transition-colors font-mono" />
                <button type="button" onClick={() => setShowKey(!showKey)} tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600">
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button type="submit" disabled={saving || !anthropicKey.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-sage-600 hover:bg-sage-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
                <Save size={14} />{saving ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
            </form>
          )}
        </div>

        {/* Change password */}
        <div className="bg-cream border border-warm-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lock size={15} className="text-warm-500" />
            <h3 className="text-sm font-semibold text-warm-700">Changer de mot de passe</h3>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="relative">
              <input type={showPwds ? 'text' : 'password'} value={currentPwd} onChange={e => setCurrentPwd(e.target.value)}
                placeholder="Mot de passe actuel" autoComplete="current-password" required
                className="w-full bg-warm-50 border border-warm-200 rounded-xl px-4 py-2.5 pr-11 text-sm text-warm-700 placeholder-warm-400 outline-none focus:border-sage-500 transition-colors" />
              <button type="button" onClick={() => setShowPwds(!showPwds)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600">
                {showPwds ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <input type={showPwds ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)}
              placeholder="Nouveau mot de passe (8 car. min)" autoComplete="new-password" required minLength={8}
              className="w-full bg-warm-50 border border-warm-200 rounded-xl px-4 py-2.5 text-sm text-warm-700 placeholder-warm-400 outline-none focus:border-sage-500 transition-colors" />
            <button type="submit" disabled={savingPwd || !currentPwd || !newPwd}
              className="flex items-center gap-2 px-4 py-2 bg-sage-600 hover:bg-sage-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
              <Save size={14} />{savingPwd ? 'Modification…' : 'Modifier le mot de passe'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
