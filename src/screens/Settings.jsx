'use client'
import { useState, useEffect } from 'react'
import { Save, Eye, EyeOff, ExternalLink, Info } from 'lucide-react'

const FIELDS = [
  {
    section: 'Meta (Facebook + Instagram)',
    emoji: '📘',
    link: 'https://developers.facebook.com/apps/',
    linkLabel: 'Créer une app Meta',
    fields: [
      { key: 'meta_app_id', label: 'App ID', placeholder: '123456789012345' },
      { key: 'meta_app_secret', label: 'App Secret', placeholder: 'abcdef1234...', secret: true },
    ]
  },
  {
    section: 'LinkedIn',
    emoji: '💼',
    link: 'https://www.linkedin.com/developers/apps/new',
    linkLabel: 'Créer une app LinkedIn',
    fields: [
      { key: 'linkedin_client_id', label: 'Client ID', placeholder: '86xyz...' },
      { key: 'linkedin_client_secret', label: 'Client Secret', placeholder: 'abcd1234...', secret: true },
    ]
  },
  {
    section: 'TikTok',
    emoji: '🎵',
    link: 'https://developers.tiktok.com/apps/',
    linkLabel: 'Créer une app TikTok',
    fields: [
      { key: 'tiktok_client_key', label: 'Client Key', placeholder: 'aw1234...' },
      { key: 'tiktok_client_secret', label: 'Client Secret', placeholder: 'xyz789...', secret: true },
    ]
  },
  {
    section: 'Threads',
    emoji: '🧵',
    link: 'https://developers.facebook.com/apps/',
    linkLabel: 'Créer une app Threads (Meta)',
    fields: [
      { key: 'threads_app_id', label: 'Threads App ID', placeholder: '1234567890' },
      { key: 'threads_app_secret', label: 'Threads App Secret', placeholder: 'abcdef...', secret: true },
    ]
  },
]

export default function Settings({ addToast }) {
  const [config, setConfig] = useState({})
  const [showSecrets, setShowSecrets] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (window.api) window.api.getConfig().then(c => setConfig(c || {}))
  }, [])

  function handleChange(key, val) {
    setConfig(prev => ({ ...prev, [key]: val }))
  }

  function toggleSecret(key) {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await window.api.setConfig(config)
      addToast('Réglages sauvegardés !', 'success')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-6 md:pt-10 pb-24 md:pb-10">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-warm-700 mb-1">Réglages API</h2>
        <p className="text-sm text-warm-500 mb-6">Configure les clés API de chaque plateforme</p>

        <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-6">
          <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-300/80 space-y-1">
            <p className="font-semibold text-blue-300">Comment obtenir les clés API ?</p>
            <p>1. Crée une application développeur sur chaque plateforme (liens ci-dessous)</p>
            <p>2. Ajoute <strong>https://social-poster-app.local/callback</strong> comme URL de redirection OAuth</p>
            <p>3. Colle les clés ici et sauvegarde</p>
            <p>4. Va dans <strong>Comptes</strong> pour te connecter</p>
          </div>
        </div>

        <div className="space-y-6">
          {FIELDS.map(({ section, emoji, link, linkLabel, fields }) => (
            <div key={section} className="bg-cream border border-warm-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-warm-700 flex items-center gap-2">
                  <span>{emoji}</span> {section}
                </h3>
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-sage-600 hover:text-sage-700 transition-colors"
                >
                  {linkLabel} <ExternalLink size={11} />
                </a>
              </div>

              <div className="space-y-3">
                {fields.map(({ key, label, placeholder, secret }) => (
                  <div key={key}>
                    <label className="block text-xs text-warm-500 mb-1.5 font-medium">{label}</label>
                    <div className="relative">
                      <input
                        type={secret && !showSecrets[key] ? 'password' : 'text'}
                        value={config[key] || ''}
                        onChange={e => handleChange(key, e.target.value)}
                        placeholder={placeholder}
                        className="w-full bg-warm-50 border border-warm-200 rounded-lg px-3 py-2.5 text-sm text-warm-700 placeholder-warm-300 outline-none focus:border-sage-500 transition-colors pr-10"
                      />
                      {secret && (
                        <button
                          onClick={() => toggleSecret(key)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-500 transition-colors"
                        >
                          {showSecrets[key] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 flex items-center gap-2 px-6 py-3 bg-sage-600 hover:bg-sage-500 disabled:opacity-50 text-warm-700 text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-sage-500/20"
        >
          <Save size={16} />
          {saving ? 'Sauvegarde…' : 'Sauvegarder les réglages'}
        </button>
      </div>
    </div>
  )
}
