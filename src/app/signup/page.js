'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Leaf, Loader2, Eye, EyeOff } from 'lucide-react'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteCode = searchParams.get('invite') || ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const r = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode, email, password })
      })
      const data = await r.json()
      if (!r.ok) { setError(data.error || 'Erreur'); setLoading(false); return }
      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  if (!inviteCode) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-ivory-100 p-4">
        <div className="text-center">
          <p className="text-warm-600 text-sm">Lien d'invitation invalide ou manquant.</p>
          <a href="/login" className="text-sage-600 text-sm mt-2 inline-block hover:underline">← Retour à la connexion</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-ivory-100 p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sage-300 to-sage-500 flex items-center justify-center shadow-lg mb-4">
            <Leaf size={30} className="text-white" strokeWidth={2.2} />
          </div>
          <h1 className="text-2xl font-bold text-warm-700">Social Poster</h1>
          <p className="text-sm text-warm-500 mt-1">Créer mon compte</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-cream border border-warm-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-warm-700 mb-1">Bienvenue !</h2>
            <p className="text-xs text-warm-500">Tu as été invité(e) à rejoindre Social Poster. Choisis ton email et ton mot de passe.</p>
          </div>

          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Ton email…"
            autoFocus
            autoComplete="email"
            required
            className="w-full bg-warm-50 border border-warm-200 rounded-xl px-4 py-3 text-sm text-warm-700 placeholder-warm-400 outline-none focus:border-sage-500 transition-colors"
          />

          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Choisis un mot de passe…"
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full bg-warm-50 border border-warm-200 rounded-xl px-4 py-3 pr-11 text-sm text-warm-700 placeholder-warm-400 outline-none focus:border-sage-500 transition-colors"
            />
            <button type="button" onClick={() => setShowPwd(!showPwd)} tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600 transition-colors">
              {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          {error && (
            <div className="bg-[#FBEEEA] border border-[#E5C8BD] text-[#B07060] text-xs rounded-lg px-3 py-2">{error}</div>
          )}

          <button type="submit" disabled={loading || !email || !password}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white bg-sage-600 hover:bg-sage-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm">
            {loading ? <Loader2 size={17} className="animate-spin" /> : null}
            Créer mon compte
          </button>
        </form>

        <p className="text-center text-[11px] text-warm-400 mt-6">🌿 Accès sur invitation uniquement</p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-ivory-100" />}>
      <SignupForm />
    </Suspense>
  )
}
