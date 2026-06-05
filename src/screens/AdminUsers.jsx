'use client'
import { useState, useEffect } from 'react'
import { RefreshCw, Sparkles, UserX, UserCheck, Trash2, ShieldCheck, Hash } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function AdminUsers({ addToast }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingQuota, setEditingQuota] = useState({}) // { userId: valueStr }

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/users')
      if (!r.ok) throw new Error((await r.json()).error)
      setUsers(await r.json())
    } catch (e) { addToast(e.message, 'error') }
    finally { setLoading(false) }
  }

  async function toggle(id, field, value) {
    try {
      const r = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      if (!r.ok) throw new Error((await r.json()).error)
      await load()
      addToast('Mis à jour', 'success')
    } catch (e) { addToast(e.message, 'error') }
  }

  async function saveQuota(id, valueStr) {
    const quota = valueStr === '' ? null : parseInt(valueStr)
    if (valueStr !== '' && (isNaN(quota) || quota < 1)) { addToast('Quota invalide', 'error'); return }
    try {
      const r = await fetch(`/api/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthlyPostQuota: quota }) })
      if (!r.ok) throw new Error((await r.json()).error)
      setEditingQuota(prev => { const n = { ...prev }; delete n[id]; return n })
      await load()
      addToast(quota ? `Quota fixé à ${quota}/mois` : 'Quota illimité', 'success')
    } catch (e) { addToast(e.message, 'error') }
  }

  async function handleDelete(id, email) {
    if (!confirm(`Supprimer le compte de ${email} ? Cette action est irréversible.`)) return
    try {
      const r = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error((await r.json()).error)
      await load()
      addToast('Compte supprimé', 'success')
    } catch (e) { addToast(e.message, 'error') }
  }

  return (
    <div className="p-4 md:p-6 md:pt-10 pb-24 md:pb-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-warm-700 mb-1">Utilisateurs</h2>
            <p className="text-sm text-warm-500">{users.length} compte{users.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={load} disabled={loading} className="text-warm-500 hover:text-warm-600 p-2 transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="space-y-3">
          {users.map(user => (
            <div key={user.id} className={`bg-cream border rounded-xl p-4 ${!user.isActive ? 'opacity-60 border-warm-300' : 'border-warm-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-medium text-warm-700 truncate">{user.email}</p>
                    {user.isAdmin && (
                      <span className="flex items-center gap-1 text-[10px] bg-sage-100 text-sage-700 px-1.5 py-0.5 rounded-full font-semibold">
                        <ShieldCheck size={10} /> Admin
                      </span>
                    )}
                    {!user.isActive && (
                      <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">Désactivé</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-warm-400 flex-wrap">
                    <span>Inscrit le {format(new Date(user.createdAt * 1000), 'd MMM yyyy', { locale: fr })}</span>
                    {user.hasOwnKey && <span className="text-sage-600">🔑 Clé perso</span>}
                    {!user.isAdmin && (
                      <span className="flex items-center gap-1">
                        <Hash size={10} />
                        {user.monthlyPostQuota ? `${user.monthlyPostQuota}/mois` : 'illimité'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions (not for admins) */}
                {!user.isAdmin && (
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {/* Quota input */}
                    {editingQuota[user.id] !== undefined ? (
                      <div className="flex items-center gap-1">
                        <input type="number" min="1" value={editingQuota[user.id]}
                          onChange={e => setEditingQuota(prev => ({ ...prev, [user.id]: e.target.value }))}
                          placeholder="∞" className="w-16 text-xs bg-warm-50 border border-warm-200 rounded-lg px-2 py-1 outline-none focus:border-sage-500 text-center" />
                        <button onClick={() => saveQuota(user.id, editingQuota[user.id])} className="text-xs bg-sage-600 text-white px-2 py-1 rounded-lg hover:bg-sage-500">OK</button>
                        <button onClick={() => setEditingQuota(prev => { const n = { ...prev }; delete n[user.id]; return n })} className="text-xs text-warm-400 hover:text-warm-600 px-1">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setEditingQuota(prev => ({ ...prev, [user.id]: user.monthlyPostQuota ?? '' }))}
                        className="text-[10px] text-warm-400 hover:text-warm-600 flex items-center gap-1">
                        <Hash size={10} /> Quota
                      </button>
                    )}
                  <div className="flex items-center gap-1">
                    {/* Toggle AI */}
                    <button
                      onClick={() => toggle(user.id, 'aiEnabled', !user.aiEnabled)}
                      title={user.aiEnabled ? 'Désactiver l\'IA offerte' : 'Activer l\'IA offerte'}
                      className={`p-2 rounded-lg transition-colors ${user.aiEnabled ? 'bg-sage-100 text-sage-700 hover:bg-sage-200' : 'text-warm-400 hover:bg-warm-100 hover:text-warm-600'}`}
                    >
                      <Sparkles size={15} />
                    </button>

                    {/* Toggle active */}
                    <button
                      onClick={() => toggle(user.id, 'isActive', !user.isActive)}
                      title={user.isActive ? 'Désactiver l\'accès' : 'Réactiver l\'accès'}
                      className={`p-2 rounded-lg transition-colors ${!user.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'text-warm-400 hover:bg-warm-100 hover:text-warm-600'}`}
                    >
                      {user.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(user.id, user.email)}
                      title="Supprimer le compte"
                      className="p-2 rounded-lg text-warm-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
