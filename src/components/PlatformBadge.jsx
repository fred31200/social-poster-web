'use client'
import { CheckCircle, XCircle, Clock, Loader } from 'lucide-react'

const PLATFORM_INFO = {
  instagram: { label: 'Instagram', color: 'from-purple-500 to-pink-500', emoji: '📸' },
  facebook: { label: 'Facebook', color: 'from-blue-600 to-blue-700', emoji: '📘' },
  linkedin: { label: 'LinkedIn', color: 'from-blue-700 to-blue-800', emoji: '💼' },
  tiktok: { label: 'TikTok', color: 'from-gray-800 to-black', emoji: '🎵' },
}

const STATUS_ICONS = {
  published: <CheckCircle size={12} className="text-sage-600" />,
  failed: <XCircle size={12} className="text-[#B07060]" />,
  pending: <Clock size={12} className="text-gold-600" />,
  publishing: <Loader size={12} className="text-blue-400 animate-spin" />,
}

export default function PlatformBadge({ platform, status }) {
  const info = PLATFORM_INFO[platform] || { label: platform, color: 'from-gray-600 to-gray-700', emoji: '🌐' }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${info.color} text-warm-700`}>
      <span>{info.emoji}</span>
      <span>{info.label}</span>
      {status && STATUS_ICONS[status]}
    </span>
  )
}
