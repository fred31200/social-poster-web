'use client'
import { useState, useEffect } from 'react'
import { Copy, Plus, RefreshCw, Check, Clock, UserCheck, Ban } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function Invitations({ addToast }) {
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/invite')
      if (!r.ok) throw new Error((await r.json()).error)
      setInvites(await r.json())
    } catch (e) { addToast(e.message, 'error') }
    finally { setLoading(false) }
  }

  async function handleCreate() {
    setCreating(true)
    try {
      const r = await fetch('/api/admin/invite', { method: 'POST' })
      if (!r.ok) throw new Error((await r.json()).error)
      await load()
      addToast('Invitation créée !', 'success')
    } catch (e) { addToast(e.message, 'error') }
    finally { setCreating(false) }
  }

  function inviteUrl(code) {
    return `${window.location.origin}/signup?invite=${code}`
  }

  async function copyUrl(code) {
    await navigator.clipboard.writeText(inviteUrl(code))
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const active = invites.filter(i => i.status === 'active')
  const used = invites.filter(i => i.status === 'used')
  const expired = invites.filter(i => i.status === 'expired')

  return (
    <div className="p-4 md:p-6 md:pt-10 pb-24 md:pb-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-warm-700 mb-1">Invitations</h2>
            <p className="text-sm text-warm-500">{active.length} lien{active.length !== 1 ? 's' : ''} actif{active.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} disabled={loading} className="text-warm-500 hover:text-warm-600 p-2 transition-colors">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={handleCreate} disabled={creating}
              className="flex items-center gap-2 px-4 py-2 bg-sage-600 hover:bg-sage-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
              <Plus size={15} />
              Générer un lien
            </button>
          </div>
        </div>

        {invites.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-warm-500 text-sm">Aucune invitation générée</p>
            <p className="text-warm-400 text-xs mt-1">Clique sur "Générer un lien" pour inviter quelqu'un</p>
          </div>
        )}

        {/* Active invites */}
        {active.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-3">Actifs</p>
            <div className="space-y-2">
              {active.map(invite => (
                <div key={invite.id} className="bg-cream border border-warm-200 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-warm-600 truncate">{inviteUrl(invite.code)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock size={11} className="text-warm-400" />
                        <span className="text-xs text-warm-400">
                          Expire le {format(new Date(invite.expiresAt * 1000), 'd MMM yyyy', { locale: fr })}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => copyUrl(invite.code)}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-sage-100 hover:bg-sage-200 text-sage-700 text-xs font-medium rounded-lg transition-colors">
                      {copied === invite.code ? <Check size={13} /> : <Copy size={13} />}
                      {copied === invite.code ? 'Copié !' : 'Copier'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Used invites */}
        {used.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-3">Utilisés</p>
            <div className="space-y-2">
              {used.map(invite => (
                <div key={invite.id} className="bg-warm-50 border border-warm-200 rounded-xl p-4 opacity-70">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-mono text-warm-500 truncate">{invite.code}</p>
                    <div className="flex items-center gap-1.5 text-xs text-green-600">
                      <UserCheck size={13} />
                      {invite.usedAt ? format(new Date(invite.usedAt * 1000), 'd MMM', { locale: fr }) : 'Utilisé'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expired invites */}
        {expired.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-3">Expirés</p>
            <div className="space-y-2">
              {expired.map(invite => (
                <div key={invite.id} className="bg-warm-50 border border-warm-200 rounded-xl p-4 opacity-50">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-mono text-warm-500 truncate">{invite.code}</p>
                    <div className="flex items-center gap-1.5 text-xs text-warm-400">
                      <Ban size={13} />
                      Expiré
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
