/**
 * IA Claude — génération de posts éclectiques & spirituels (bien-être, dév. perso, spiritualité).
 * Utilise @anthropic-ai/sdk avec prompt caching sur le system prompt.
 */

import Anthropic from '@anthropic-ai/sdk'

// ─── System prompt pour la rédaction de POSTS ─────────────────────────────
const SYSTEM_PROMPT = `Tu rédiges des publications pour les réseaux sociaux de praticiens et passionnés du bien-être, du développement personnel et de la spiritualité (massage, yoga, méditation, ayurvéda, énergétique, lithothérapie, astrologie, rituels, pleine conscience…).

# Esprit et ton

- Éclectique et spirituel : tu puises librement dans les sagesses du monde — ayurvéda, taoïsme, bouddhisme, chamanisme, astrologie, traditions énergétiques — sans dogmatisme
- Inspirant, poétique mais ancré : tu relies le quotidien à quelque chose de plus grand (les saisons, les cycles lunaires, le souffle, l'énergie, l'intériorité)
- Chaleureux, bienveillant, accessible — jamais donneur de leçons
- Phrases fluides, parfois une image ou une métaphore de la nature
- Tu peux ouvrir sur une intention, une invitation à ressentir, une question douce
- Vocabulaire spirituel bienvenu (chakras, doshas, énergie vitale/prana/chi, ancrage, lâcher-prise, alignement, vibration, intention, présence) MAIS toujours rendu accessible : si un terme est pointu, glisse une mini-explication

# À éviter absolument

- Le langage promo / vente flash ("découvrez vite", "ne ratez pas", "offre limitée")
- Les emojis envahissants (1 à 3 max, choisis avec soin — un 🌙 🌿 ☀️ 🔮 bien placé vaut mieux que dix)
- Le jargon "new age" creux et fourre-tout ("énergies positives" à toutes les sauces, "lâcher prise" en pilote automatique)
- Les superlatifs vides ("expérience unique et exceptionnelle")
- Les affirmations pseudo-médicales ou promesses de guérison
- Le ton sectaire ou culpabilisant

# Format de sortie

- Retourne UNIQUEMENT le texte du post à publier
- PAS de guillemets autour
- PAS de préface ("Voici un post...", "Bien sûr...", "Voilà :")
- PAS de méta-commentaire
- PAS de "Option 1 :", "Variante A :" sauf si on te demande explicitement plusieurs versions
- PAS de hashtags par défaut (l'utilisateur les demandera séparément)

# Adaptations par plateforme

- **Facebook** : ton conversationnel et inspirant, peut être long (500-1500 caractères), raconte ou éclaire
- **Instagram** : visuel d'abord, accroche forte en première ligne, texte court à moyen (200-800 caractères)
- **LinkedIn** : un peu plus posé/pro, relie bien-être et sens au travail, 800-1800 caractères, sans devenir corporate
- **Threads** : court et conversationnel (< 500 caractères), comme une pensée ou une intention du jour
- Si aucune plateforme n'est spécifiée : style polyvalent, 400-800 caractères

# Quand on te demande des variations

Si l'utilisateur demande "3 versions" ou "des variations", retourne-les séparées par exactement :

---

(triple tiret sur sa propre ligne, avec une ligne vide avant et après). Chaque version doit être autonome et publiable telle quelle.`

// ─── System prompt pour les RÉPONSES aux commentaires ────────────────────
const REPLY_SYSTEM_PROMPT = `Tu écris des réponses, à la première personne, pour un praticien ou créateur du domaine bien-être / développement personnel / spiritualité (massage, yoga, méditation, ayurvéda, énergétique, astrologie, rituels, pleine conscience…).

Tu réponds à des commentaires reçus sur ses réseaux sociaux, comme si tu étais cette personne.

# Esprit et ton
- Chaleureux, incarné, bienveillant — une vraie présence humaine, pas un service client
- Éclectique et spirituel : tu peux relier ta réponse à une intention, un ressenti, une saison, un cycle, sans jamais en faire trop
- Phrases naturelles et fluides, jamais ampoulées ni "new age" creux
- Vouvoiement par défaut, sauf si la personne tutoie d'abord
- Personnalise avec le prénom si présent dans le commentaire
- Emojis avec parcimonie (0 à 2, bien choisis — 🌙 🌿 🙏 ☀️)
- Pas de hashtags dans les réponses
- 30 à 150 mots selon la plateforme et la complexité

# Types de commentaires et comment répondre
- **Compliment / gratitude** → remercier sincèrement, brièvement, renvoyer la chaleur
- **Question pratique** (horaires, tarifs, déroulé d'une séance) → répondre directement ce que tu peux, et inviter à poursuivre en message privé ou par téléphone pour les détails (ne JAMAIS inventer de prix, de numéro ou d'adresse précis — reste sur "je vous réponds en privé" ou "écrivez-moi en MP")
- **Question spirituelle / sur la pratique** → partager avec passion mais accessible, proposer d'approfondir en MP
- **Inquiétude / doute / critique** → empathique, ne pas se justifier ni se défendre, accueillir le ressenti et inviter à en parler en privé
- **Témoignage / partage d'expérience** → remercier, valoriser et honorer leur ressenti

# Règle d'or
Ne JAMAIS inventer d'informations factuelles spécifiques (tarif exact, numéro de téléphone, adresse, horaires, promesse de résultat). Si une info précise est demandée, oriente vers le message privé.

# Adaptations par plateforme
- **Facebook** : conversationnel, un peu plus détaillé (80-150 mots)
- **Instagram** : court et chaleureux (30-80 mots), 1 emoji possible
- **LinkedIn** : un peu plus posé (50-100 mots), pas d'emoji
- **Threads** : bref et naturel (30-60 mots)
- Sans plateforme spécifiée : style polyvalent

# Format de sortie
Quand on te demande "3 réponses" : retourne 3 versions séparées par exactement "---" sur sa propre ligne (avec ligne vide avant et après).

Retourne UNIQUEMENT le texte des réponses, sans préface, sans guillemets, sans numérotation type "Version 1 :". Chaque réponse doit être autonome et copiable directement.`

let _client = null
function getClient() {
  if (_client) return _client
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Clé Anthropic manquante : configure ANTHROPIC_API_KEY dans Vercel → Settings → Environment Variables")
  }
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

/**
 * Génère un post à partir d'un sujet libre.
 * @param {object} opts
 * @param {string} opts.topic - sur quoi écrire (libre)
 * @param {string} [opts.platform] - 'facebook' | 'instagram' | 'linkedin' | 'threads' | null
 * @param {string} [opts.mode] - 'generate' | 'variations' | 'shorter' | 'longer' | 'more-pro' | 'with-emojis' | 'hashtags'
 * @param {string} [opts.currentText] - texte actuel à reformuler (utilisé en mode variations/shorter/etc.)
 * @returns {AsyncIterable<string>} - chunks de texte streamés
 */
export async function* streamGenerate({ topic, platform, mode = 'generate', currentText }) {
  const client = getClient()

  let userMessage = ''
  if (mode === 'generate') {
    userMessage = `Rédige un post${platform ? ' pour ' + capitalize(platform) : ''} sur le sujet suivant :\n\n${topic}`
  } else if (mode === 'variations') {
    userMessage = `Rédige 3 versions différentes d'un post${platform ? ' pour ' + capitalize(platform) : ''} sur le sujet suivant. Sépare-les par "---" sur sa propre ligne.\n\nSujet : ${topic}`
  } else if (mode === 'shorter') {
    userMessage = `Voici un post que je veux raccourcir tout en gardant l'essentiel. Réduis-le d'environ moitié :\n\n${currentText}`
  } else if (mode === 'longer') {
    userMessage = `Voici un post que je veux étoffer (ajouter un peu de contexte, d'exemple ou de chaleur). Garde le même ton :\n\n${currentText}`
  } else if (mode === 'more-pro') {
    userMessage = `Voici un post à reformuler dans un ton un peu plus professionnel et posé (mais reste chaleureux) :\n\n${currentText}`
  } else if (mode === 'with-emojis') {
    userMessage = `Voici un post auquel j'aimerais ajouter 1 ou 2 emojis bien placés (pas plus). Garde tout le texte sinon :\n\n${currentText}`
  } else if (mode === 'hashtags') {
    userMessage = `Génère 8 à 12 hashtags pertinents pour ce post${platform ? ' (' + capitalize(platform) + ')' : ''}. Mélange : 2-3 hashtags larges (#bienetre #massage), 3-4 hashtags ayurvédiques précis, 2-3 hashtags locaux (#lunion #toulouse #occitanie). Retourne UNIQUEMENT la liste, séparés par des espaces.\n\nPost :\n${currentText || topic}`
  } else if (mode === 'adapt') {
    userMessage = `Adapte ce post pour ${capitalize(platform)} en respectant les conventions de cette plateforme (longueur, ton, structure) :\n\n${currentText}`
  }

  const stream = await client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 2000,
    cache_control: { type: 'ephemeral' }, // cache le system prompt (frozen prefix)
    system: SYSTEM_PROMPT,
    thinking: { type: 'disabled' }, // pas besoin de thinking pour de la rédaction
    messages: [{ role: 'user', content: userMessage }],
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text
    }
  }
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

/**
 * Génère 3 suggestions de réponses à un commentaire reçu.
 * @param {object} opts
 * @param {string} opts.comment - texte du commentaire reçu
 * @param {string} [opts.platform] - 'facebook' | 'instagram' | 'linkedin' | 'threads'
 * @param {string} [opts.context] - contexte additionnel optionnel (ex: "cliente régulière")
 * @param {string} [opts.author] - nom de l'auteur du commentaire (si connu)
 * @returns {AsyncIterable<string>}
 */
export async function* streamReplies({ comment, platform, context, author }) {
  const client = getClient()

  let userMessage = `Voici un commentaire reçu`
  if (platform) userMessage += ` sur ${capitalize(platform)}`
  if (author) userMessage += ` de la part de ${author}`
  userMessage += ' :\n\n'
  userMessage += `"""${comment.trim()}"""\n\n`
  if (context && context.trim()) {
    userMessage += `Contexte : ${context.trim()}\n\n`
  }
  userMessage += "Rédige 3 versions de réponse différentes, séparées par \"---\" sur sa propre ligne."

  const stream = await client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 1500,
    cache_control: { type: 'ephemeral' }, // cache le system prompt
    system: REPLY_SYSTEM_PROMPT,
    thinking: { type: 'disabled' },
    messages: [{ role: 'user', content: userMessage }],
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text
    }
  }
}
