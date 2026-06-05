'use client'
import { useState, useEffect } from 'react'
import { Trash2, ExternalLink, CheckCircle, Loader2, AlertCircle, Settings, Plus, ChevronRight, Eye, EyeOff } from 'lucide-react'

// Approximate token TTL by platform (days)
const TOKEN_TTL_DAYS = { facebook: 60, instagram: 60, linkedin: 60, tiktok: 30, threads: 180, pinterest: 60, mastodon: 3650, telegram: 36500, bluesky: 3650 }
function daysUntilExpiry(account) {
  const ttl = (TOKEN_TTL_DAYS[account.platform] || 60) * 24 * 60 * 60
  const obtainedAt = account.updated_at || account.created_at || 0
  const daysLeft = Math.floor((obtainedAt + ttl - Math.floor(Date.now() / 1000)) / 86400)
  return daysLeft <= 10 ? daysLeft : null
}

// ─── OAuth platforms (need app keys configured) ──────────────────────────────
const PLATFORMS = [
  {
    id: 'meta', label: 'Facebook & Instagram', emoji: '📘',
    description: 'Connecte une Page Facebook et le compte Instagram Business lié.',
    color: 'from-blue-600 to-indigo-600',
    configKeys: ['meta_app_id', 'meta_app_secret'],
    setupUrl: 'https://developers.facebook.com/apps/',
    setupSteps: [
      'Va sur developers.facebook.com et crée une App (type "Business")',
      'Active les produits "Facebook Login" et "Instagram Graph API"',
      'Dans Paramètres > Basique, copie l\'App ID et l\'App Secret',
      'Ajoute https://social-poster-web.vercel.app/api/oauth/callback comme URI de redirection',
    ],
  },
  {
    id: 'instagram', label: 'Instagram (compte séparé)', emoji: '📸',
    description: 'Connecte un compte Instagram Business indépendamment de Facebook.',
    color: 'from-purple-500 to-pink-500',
    configKeys: ['meta_app_id', 'meta_app_secret'],
    setupUrl: 'https://developers.facebook.com/apps/',
    setupSteps: [
      'Ton compte Instagram doit être un compte Professionnel (Business ou Créateur)',
      'Il doit être lié à une Page Facebook',
      'Utilise les mêmes identifiants Meta que pour Facebook & Instagram',
    ],
  },
  {
    id: 'linkedin', label: 'LinkedIn', emoji: '💼',
    description: 'Publie sur ton profil ou ta page entreprise.',
    color: 'from-blue-700 to-blue-900',
    configKeys: ['linkedin_client_id', 'linkedin_client_secret'],
    setupUrl: 'https://www.linkedin.com/developers/apps/new',
    setupSteps: [
      'Va sur linkedin.com/developers et crée une app',
      'Active les produits "Share on LinkedIn" et "Sign In with LinkedIn"',
      'Copie le Client ID et le Client Secret',
      'Dans Auth > Redirect URLs, ajoute https://social-poster-web.vercel.app/api/oauth/callback',
    ],
  },
  {
    id: 'threads', label: 'Threads', emoji: '🧵',
    description: 'Publie des posts texte sur Threads (Meta).',
    color: 'from-gray-700 to-gray-900',
    configKeys: ['threads_app_id', 'threads_app_secret'],
    setupUrl: 'https://developers.facebook.com/apps/',
    setupSteps: [
      'Va sur developers.facebook.com et crée une App (type "Business")',
      'Ajoute le produit "Threads API"',
      'Dans Threads API > Configuration, ajoute https://social-poster-web.vercel.app/api/oauth/callback',
      'Récupère le Threads App ID et Threads App Secret depuis Paramètres > Basique',
    ],
  },
  {
    id: 'tiktok', label: 'TikTok', emoji: '🎵',
    description: 'Publie des vidéos et images sur TikTok.',
    color: 'from-gray-800 to-black',
    configKeys: ['tiktok_client_key', 'tiktok_client_secret'],
    setupUrl: 'https://developers.tiktok.com/apps/',
    setupSteps: [
      'Va sur developers.tiktok.com et crée une app',
      'Active le produit "Content Posting API"',
      'Copie le Client Key et le Client Secret',
      'Ajoute https://social-poster-web.vercel.app/api/oauth/callback comme Redirect URI',
    ],
  },
  {
    id: 'pinterest', label: 'Pinterest', emoji: '📌',
    description: 'Crée des Pins sur ton tableau Pinterest. Image requise.',
    color: 'from-red-600 to-red-800',
    configKeys: ['pinterest_app_id', 'pinterest_app_secret'],
    setupUrl: 'https://developers.pinterest.com/',
    setupSteps: [
      'Va sur developers.pinterest.com et crée une app',
      'Dans App Settings, copie l\'App ID et l\'App Secret',
      'Ajoute https://social-poster-web.vercel.app/api/oauth/callback comme Redirect URI',
      'Active les scopes : boards:read, pins:write, user_accounts:read',
    ],
  },
  {
    id: 'mastodon', label: 'Mastodon', emoji: '🐘',
    description: 'Publie sur n\'importe quelle instance Mastodon.',
    color: 'from-purple-600 to-purple-900',
    configKeys: [],
    needsInstance: true,
    setupUrl: 'https://joinmastodon.org/servers',
    setupSteps: [
      'Entre l\'URL de ton instance (ex: mastodon.social, piaille.fr)',
      'Tu seras redirigé vers ton instance pour autoriser l\'accès',
      'Aucune configuration développeur requise — Social Poster s\'enregistre automatiquement',
    ],
  },
]

// ─── Direct-connect platforms (no OAuth, no app keys) ───────────────────────
const MANUAL_PLATFORMS = [
  {
    id: 'telegram', label: 'Telegram', emoji: '✈️',
    description: 'Publie sur une chaîne ou un groupe Telegram via un bot.',
    color: 'from-blue-400 to-blue-600',
    setupUrl: 'https://t.me/BotFather',
    setupSteps: [
      'Ouvre @BotFather sur Telegram et tape /newbot',
      'Choisis un nom et un username pour ton bot → copie le token',
      'Ajoute le bot comme admin de ta chaîne',
      'Récupère l\'ID de la chaîne (ex: @machaîne ou -1001234567890)',
    ],
    fields: [
      { key: 'botToken', label: 'Token du bot', placeholder: '1234567890:ABCdefGhIjKlMnOpQrStUvWxYz', secret: true },
      { key: 'chatId', label: 'ID de la chaîne', placeholder: '@machaîne ou -1001234567890' },
    ],
    endpoint: '/api/accounts/telegram',
    bodyMap: (f) => ({ botToken: f.botToken, chatId: f.chatId }),
  },
  {
    id: 'bluesky', label: 'Bluesky', emoji: '🦋',
    description: 'Publie sur Bluesky avec un App Password (pas ton vrai mot de passe).',
    color: 'from-sky-400 to-blue-500',
    setupUrl: 'https://bsky.app/settings/app-passwords',
    setupSteps: [
      'Va sur bsky.app → Settings → Privacy and Security → App Passwords',
      'Clique "Add App Password", donne-lui un nom (ex: "Social Poster")',
      'Copie le mot de passe généré (format: xxxx-xxxx-xxxx-xxxx)',
      'Entre ton handle Bluesky (ex: username.bsky.social)',
    ],
    fields: [
      { key: 'handle', label: 'Handle Bluesky', placeholder: 'username.bsky.social' },
      { key: 'appPassword', label: 'App Password', placeholder: 'xxxx-xxxx-xxxx-xxxx', secret: true },
    ],
    endpoint: '/api/accounts/bluesky',
    bodyMap: (f) => ({ handle: f.handle, appPassword: f.appPassword }),
  },
]

const ACCOUNT_DISPLAY = {
  facebook:  { emoji: '📘', label: 'Facebook',  bg: 'bg-blue-600' },
  instagram: { emoji: '📸', label: 'Instagram', bg: 'bg-gradient-to-br from-purple-500 to-pink-500' },
  linkedin:  { emoji: '💼', label: 'LinkedIn',  bg: 'bg-blue-700' },
  tiktok:    { emoji: '🎵', label: 'TikTok',    bg: 'bg-gray-800' },
  threads:   { emoji: '🧵', label: 'Threads',   bg: 'bg-gray-900' },
  pinterest: { emoji: '📌', label: 'Pinterest', bg: 'bg-red-600' },
  mastodon:  { emoji: '🐘', label: 'Mastodon',  bg: 'bg-purple-700' },
  telegram:  { emoji: '✈️', label: 'Telegram',  bg: 'bg-blue-400' },
  bluesky:   { emoji: '🦋', label: 'Bluesky',   bg: 'bg-sky-500' },
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Accounts({ accounts, reloadAccounts, addToast, metaSession, setMetaSession }) {
  const [config, setConfig]         = useState({})
  const [connecting, setConnecting] = useState(null)
  const [setupFor, setSetupFor]     = useState(null)
  const [metaPages, setMetaPages]   = useState(null)
  const [instagramOnly, setInstagramOnly] = useState(false)
  const [manualIgId, setManualIgId] = useState('')
  const [saving, setSaving]         = useState(false)
  const [formKeys, setFormKeys]     = useState({})
  const [mastodonInstance, setMastodonInstance] = useState('')
  const [manualForms, setManualForms] = useState({}) // { telegram: {botToken, chatId}, bluesky: {handle, appPassword} }
  const [showSecrets, setShowSecrets] = useState({})
  const [openManual, setOpenManual] = useState(null)

  useEffect(() => {
    window.api?.getConfig().then(c => { setConfig(c || {}); setFormKeys(c || {}) })
  }, [])

  function isConfigured(platform) {
    const cfg = PLATFORMS.find(p => p.id === platform)
    if (!cfg?.configKeys?.length) return true
    return cfg.configKeys.every(k => config[k]?.trim())
  }

  async function saveKeys(platformId) {
    setSaving(true)
    try {
      const updated = await window.api.setConfig(formKeys)
      setConfig(updated)
      addToast('Clés enregistrées !', 'success')
      setSetupFor(null)
    } finally { setSaving(false) }
  }

  useEffect(() => {
    if (metaSession && !metaPages) {
      setMetaPages({ pages: metaSession.pages, token: metaSession.token })
      setInstagramOnly(!!metaSession.instagramOnly)
    }
  }, [metaSession])

  async function handleConnect(platformId, extra = {}) {
    if (!isConfigured(platformId)) { setSetupFor(platformId); return }
    setConnecting(platformId)
    setMetaPages(null)
    try {
      const res = await window.api.startOAuth({ platform: platformId, ...extra })
      if (res.error) addToast(res.error, 'error')
    } catch (err) { addToast(err.message, 'error') }
    finally { setConnecting(null) }
  }

  async function handleSelectPage(page) {
    setConnecting('meta')
    try {
      const res = await window.api.addMetaPage({ page })
      if (res.error) { addToast(res.error, 'error'); return }
      addToast(res.instagramId ? 'Facebook + Instagram connectés !' : 'Page Facebook connectée !', 'success')
      setMetaPages(null); setInstagramOnly(false)
      if (setMetaSession) setMetaSession(null)
      reloadAccounts()
    } catch (err) { addToast(err.message, 'error') }
    finally { setConnecting(null) }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Déconnecter "${name}" ?`)) return
    await window.api.deleteAccount(id)
    addToast('Compte déconnecté', 'success')
    reloadAccounts()
  }

  async function handleManualConnect(platform) {
    const cfg = MANUAL_PLATFORMS.find(p => p.id === platform)
    if (!cfg) return
    const fields = manualForms[platform] || {}
    const missing = cfg.fields.find(f => !fields[f.key]?.trim())
    if (missing) { addToast(`${missing.label} requis`, 'error'); return }
    setConnecting(platform)
    try {
      const r = await fetch(cfg.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg.bodyMap(fields)),
      })
      const data = await r.json()
      if (!r.ok) { addToast(data.error, 'error'); return }
      addToast(`${cfg.label} connecté — ${data.name}`, 'success')
      setManualForms(prev => ({ ...prev, [platform]: {} }))
      setOpenManual(null)
      reloadAccounts()
    } catch (err) { addToast(err.message, 'error') }
    finally { setConnecting(null) }
  }

  return (
    <div className="p-4 md:p-6 md:pt-10 pb-24 md:pb-10">
      <div className="max-w-2xl mx-auto space-y-8">

        <div>
          <h2 className="text-xl font-bold text-warm-700 mb-1">Comptes connectés</h2>
          <p className="text-sm text-warm-500">Connecte tes plateformes pour publier en un clic</p>
        </div>

        {/* ── Connected accounts ── */}
        {accounts.length > 0 && (
          <section>
            <p className="text-xs text-warm-500 uppercase tracking-wider font-semibold mb-3">Comptes actifs</p>
            <div className="space-y-2">
              {accounts.map(account => {
                const d = ACCOUNT_DISPLAY[account.platform] || { emoji: '🌐', label: account.platform, bg: 'bg-gray-700' }
                return (
                  <div key={account.id} className="flex items-center gap-4 p-4 bg-cream border border-warm-200 rounded-xl">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${d.bg}`}>
                      {account.avatar
                        ? <img src={account.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                        : d.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-warm-700 truncate">{account.name}</p>
                        {(() => { const exp = daysUntilExpiry(account); return exp !== null && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${exp <= 3 ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'}`}>
                            {exp <= 0 ? 'Expiré' : `Expire dans ${exp}j`}
                          </span>
                        )})()}
                      </div>
                      <p className="text-xs text-warm-500 flex items-center gap-1.5">
                        <CheckCircle size={11} className="text-sage-600" />
                        {d.label}{account.username && ` · @${account.username}`}
                        {account.pinterest_board_name && ` · 📌 ${account.pinterest_board_name}`}
                        {account.mastodon_instance && ` · @${account.mastodon_instance}`}
                      </p>
                    </div>
                    <button onClick={() => handleDelete(account.id, account.name)}
                      className="text-warm-400 hover:text-[#B07060] transition-colors p-1.5" title="Déconnecter">
                      <Trash2 size={15} />
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Meta page selector ── */}
        {metaPages && (
          <section className="bg-cream border border-sage-300 rounded-xl p-5">
            <p className="text-sm font-semibold text-warm-700 mb-1">
              {instagramOnly ? 'Sélectionne le compte Instagram' : 'Sélectionne ta Page Facebook'}
            </p>
            <p className="text-xs text-warm-500 mb-4">
              {instagramOnly ? 'Seules les pages avec un compte Instagram Business sont affichées.' : 'Le compte Instagram Business lié sera aussi connecté automatiquement.'}
            </p>
            <div className="space-y-2">
              {metaPages.pages.length === 0 && (
                <p className="text-sm text-gold-600 flex items-center gap-2"><AlertCircle size={14} />Aucune page trouvée.</p>
              )}
              {metaPages.pages.map(page => (
                <div key={page.id} className="space-y-2">
                  <button onClick={() => handleSelectPage({ ...page, instagram_business_account: page.instagram_business_account || (manualIgId ? { id: manualIgId, username: manualIgId } : null) })}
                    disabled={connecting === 'meta'}
                    className="w-full flex items-center gap-3 p-3 bg-warm-50 hover:bg-warm-100 border border-warm-200 rounded-xl text-left transition-colors disabled:opacity-50">
                    <span className="text-2xl">📘</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-warm-700">{page.name}</p>
                      {page.instagram_business_account
                        ? <p className="text-xs text-purple-400">📸 Instagram lié : @{page.instagram_business_account.username}</p>
                        : <p className="text-xs text-warm-500">Pas de compte Instagram Business détecté</p>}
                    </div>
                    {connecting === 'meta' ? <Loader2 size={16} className="animate-spin text-warm-500" /> : <ChevronRight size={16} className="text-warm-500" />}
                  </button>
                  {!page.instagram_business_account && (
                    <div className="pl-1 space-y-1.5">
                      <p className="text-xs text-warm-500">📸 ID Instagram Business (facultatif) :</p>
                      <div className="flex gap-2">
                        <input type="text" value={manualIgId} onChange={e => setManualIgId(e.target.value)} placeholder="ex: 17841234567890"
                          className="flex-1 bg-warm-50 border border-warm-200 rounded-lg px-3 py-1.5 text-xs text-warm-700 placeholder-warm-400 outline-none focus:border-purple-500/50" />
                        <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer"
                          className="text-xs text-sage-600 hover:text-sage-700 flex items-center gap-1 px-2 border border-sage-300 rounded-lg">
                          <ExternalLink size={10}/> Trouver
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => setMetaPages(null)} className="mt-3 text-xs text-warm-400 hover:text-warm-500">Annuler</button>
          </section>
        )}

        {/* ── OAuth platforms ── */}
        <section>
          <p className="text-xs text-warm-500 uppercase tracking-wider font-semibold mb-3">Connexion OAuth</p>
          <div className="space-y-3">
            {PLATFORMS.map(({ id, label, emoji, description, color, configKeys, setupUrl, setupSteps, needsInstance }) => {
              const configured = isConfigured(id)
              const isConnecting = connecting === id
              const showSetup = setupFor === id

              return (
                <div key={id} className={`bg-cream border rounded-xl overflow-hidden transition-all ${showSetup ? 'border-gold-400' : 'border-warm-200'}`}>
                  <div className="flex items-center gap-4 p-4">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-xl flex-shrink-0 shadow-md`}>
                      {emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-warm-700">{label}</p>
                      <p className="text-xs text-warm-500 truncate">{description}</p>
                    </div>

                    {configured ? (
                      needsInstance ? (
                        <button onClick={() => setSetupFor(showSetup ? null : id)}
                          className="flex items-center gap-2 px-4 py-2 bg-sage-600 hover:bg-sage-500 text-warm-700 text-xs font-semibold rounded-lg transition-colors flex-shrink-0">
                          <Plus size={13} /> Connecter
                        </button>
                      ) : (
                        <button onClick={() => handleConnect(id)} disabled={isConnecting || !!metaPages}
                          className="flex items-center gap-2 px-4 py-2 bg-sage-600 hover:bg-sage-500 disabled:opacity-50 text-warm-700 text-xs font-semibold rounded-lg transition-colors flex-shrink-0">
                          {isConnecting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                          {isConnecting ? 'Connexion…' : 'Connecter'}
                        </button>
                      )
                    ) : (
                      <button onClick={() => setSetupFor(showSetup ? null : id)}
                        className="flex items-center gap-2 px-3 py-2 border border-gold-500 text-gold-600 hover:bg-gold-300/30 text-xs font-medium rounded-lg transition-colors flex-shrink-0">
                        <Settings size={13} />
                        {showSetup ? 'Fermer' : 'Configurer'}
                      </button>
                    )}
                  </div>

                  {showSetup && (
                    <div className="border-t border-warm-100 px-5 pb-5 pt-4 space-y-4">
                      <div className="flex items-start gap-2 p-3 bg-gold-300/30 border border-gold-300 rounded-lg">
                        <AlertCircle size={14} className="text-gold-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-gold-600">
                          {needsInstance ? 'Entre l\'URL de ton instance Mastodon pour te connecter.' : 'Configuration unique — 5 min. Tu crées une app développeur sur la plateforme.'}
                        </p>
                      </div>

                      <ol className="space-y-1.5">
                        {setupSteps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-xs text-warm-500">
                            <span className="w-5 h-5 rounded-full bg-warm-100 text-warm-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                            {step}
                          </li>
                        ))}
                      </ol>

                      <a href={setupUrl} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-sage-600 hover:text-sage-700 font-medium">
                        {needsInstance ? 'Trouver une instance' : 'Ouvrir le portail développeur'} <ExternalLink size={11} />
                      </a>

                      {needsInstance ? (
                        <div className="space-y-3 pt-1">
                          <div>
                            <label className="block text-xs text-warm-500 mb-1 font-medium">URL de l'instance</label>
                            <input type="text" value={mastodonInstance} onChange={e => setMastodonInstance(e.target.value)}
                              placeholder="mastodon.social" onKeyDown={e => e.key === 'Enter' && mastodonInstance && handleConnect('mastodon', { instanceUrl: mastodonInstance })}
                              className="w-full bg-warm-50 border border-warm-200 rounded-lg px-3 py-2 text-sm text-warm-700 placeholder-warm-300 outline-none focus:border-sage-500" />
                          </div>
                          <button onClick={() => handleConnect('mastodon', { instanceUrl: mastodonInstance })} disabled={!mastodonInstance || isConnecting}
                            className="flex items-center gap-2 px-4 py-2 bg-sage-600 hover:bg-sage-500 disabled:opacity-50 text-warm-700 text-xs font-semibold rounded-lg transition-colors">
                            {isConnecting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                            {isConnecting ? 'Connexion…' : 'Se connecter sur Mastodon'}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2 pt-1">
                          {configKeys.map(key => (
                            <div key={key}>
                              <label className="block text-xs text-warm-500 mb-1 font-medium">
                                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </label>
                              <input type="text" value={formKeys[key] || ''} onChange={e => setFormKeys(prev => ({ ...prev, [key]: e.target.value }))}
                                placeholder={key.includes('secret') ? '••••••••••••' : 'Colle la valeur ici…'}
                                className="w-full bg-warm-50 border border-warm-200 rounded-lg px-3 py-2 text-sm text-warm-700 placeholder-warm-300 outline-none focus:border-sage-500" />
                            </div>
                          ))}
                          <button onClick={() => saveKeys(id)} disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-sage-600 hover:bg-sage-500 disabled:opacity-50 text-warm-700 text-xs font-semibold rounded-lg transition-colors">
                            {saving ? <Loader2 size={13} className="animate-spin" /> : null}
                            Enregistrer et continuer
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Direct connect (no OAuth) ── */}
        <section>
          <p className="text-xs text-warm-500 uppercase tracking-wider font-semibold mb-3">Connexion directe</p>
          <div className="space-y-3">
            {MANUAL_PLATFORMS.map(({ id, label, emoji, description, color, setupUrl, setupSteps, fields }) => {
              const isOpen = openManual === id
              const isConnecting = connecting === id
              const form = manualForms[id] || {}

              return (
                <div key={id} className={`bg-cream border rounded-xl overflow-hidden ${isOpen ? 'border-sage-300' : 'border-warm-200'}`}>
                  <div className="flex items-center gap-4 p-4">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-xl flex-shrink-0 shadow-md`}>
                      {emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-warm-700">{label}</p>
                      <p className="text-xs text-warm-500 truncate">{description}</p>
                    </div>
                    <button onClick={() => setOpenManual(isOpen ? null : id)}
                      className="flex items-center gap-2 px-4 py-2 bg-sage-600 hover:bg-sage-500 text-warm-700 text-xs font-semibold rounded-lg transition-colors flex-shrink-0">
                      <Plus size={13} /> Connecter
                    </button>
                  </div>

                  {isOpen && (
                    <div className="border-t border-warm-100 px-5 pb-5 pt-4 space-y-4">
                      <ol className="space-y-1.5">
                        {setupSteps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-xs text-warm-500">
                            <span className="w-5 h-5 rounded-full bg-warm-100 text-warm-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                            {step}
                          </li>
                        ))}
                      </ol>
                      <a href={setupUrl} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-sage-600 hover:text-sage-700 font-medium">
                        Ouvrir <ExternalLink size={11} />
                      </a>
                      <div className="space-y-3 pt-1">
                        {fields.map(({ key, label: fLabel, placeholder, secret }) => (
                          <div key={key}>
                            <label className="block text-xs text-warm-500 mb-1 font-medium">{fLabel}</label>
                            <div className="relative">
                              <input
                                type={secret && !showSecrets[`${id}_${key}`] ? 'password' : 'text'}
                                value={form[key] || ''}
                                onChange={e => setManualForms(prev => ({ ...prev, [id]: { ...prev[id], [key]: e.target.value } }))}
                                placeholder={placeholder}
                                className="w-full bg-warm-50 border border-warm-200 rounded-lg px-3 py-2 text-sm text-warm-700 placeholder-warm-300 outline-none focus:border-sage-500 pr-10"
                              />
                              {secret && (
                                <button type="button" onClick={() => setShowSecrets(p => ({ ...p, [`${id}_${key}`]: !p[`${id}_${key}`] }))}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600">
                                  {showSecrets[`${id}_${key}`] ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        <button onClick={() => handleManualConnect(id)} disabled={isConnecting}
                          className="flex items-center gap-2 px-4 py-2 bg-sage-600 hover:bg-sage-500 disabled:opacity-50 text-warm-700 text-xs font-semibold rounded-lg transition-colors">
                          {isConnecting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                          {isConnecting ? 'Connexion…' : `Connecter ${label}`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Redirect URI reminder */}
        <div className="flex items-start gap-3 p-4 bg-warm-50 border border-warm-200 rounded-xl">
          <AlertCircle size={14} className="text-warm-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-warm-400 space-y-1">
            <p className="font-medium text-warm-500">URI de redirection OAuth (à ajouter sur chaque portail)</p>
            <code className="text-sage-600 select-all">https://social-poster-web.vercel.app/api/oauth/callback</code>
          </div>
        </div>

      </div>
    </div>
  )
}
