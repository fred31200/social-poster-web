'use client'
import { useState, useEffect } from 'react'
import { Users, FileText, Link, Sparkles, RefreshCw, TrendingUp, ShieldAlert } from 'lucide-react'

function StatCard({ icon: Icon, label, value, sub, color = 'text-warm-700' }) {
  return (
    <div className="bg-cream border border-warm-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={15} className="text-warm-400" />
        <p className="text-xs text-warm-500 font-medium">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-warm-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function AdminStats({ addToast }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/stats')
      if (!r.ok) throw new Error((await r.json()).error)
      setStats(await r.json())
    } catch (e) { addToast(e.message, 'error') }
    finally { setLoading(false) }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center p-10">
      <RefreshCw size={20} className="animate-spin text-warm-400" />
    </div>
  )
  if (!stats) return null

  return (
    <div className="p-4 md:p-6 md:pt-10 pb-24 md:pb-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-warm-700">Statistiques</h2>
          <button onClick={load} className="text-warm-500 hover:text-warm-600 p-2 transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Users */}
        <p className="text-xs font-semibold text-warm-400 uppercase tracking-wider mb-3">Utilisateurs</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <StatCard icon={Users} label="Total" value={stats.users.total} sub={`${stats.users.active} actif${stats.users.active !== 1 ? 's' : ''}`} />
          <StatCard icon={Link} label="Comptes connectés" value={stats.users.withAccounts} sub="ont ≥1 réseau" />
          <StatCard icon={Sparkles} label="IA activée" value={stats.users.aiEnabled} sub={`${stats.users.withOwnKey} clé perso`} color="text-sage-700" />
          {stats.users.disabled > 0 && (
            <StatCard icon={ShieldAlert} label="Désactivés" value={stats.users.disabled} color="text-[#B07060]" />
          )}
        </div>

        {/* Posts */}
        <p className="text-xs font-semibold text-warm-400 uppercase tracking-wider mb-3">Publications</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard icon={FileText} label="Total publié" value={stats.posts.total} />
          <StatCard icon={TrendingUp} label="Cette semaine" value={stats.posts.thisWeek} color="text-sage-700" />
        </div>

        {/* Accounts */}
        <p className="text-xs font-semibold text-warm-400 uppercase tracking-wider mb-3">Réseaux sociaux</p>
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Link} label="Comptes total" value={stats.accounts.total} sub="tous users confondus" />
        </div>
      </div>
    </div>
  )
}
