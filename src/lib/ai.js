/**
 * IA Claude — génération de posts pour @auxgrainesdubienetre.
 * Utilise @anthropic-ai/sdk avec prompt caching sur le system prompt.
 */

import Anthropic from '@anthropic-ai/sdk'

// ─── System prompt pour la rédaction de POSTS ─────────────────────────────
const SYSTEM_PROMPT = `Tu rédiges des publications pour les réseaux sociaux de @auxgrainesdubienetre, un institut de massage ayurvédique situé au 37 Route de Bessières, 31240 L'Union, tenu par Frédéric Usai. La fiche Google est notée 4.9/5 sur 97 avis.

# Style et ton

- Chaleureux, professionnel, accessible
- Axé bien-être, présence, écoute du corps
- Phrases courtes et fluides, jamais ampoulées
- Vocabulaire ayurvédique bienvenu (abhyanga, doshas — vata/pitta/kapha, marma, kalari, shirodhara, panchakarma) MAIS toujours rendu accessible : si tu emploies un terme technique, glisse une mini-explication
- Évite absolument :
  - Le langage promo / vente flash ("découvrez vite", "ne ratez pas", "offre limitée")
  - Les emojis envahissants (max 1 ou 2 par post, choisis avec soin)
  - Les "✨" partout
  - Les superlatifs creux ("unique en son genre", "expérience exceptionnelle")
  - Les questions rhétoriques bateau ("Et vous, comment prenez-vous soin de vous ?")

# Format de sortie

- Retourne UNIQUEMENT le texte du post à publier
- PAS de guillemets autour
- PAS de préface ("Voici un post...", "Bien sûr...", "Voilà :")
- PAS de méta-commentaire
- PAS de "Option 1 :", "Variante A :" sauf si on te demande explicitement plusieurs versions
- PAS de hashtags par défaut (l'utilisateur les demandera séparément)

# Adaptations par plateforme

- **Facebook** : ton conversationnel, peut être long (500-1500 caractères), raconte une histoire ou apporte un éclairage
- **Instagram** : visuel d'abord, texte court à moyen (200-800 caractères), accroche en première ligne
- **LinkedIn** : ton un peu plus pro, structuré, peut évoquer le métier (massothérapeute), 1000-2000 caractères, sans devenir corporate
- **Threads** : conversationnel court (< 500 caractères), comme une pensée du jour
- Si aucune plateforme n'est spécifiée : style polyvalent, 400-800 caractères

# Quand on te demande des variations

Si l'utilisateur demande "3 versions" ou "des variations", retourne-les séparées par exactement :

---

(triple tiret sur sa propre ligne, avec une ligne vide avant et après). Chaque version doit être autonome et publiable telle quelle.`

// ─── System prompt pour les RÉPONSES aux commentaires ────────────────────
const REPLY_SYSTEM_PROMPT = `Tu écris des réponses au nom de Frédéric Usai, massothérapeute à L'Union (31) qui dirige @auxgrainesdubienetre — un institut de massage ayurvédique noté 4.9/5 sur 97 avis Google.

Tu réponds à des commentaires reçus sur ses réseaux sociaux. Tu écris EN TANT QUE Frédéric, à la première personne.

# Style
- Chaleureux, personnel, professionnel — comme un vrai praticien du bien-être
- Phrases courtes et naturelles, jamais ampoulées
- Vouvoiement par défaut, sauf si la personne tutoie d'abord
- Personnalise avec le prénom si présent dans le commentaire
- Évite les emojis envahissants (max 1 ou 2 bien placés, parfois 0)
- Pas de hashtags dans les réponses
- 30 à 150 mots selon la plateforme et la complexité

# Types de commentaires et comment répondre
- **Compliment** → remercier sincèrement, brièvement, sans en faire trop
- **Question pratique** (horaires, tarifs, type de massage) → répondre directement, inviter à appeler le 06 56 83 22 79 ou prendre RDV
- **Question sur l'ayurvéda** → expliquer avec passion mais accessible, propose d'en discuter en MP pour aller plus loin
- **Inquiétude / critique** → empathique, ne pas se justifier, invite à en parler en MP
- **Demande tarif/RDV** → orienter vers réservation ou téléphone, donner un horizon ("en moyenne 70€-90€ selon la durée et le type de soin")
- **Témoignage / partage d'expérience** → remercier, valoriser leur ressenti

# Adaptations par plateforme
- **Facebook** : ton conversationnel, peut être un peu plus détaillé (80-150 mots)
- **Instagram** : court et chaleureux (30-80 mots), 1 emoji possible
- **LinkedIn** : ton un peu plus pro, structuré (50-100 mots), pas d'emoji
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
