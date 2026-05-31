'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Leaf, Loader2, Eye, EyeOff } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') || '/'

  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [setupMode, setSetupMode] = useState(false)

  useEffect(() => {
    // Detect first-time setup
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
        body: JSON.stringify({ password })
      })
      const data = await r.json()
      if (!r.ok) {
        setError(data.error || 'Erreur')
        setLoading(false)
        return
      }
      // Cookie is set by the server. Redirect to the requested page (or /).
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
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sage-300 to-sage-500 flex items-center justify-center shadow-lg mb-4">
            <Leaf size={30} className="text-white" strokeWidth={2.2} />
          </div>
          <h1 className="text-2xl font-bold text-warm-700">Social Poster</h1>
          <p className="text-sm text-warm-500 mt-1">Aux graines du bien-être</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-cream border border-warm-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-warm-700 mb-1">
              {setupMode ? 'Choisis ton mot de passe' : 'Connexion'}
            </h2>
            <p className="text-xs text-warm-500">
              {setupMode
                ? "Premier accès — définis le mot de passe qui protègera ton app."
                : "Entre ton mot de passe pour accéder à ton tableau de bord."
              }
            </p>
          </div>

          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={setupMode ? "Choisis un mot de passe…" : "Mot de passe…"}
              autoFocus
              autoComplete={setupMode ? 'new-password' : 'current-password'}
              required
              minLength={setupMode ? 8 : 1}
              className="w-full bg-warm-50 border border-warm-200 rounded-xl px-4 py-3 pr-11 text-sm text-warm-700 placeholder-warm-400 outline-none focus:border-sage-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600 transition-colors"
            >
              {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          {error && (
            <div className="bg-[#FBEEEA] border border-[#E5C8BD] text-[#B07060] text-xs rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {setupMode && (
            <p className="text-[11px] text-warm-500 leading-relaxed">
              💡 Choisis au moins 8 caractères. Tu peux le changer plus tard en supprimant <code className="bg-warm-100 px-1 rounded">.data/auth.json</code> ou en mettant à jour la variable <code className="bg-warm-100 px-1 rounded">APP_PASSWORD</code> sur Vercel.
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white bg-sage-600 hover:bg-sage-500 active:bg-sage-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-sage-500/20"
          >
            {loading ? <Loader2 size={17} className="animate-spin" /> : null}
            {setupMode ? 'Créer mon mot de passe' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-[11px] text-warm-400 mt-6">
          🌿 Outil personnel · données chiffrées côté serveur
        </p>
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
