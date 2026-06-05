'use client'
import { useState, useEffect } from 'react'
import { RefreshCw, LogIn, FileText, Link, UserX, UserCheck, Trash2, Shield, Key, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const ACTION_CONFIG = {
  'login':           { icon: LogIn,      color: 'text-blue-500',   label: 'Connexion' },
  'post.published':  { icon: FileText,   color: 'text-sage-600',   label: 'Post publié' },
  'post.scheduled':  { icon: Calendar,   color: 'text-gold-600',   label: 'Post planifié' },
  'account.connected': { icon: Link,     color: 'text-purple-500', label: 'Compte connecté' },
  'user.created':    { icon: UserCheck,  color: 'text-sage-600',   label: 'Utilisateur créé' },
  'user.disabled':   { icon: UserX,      color: 'text-[#B07060]',  label: 'Désactivé' },
  'user.enabled':    { icon: UserCheck,  color: 'text-sage-600',   label: 'Réactivé' },
  'user.deleted':    { icon: Trash2,     color: 'text-red-500',    label: 'Supprimé' },
  'invite.created':  { icon: Shield,     color: 'text-blue-500',   label: 'Invitation créée' },
  'password.changed':{ icon: Key,        color: 'text-warm-600',   label: 'Mot de passe modifié' },
}

export default function AdminAudit({ addToast }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/audit?limit=200')
      if (!r.ok) throw new Error((await r.json()).error)
      setEntries(await r.json())
    } catch (e) { addToast(e.message, 'error') }
    finally { setLoading(false) }
  }

  return (
    <div className="p-4 md:p-6 md:pt-10 pb-24 md:pb-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-warm-700 mb-1">Journal d'activité</h2>
            <p className="text-sm text-warm-500">{entries.length} entrée{entries.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={load} disabled={loading} className="text-warm-500 hover:text-warm-600 p-2 transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {entries.length === 0 && !loading ? (
          <p className="text-center text-warm-400 text-sm py-16">Aucune activité enregistrée</p>
        ) : (
          <div className="space-y-1.5">
            {entries.map((e, i) => {
              const cfg = ACTION_CONFIG[e.action] || { icon: FileText, color: 'text-warm-500', label: e.action }
              const Icon = cfg.icon
              return (
                <div key={i} className="flex items-center gap-3 bg-cream border border-warm-200 rounded-xl px-4 py-3">
                  <Icon size={14} className={`${cfg.color} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-warm-700">{cfg.label}</span>
                    {e.email && <span className="text-xs text-warm-400 ml-1.5">· {e.email}</span>}
                    {e.platforms && <span className="text-xs text-warm-400 ml-1.5">· {e.platforms.join(', ')}</span>}
                    {e.targetId && e.email && <span className="text-xs text-warm-400 ml-1.5">· {e.email}</span>}
                  </div>
                  <span className="text-[10px] text-warm-400 flex-shrink-0">
                    {format(new Date(e.ts * 1000), 'dd MMM HH:mm', { locale: fr })}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
