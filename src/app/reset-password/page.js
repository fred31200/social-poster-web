'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Leaf, Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react'

function ResetForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  if (!token) return (
    <div className="text-center space-y-3">
      <p className="text-sm text-warm-600">Lien invalide ou expiré.</p>
      <a href="/forgot-password" className="text-sage-600 text-sm hover:underline">Demander un nouveau lien</a>
    </div>
  )

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const r = await fetch('/api/auth/reset', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      })
      const data = await r.json()
      if (!r.ok) { setError(data.error); return }
      setDone(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return done ? (
    <div className="text-center space-y-3">
      <CheckCircle size={40} className="text-sage-600 mx-auto" />
      <p className="text-sm font-semibold text-warm-700">Mot de passe modifié !</p>
      <p className="text-xs text-warm-500">Redirection vers la connexion…</p>
    </div>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-warm-500">Choisis ton nouveau mot de passe (8 caractères minimum).</p>
      <div className="relative">
        <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Nouveau mot de passe" autoComplete="new-password" required minLength={8}
          className="w-full bg-warm-50 border border-warm-200 rounded-xl px-4 py-3 pr-11 text-sm text-warm-700 placeholder-warm-400 outline-none focus:border-sage-500 transition-colors" />
        <button type="button" onClick={() => setShowPwd(!showPwd)} tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600">
          {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {error && <div className="text-xs text-[#B07060] bg-[#FBEEEA] border border-[#E5C8BD] rounded-lg px-3 py-2">{error}</div>}
      <button type="submit" disabled={loading || !password}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white bg-sage-600 hover:bg-sage-500 disabled:opacity-50 transition-all">
        {loading ? <Loader2 size={17} className="animate-spin" /> : null}
        Enregistrer le nouveau mot de passe
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-ivory-100" />}>
      <div className="min-h-[100dvh] flex items-center justify-center bg-ivory-100 p-4">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sage-300 to-sage-500 flex items-center justify-center shadow-lg mb-4">
              <Leaf size={30} className="text-white" strokeWidth={2.2} />
            </div>
            <h1 className="text-2xl font-bold text-warm-700">Nouveau mot de passe</h1>
          </div>
          <div className="bg-cream border border-warm-200 rounded-2xl p-6 shadow-sm">
            <ResetForm />
          </div>
        </div>
      </div>
    </Suspense>
  )
}
