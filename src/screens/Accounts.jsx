'use client'
import { useState, useEffect } from 'react'
import { Trash2, ExternalLink, CheckCircle, Loader2, AlertCircle, Settings, RefreshCw, Plus, ChevronRight } from 'lucide-react'

// ─── Platform config ──────────────────────────────────────────────────────────
const PLATFORMS = [
  {
    id: 'meta',
    label: 'Facebook & Instagram',
    emoji: '📘',
    description: 'Connecte une Page Facebook et le compte Instagram Business lié.',
    color: 'from-blue-600 to-indigo-600',
    configKeys: ['meta_app_id', 'meta_app_secret'],
    setupUrl: 'https://developers.facebook.com/apps/',
    setupSteps: [
      'Va sur developers.facebook.com et crée une App (type "Business")',
      'Active les produits "Facebook Login" et "Instagram Graph API"',
      'Dans Paramètres > Basique, copie l\'App ID et l\'App Secret',
      'Dans Facebook Login > Paramètres, ajoute http://localhost:3000/api/oauth/callback comme URI de redirection valide',
    ],
  },
  {
    id: 'instagram',
    label: 'Instagram (compte séparé)',
    emoji: '📸',
    description: 'Connecte un compte Instagram Business indépendamment de Facebook.',
    color: 'from-purple-500 to-pink-500',
    configKeys: ['meta_app_id', 'meta_app_secret'],
    setupUrl: 'https://developers.facebook.com/apps/',
    setupSteps: [
      'Ton compte Instagram doit être un compte Professionnel (Business ou Créateur)',
      'Il doit être lié à une Page Facebook (même différente de ta page principale)',
      'Utilise les mêmes identifiants Meta que pour Facebook & Instagram',
    ],
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    emoji: '💼',
    description: 'Publie sur ton profil ou ta page entreprise.',
    color: 'from-blue-700 to-blue-900',
    configKeys: ['linkedin_client_id', 'linkedin_client_secret'],
    setupUrl: 'https://www.linkedin.com/developers/apps/new',
    setupSteps: [
      'Va sur linkedin.com/developers et crée une app',
      'Active les produits "Share on LinkedIn" et "Sign In with LinkedIn"',
      'Copie le Client ID et le Client Secret',
      'Dans Auth > Redirect URLs, ajoute http://localhost:3000/api/oauth/callback',
    ],
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    emoji: '🎵',
    description: 'Publie des vidéos et images sur TikTok.',
    color: 'from-gray-800 to-black',
    configKeys: ['tiktok_client_key', 'tiktok_client_secret'],
    setupUrl: 'https://developers.tiktok.com/apps/',
    setupSteps: [
      'Va sur developers.tiktok.com et crée une app',
      'Active le produit "Content Posting API"',
      'Copie le Client Key et le Client Secret',
      'Ajoute http://localhost:3000/api/oauth/callback comme Redirect URI',
    ],
  },
  {
    id: 'threads',
    label: 'Threads',
    emoji: '🧵',
    description: 'Publie des posts texte sur Threads (Meta).',
    color: 'from-gray-700 to-gray-900',
    configKeys: ['threads_app_id', 'threads_app_secret'],
    setupUrl: 'https://developers.facebook.com/apps/',
    setupSteps: [
      'Va sur developers.facebook.com et crée une nouvelle App (type "Business")',
      'Ajoute le produit "Threads API" (Use Case Threads)',
      'Dans Threads API > Configuration, ajoute http://localhost:3000/api/oauth/callback dans les Redirect Callback URLs',
      'Récupère le Threads App ID et Threads App Secret depuis Paramètres > Basique',
      'Pour le moment seuls les posts texte sont supportés (les médias requièrent une URL publique)',
    ],
  },
]

const ACCOUNT_DISPLAY = {
  facebook:  { emoji: '📘', label: 'Facebook',  bg: 'bg-blue-600' },
  instagram: { emoji: '📸', label: 'Instagram', bg: 'bg-gradient-to-br from-purple-500 to-pink-500' },
  linkedin:  { emoji: '💼', label: 'LinkedIn',  bg: 'bg-blue-700' },
  tiktok:    { emoji: '🎵', label: 'TikTok',    bg: 'bg-gray-800' },
  threads:   { emoji: '🧵', label: 'Threads',   bg: 'bg-gray-900' },
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Accounts({ accounts, reloadAccounts, addToast, metaSession, setMetaSession }) {
  const [config, setConfig]         = useState({})
  const [connecting, setConnecting] = useState(null)   // platform id being connected
  const [setupFor, setSetupFor]     = useState(null)   // platform showing setup guide
  const [metaPages, setMetaPages]   = useState(null)   // pages after meta oauth
  const [instagramOnly, setInstagramOnly] = useState(false)
  const [manualIgId, setManualIgId] = useState('')
  const [saving, setSaving]         = useState(false)
  const [formKeys, setFormKeys]     = useState({})     // temp input values for keys

  useEffect(() => {
    window.api?.getConfig().then(c => { setConfig(c || {}); setFormKeys(c || {}) })
  }, [])

  // ── helpers ──────────────────────────────────────────────────────────────────
  function isConfigured(platform) {
    const cfg = PLATFORMS.find(p => p.id === platform)
    return cfg?.configKeys.every(k => config[k]?.trim()) ?? false
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

  // Pick up Meta session from App.jsx (set after OAuth callback redirect)
  useEffect(() => {
    if (metaSession && !metaPages) {
      setMetaPages({ pages: metaSession.pages, token: metaSession.token })
      setInstagramOnly(!!metaSession.instagramOnly)
    }
  }, [metaSession])

  // ── OAuth connect — web flow: redirect the whole browser to the auth URL ──
  async function handleConnect(platformId) {
    if (!isConfigured(platformId)) { setSetupFor(platformId); return }

    setConnecting(platformId)
    setMetaPages(null)
    try {
      // This call now redirects window.location.href to the OAuth URL.
      // Control will return via /api/oauth/callback → / with ?oauth=... query.
      const res = await window.api.startOAuth({ platform: platformId })
      if (res.error) { addToast(res.error, 'error') }
      // No further code runs locally — the browser navigates away
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      // Note: in most cases we've navigated away by now, but reset just in case
      setConnecting(null)
    }
  }

  async function handleSelectPage(page) {
    setConnecting('meta')
    try {
      const res = await window.api.addMetaPage({ page })
      if (res.error) { addToast(res.error, 'error'); return }
      const label = res.instagramId ? 'Facebook + Instagram connectés !' : 'Page Facebook connectée !'
      addToast(label, 'success')
      setMetaPages(null)
      setInstagramOnly(false)
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

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 md:pt-10 pb-24 md:pb-10">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-warm-700 mb-1">Comptes connectés</h2>
          <p className="text-sm text-warm-500">Clique sur une plateforme pour te connecter avec tes identifiants</p>
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
                      <p className="text-sm font-semibold text-warm-700 truncate">{account.name}</p>
                      <p className="text-xs text-warm-500 flex items-center gap-1.5">
                        <CheckCircle size={11} className="text-sage-600" />
                        {d.label}{account.username && ` · @${account.username}`}
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


        {/* ── Page selector (Meta post-OAuth) ── */}
        {metaPages && (
          <section className="bg-cream border border-sage-300 rounded-xl p-5">
            <p className="text-sm font-semibold text-warm-700 mb-1">
              {instagramOnly ? 'Sélectionne le compte Instagram' : 'Sélectionne ta Page Facebook'}
            </p>
            <p className="text-xs text-warm-500 mb-4">
              {instagramOnly
                ? 'Seules les pages ayant un compte Instagram Business lié sont affichées.'
                : 'Le compte Instagram Business lié sera aussi connecté automatiquement.'}
            </p>
            <div className="space-y-2">
              {metaPages.pages.length === 0 && (
                <p className="text-sm text-gold-600 flex items-center gap-2">
                  <AlertCircle size={14} />
                  {instagramOnly
                    ? 'Aucun compte Instagram Business trouvé. Assure-toi que ton Instagram est un compte Pro lié à une Page Facebook.'
                    : 'Aucune Page Facebook trouvée. Assure-toi d\'être admin d\'une page.'}
                </p>
              )}
              {metaPages.pages.map(page => (
                <div key={page.id} className="space-y-2">
                  <button onClick={() => handleSelectPage({ ...page, instagram_business_account: page.instagram_business_account || (manualIgId ? { id: manualIgId, username: manualIgId } : null) })} disabled={connecting === 'meta'}
                    className="w-full flex items-center gap-3 p-3 bg-warm-50 hover:bg-warm-100 border border-warm-200 rounded-xl text-left transition-colors disabled:opacity-50">
                    <span className="text-2xl">📘</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-warm-700">{page.name}</p>
                      {page.instagram_business_account
                        ? <p className="text-xs text-purple-400">📸 Instagram lié : @{page.instagram_business_account.username}</p>
                        : <p className="text-xs text-warm-500">Pas de compte Instagram Business détecté automatiquement</p>}
                    </div>
                    {connecting === 'meta'
                      ? <Loader2 size={16} className="animate-spin text-warm-500" />
                      : <ChevronRight size={16} className="text-warm-500" />}
                  </button>
                  {!page.instagram_business_account && (
                    <div className="pl-1 space-y-1.5">
                      <p className="text-xs text-warm-500">📸 ID Instagram Business (facultatif) :</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={manualIgId}
                          onChange={e => setManualIgId(e.target.value)}
                          placeholder="ex: 17841234567890"
                          className="flex-1 bg-warm-50 border border-warm-200 rounded-lg px-3 py-1.5 text-xs text-warm-700 placeholder-warm-400 outline-none focus:border-purple-500/50"
                        />
                        <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer"
                          className="text-xs text-sage-600 hover:text-sage-700 flex items-center gap-1 px-2 border border-sage-300 rounded-lg">
                          <ExternalLink size={10}/> Trouver
                        </a>
                      </div>
                      <p className="text-[10px] text-warm-400">Dans l'API Explorer : génère un token avec <code>instagram_basic</code> → requête <code>/{page.id}?fields=instagram_business_account&#123;id&#125;</code></p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => setMetaPages(null)} className="mt-3 text-xs text-warm-400 hover:text-warm-500 transition-colors">
              Annuler
            </button>
          </section>
        )}

        {/* ── Platform connect buttons ── */}
        <section>
          <p className="text-xs text-warm-500 uppercase tracking-wider font-semibold mb-3">Ajouter un compte</p>
          <div className="space-y-3">
            {PLATFORMS.map(({ id, label, emoji, description, color, configKeys, setupUrl, setupSteps }) => {
              const configured = isConfigured(id)
              const isConnecting = connecting === id
              const showSetup = setupFor === id

              return (
                <div key={id} className={`bg-cream border rounded-xl overflow-hidden transition-all ${showSetup ? 'border-gold-400' : 'border-warm-200'}`}>

                  {/* Main row */}
                  <div className="flex items-center gap-4 p-4">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-xl flex-shrink-0 shadow-md`}>
                      {emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-warm-700">{label}</p>
                      <p className="text-xs text-warm-500 truncate">{description}</p>
                    </div>

                    {configured ? (
                      <button onClick={() => handleConnect(id)} disabled={isConnecting || !!metaPages}
                        className="flex items-center gap-2 px-4 py-2 bg-sage-600 hover:bg-sage-500 disabled:opacity-50 text-warm-700 text-xs font-semibold rounded-lg transition-colors flex-shrink-0">
                        {isConnecting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                        {isConnecting ? 'Connexion…' : 'Connecter'}
                      </button>
                    ) : (
                      <button onClick={() => setSetupFor(showSetup ? null : id)}
                        className="flex items-center gap-2 px-3 py-2 border border-gold-500 text-gold-600 hover:bg-gold-300/30 text-xs font-medium rounded-lg transition-colors flex-shrink-0">
                        <Settings size={13} />
                        {showSetup ? 'Fermer' : 'Configurer'}
                      </button>
                    )}
                  </div>

                  {/* Setup guide (collapsible) */}
                  {showSetup && (
                    <div className="border-t border-warm-100 px-5 pb-5 pt-4 space-y-4">
                      <div className="flex items-start gap-2 p-3 bg-gold-300/30 border border-gold-300 rounded-lg">
                        <AlertCircle size={14} className="text-gold-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-gold-600/80 space-y-1">
                          <p className="font-semibold text-gold-600">Configuration unique — 5 min</p>
                          <p>Tu crées une "app développeur" sur la plateforme pour que Social Poster puisse se connecter en ton nom. À faire une seule fois.</p>
                        </div>
                      </div>

                      {/* Steps */}
                      <ol className="space-y-1.5">
                        {setupSteps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-xs text-warm-500">
                            <span className="w-5 h-5 rounded-full bg-warm-100 text-warm-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                            {step}
                          </li>
                        ))}
                      </ol>

                      <a href={setupUrl} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-sage-600 hover:text-sage-700 transition-colors font-medium">
                        Ouvrir le portail développeur <ExternalLink size={11} />
                      </a>

                      {/* Key inputs */}
                      <div className="space-y-2 pt-1">
                        {configKeys.map(key => (
                          <div key={key}>
                            <label className="block text-xs text-warm-500 mb-1 font-medium">
                              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </label>
                            <input
                              type="text"
                              value={formKeys[key] || ''}
                              onChange={e => setFormKeys(prev => ({ ...prev, [key]: e.target.value }))}
                              placeholder={key.includes('secret') ? '••••••••••••' : 'Colle la valeur ici…'}
                              className="w-full bg-warm-50 border border-warm-200 rounded-lg px-3 py-2 text-sm text-warm-700 placeholder-warm-300 outline-none focus:border-sage-500 transition-colors"
                            />
                          </div>
                        ))}
                      </div>

                      <button onClick={() => saveKeys(id)} disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-sage-600 hover:bg-sage-500 disabled:opacity-50 text-warm-700 text-xs font-semibold rounded-lg transition-colors">
                        {saving ? <Loader2 size={13} className="animate-spin" /> : null}
                        Enregistrer et continuer
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Redirect URI reminder */}
        <div className="flex items-start gap-3 p-4 bg-white/3 border border-white/8 rounded-xl">
          <AlertCircle size={14} className="text-warm-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-warm-400 space-y-1">
            <p className="font-medium text-warm-500">URI de redirection OAuth (à ajouter sur chaque portail)</p>
            <code className="text-sage-600 select-all">http://localhost:3000/api/oauth/callback</code>
          </div>
        </div>

      </div>
    </div>
  )
}
