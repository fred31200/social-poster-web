'use client'
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

const STYLES = {
  success: { bg: 'bg-emerald-500/20 border-emerald-500/40', icon: CheckCircle, iconColor: 'text-sage-600', text: 'text-emerald-100' },
  error: { bg: 'bg-red-500/20 border-red-500/40', icon: XCircle, iconColor: 'text-[#B07060]', text: 'text-red-100' },
  warning: { bg: 'bg-amber-500/20 border-gold-500', icon: AlertTriangle, iconColor: 'text-gold-600', text: 'text-amber-100' },
}

export default function Toast({ message, type = 'success' }) {
  const s = STYLES[type] || STYLES.success
  const Icon = s.icon
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm shadow-xl ${s.bg} animate-fade-in`}>
      <Icon size={18} className={s.iconColor} />
      <span className={`text-sm font-medium ${s.text}`}>{message}</span>
    </div>
  )
}
