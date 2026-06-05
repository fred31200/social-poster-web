'use client'
import { useState } from 'react'
import { Leaf, Loader2, ArrowLeft, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const r = await fetch('/api/auth/forgot', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await r.json()
      if (!r.ok) { setError(data.error); return }
      setSent(true)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-ivory-100 p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sage-300 to-sage-500 flex items-center justify-center shadow-lg mb-4">
            <Leaf size={30} className="text-white" strokeWidth={2.2} />
          </div>
          <h1 className="text-2xl font-bold text-warm-700">Mot de passe oublié</h1>
        </div>

        <div className="bg-cream border border-warm-200 rounded-2xl p-6 shadow-sm">
          {sent ? (
            <div className="text-center space-y-3">
              <CheckCircle size={40} className="text-sage-600 mx-auto" />
              <p className="text-sm font-semibold text-warm-700">Email envoyé !</p>
              <p className="text-xs text-warm-500">Vérifie ta boîte mail et clique sur le lien de réinitialisation (valable 1h).</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <p className="text-xs text-warm-500 mb-3">Entre ton email pour recevoir un lien de réinitialisation.</p>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ton@email.com"
                  autoFocus required
                  className="w-full bg-warm-50 border border-warm-200 rounded-xl px-4 py-3 text-sm text-warm-700 placeholder-warm-400 outline-none focus:border-sage-500 transition-colors" />
              </div>
              {error && <div className="text-xs text-[#B07060] bg-[#FBEEEA] border border-[#E5C8BD] rounded-lg px-3 py-2">{error}</div>}
              <button type="submit" disabled={loading || !email}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white bg-sage-600 hover:bg-sage-500 disabled:opacity-50 transition-all">
                {loading ? <Loader2 size={17} className="animate-spin" /> : null}
                Envoyer le lien
              </button>
            </form>
          )}
        </div>

        <a href="/login" className="flex items-center justify-center gap-2 mt-4 text-xs text-warm-500 hover:text-warm-700 transition-colors">
          <ArrowLeft size={13} /> Retour à la connexion
        </a>
      </div>
    </div>
  )
}
