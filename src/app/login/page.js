'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Leaf, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react'

const ERROR_MESSAGES = {
  'compte-desactive': 'Ton compte a été désactivé. Contacte l\'administrateur.',
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') || '/'
  const errorParam = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(ERROR_MESSAGES[errorParam] || '')
  const [setupMode, setSetupMode] = useState(false)

  useEffect(() => {
    fetch('/api/auth/status').then(r => r.json()).then(d => {
      if (d.setupNeeded) setSetupMode(true)
    }).catch(() => {})
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const endpoint = setupMode ? '/api/auth/setup' : '/api/auth/login'
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await r.json()
      if (!r.ok) { setError(data.error || 'Erreur'); setLoading(false); return }
      router.push(nextPath)
      router.refresh()
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-ivory-100 p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sage-300 to-sage-500 flex items-center justify-center shadow-lg mb-4">
            <Leaf size={30} className="text-white" strokeWidth={2.2} />
          </div>
          <h1 className="text-2xl font-bold text-warm-700">Social Poster</h1>
          <p className="text-sm text-warm-500 mt-1">Aux graines du bien-être</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-cream border border-warm-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-warm-700 mb-1">
              {setupMode ? 'Créer ton compte admin' : 'Connexion'}
            </h2>
            <p className="text-xs text-warm-500">
              {setupMode ? 'Premier accès — crée ton compte administrateur.' : 'Entre tes identifiants pour accéder à ton tableau de bord.'}
            </p>
          </div>

          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email…"
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
              placeholder={setupMode ? 'Choisis un mot de passe…' : 'Mot de passe…'}
              autoComplete={setupMode ? 'new-password' : 'current-password'}
              required
              minLength={setupMode ? 8 : 1}
              className="w-full bg-warm-50 border border-warm-200 rounded-xl px-4 py-3 pr-11 text-sm text-warm-700 placeholder-warm-400 outline-none focus:border-sage-500 transition-colors"
            />
            <button type="button" onClick={() => setShowPwd(!showPwd)} tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600 transition-colors">
              {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-[#FBEEEA] border border-[#E5C8BD] text-[#B07060] text-xs rounded-lg px-3 py-2">
              <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <button type="submit" disabled={loading || !email || !password}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white bg-sage-600 hover:bg-sage-500 active:bg-sage-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-sage-500/20">
            {loading ? <Loader2 size={17} className="animate-spin" /> : null}
            {setupMode ? 'Créer mon compte' : 'Se connecter'}
          </button>
        </form>

        {!setupMode && (
          <div className="text-center mt-4">
            <a href="/forgot-password" className="text-xs text-warm-400 hover:text-warm-600 transition-colors">Mot de passe oublié ?</a>
          </div>
        )}
        <p className="text-center text-[11px] text-warm-400 mt-4">🌿 Outil personnel · données chiffrées côté serveur</p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-ivory-100" />}>
      <LoginForm />
    </Suspense>
  )
}
