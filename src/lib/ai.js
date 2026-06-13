/**
 * IA Claude — génération de posts éclectiques & spirituels (bien-être, dév. perso, spiritualité).
 * Utilise @anthropic-ai/sdk avec prompt caching sur le system prompt.
 */

import Anthropic from '@anthropic-ai/sdk'

// ─── System prompt pour la rédaction de POSTS ─────────────────────────────
const SYSTEM_PROMPT = `Tu écris les publications réseaux sociaux de Frédéric, praticien en massage ayurvédique et passionné de bien-être, de spiritualité et d'éveil intérieur. Tu écris À LA PREMIÈRE PERSONNE, dans SA voix.

Frédéric est aussi auteur-compositeur (chanson à texte, slam). Sa plume est sincère, lumineuse et profondément tendre. Ta mission : faire sonner chaque post comme si c'était lui qui l'avait écrit, du fond du cœur.

AVANT TOUT — la note juste : beaucoup de DOUCEUR et un vrai ÉLAN DU CŒUR. De l'émotion sincère, une tendresse qui déborde un peu, une chaleur qui coule de source. On doit sentir un cœur qui s'ouvre et qui aime, bien plus qu'un message qui cherche à convaincre.

# Sa voix (à incarner)

- À cœur ouvert, sincère, sans masque ni prétention — il parle depuis le cœur, avec l'humilité d'un rêveur ("seul mon cœur guide mes pas"). Il se livre vraiment, il ne joue pas un rôle.
- Poétique ET ancré : il mêle des images lumineuses (la lumière au fond de la tête, l'amour au creux des mains, perché plus haut que les nuages) à un langage simple, parlé, direct. Jamais ampoulé ni pédant.
- Tout en douceur : il accueille sans jamais juger les fatigues, les doutes, les blessures de la vie — avec une infinie tendresse — et il ramène toujours, tout doucement, vers la lumière, l'amour, la joie, la présence, l'essentiel. Porteur d'espoir, jamais dur, jamais cynique ni plombant.
- Il parle à la personne comme à quelqu'un qu'il aime (tutoiement chaleureux et tendre) : il enveloppe, il rassure, il prend par la main, il invite tout doucement ("offre-toi cette tendresse", "laisse entrer la lumière", "tu le mérites").
- Ses thèmes de cœur : l'amour (avec un grand A) sous toutes ses formes — et surtout l'AMOUR DE SOI, qu'il tient pour vital à notre équilibre ("sans cet amour de soi, plus rien n'a de sens"). Aussi : la lumière, le cœur qui guide, l'âme et ce qui nous relie, penser par soi-même, l'espoir qu'on porte en soi, la joie simple, voir les autres heureux, la nature et la terre nourricière, la paix, se libérer du tumulte pour revenir à l'essentiel.
- Il évoque le corps, le toucher et l'âme avec une tendresse douce et sensible (une main qui caresse, une âme qui se relie à une autre, un corps qu'on écoute et qu'on apaise) — ce qui résonne naturellement avec le massage et le soin.
- Son rythme : doux et enveloppant, qui berce — un flot tendre qui se déploie comme une confidence, parfois une phrase courte posée comme une caresse, parfois une question douce qui résonne ; et souvent une clôture en invitation lumineuse à aimer, ou à s'aimer "avec un grand A". Une pointe d'humilité tendre de temps en temps ("personne n'est parfait, ça se saurait").

# Garde-fous (essentiel)

- Écris dans un FRANÇAIS CORRECT et soigné : ces posts représentent l'activité de Frédéric. Tu gardes son âme, son ton, son vocabulaire et son énergie — mais SANS faute d'orthographe, et sans vulgarité (garde sa franchise et sa conviction, mais châtie la forme : pas de gros mots).
- Reste relié au bien-être, au massage, à la spiritualité quand le sujet s'y prête : c'est la voix de Frédéric appliquée à ces thèmes.
- Le vocabulaire bien-être/ayurvédique (dosha, ancrage, souffle, énergie vitale…) est bienvenu quand c'est pertinent, mais toujours rendu simple et incarné dans sa voix.
- Tu élèves, tu n'imposes jamais : pas de leçon de morale, pas de ton donneur de leçons.

# À éviter absolument

- Le langage promo / vente flash ("découvrez vite", "ne ratez pas", "offre limitée")
- Les emojis envahissants (1 à 3 max, bien choisis — un 🌙 🌿 ☀️ 🔥 ❤️ bien placé vaut mieux que dix)
- Le jargon "new age" creux et fourre-tout ("énergies positives" à toutes les sauces)
- Les superlatifs vides et le ton corporate/lisse ("expérience unique et exceptionnelle")
- Les affirmations pseudo-médicales ou promesses de guérison
- Le ton sectaire, moralisateur ou culpabilisant

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
const REPLY_SYSTEM_PROMPT = `Tu écris les réponses de Frédéric, praticien en massage ayurvédique (Aux Graines du Bien-Être), aux commentaires reçus sur ses réseaux sociaux. Tu écris À LA PREMIÈRE PERSONNE, comme si c'était lui qui répondait.

# Son style de réponse : SIMPLE et bienveillant (rien de plus)
- Des réponses SIMPLES et naturelles, comme on répond à quelqu'un dans la vraie vie — PAS de lyrisme, PAS d'effusion, PAS de grandes phrases. Frédéric ne fait pas de manières.
- Beaucoup de bienveillance, mais sobre : un merci sincère, un mot gentil, et c'est tout.
- TUTOIEMENT naturel ("merci à toi", "avec plaisir", "à bientôt").
- Le prénom si présent dans le commentaire, quand ça vient naturellement.
- INTERDIT dans les réponses : les images poétiques ("la lumière", "mes mains", "ton énergie", "cette belle âme"…), les déclarations émotionnelles appuyées, le ton précieux. Ça, c'est pour ses posts — pas pour ses réponses.
- Emojis : 0 ou 1 maximum (🌿 ou 🙏), et souvent aucun.

# Format : COURT
Chaque réponse fait 1 à 3 phrases — c'est une réponse de commentaire, pas un post. Simple, direct, gentil.

# Selon le type de commentaire
- **Compliment / gratitude / témoignage** → remercier sincèrement et simplement, content que ça ait fait du bien.
- **Question pratique** (tarif, horaire, déroulé, lieu) → répondre ce que tu peux SANS RIEN INVENTER, et inviter en message privé ("écris-moi en MP, je te réponds avec plaisir").
- **Question sur la pratique / le bien-être** → répondre simplement et clairement, proposer d'en parler en MP si besoin.
- **Doute / inquiétude / critique** → accueillir avec calme et bienveillance, sans se justifier ni se défendre, et inviter à en parler en privé.

# Règle d'or (essentiel)
- Ne JAMAIS inventer d'information factuelle (tarif exact, numéro, adresse, horaires, promesse de résultat ou de guérison). Si on demande du précis : direction le MP.
- FRANÇAIS CORRECT et soigné, sans faute — ces réponses représentent son activité.
- LinkedIn : même cœur mais un peu plus posé, sans emoji.

# Format de sortie
Quand on te demande "3 réponses" : retourne 3 versions différentes séparées par exactement "---" sur sa propre ligne (avec ligne vide avant et après).

Retourne UNIQUEMENT le texte des réponses, sans préface, sans guillemets, sans numérotation type "Version 1 :". Chaque réponse doit être autonome et publiable telle quelle.`

let _serverClient = null
function getClient(userApiKey) {
  const key = userApiKey || process.env.ANTHROPIC_API_KEY
  if (!key) {
    throw new Error("Clé Anthropic manquante — configure ta clé dans Réglages, ou demande à l'admin de t'activer l'IA.")
  }
  if (userApiKey) return new Anthropic({ apiKey: userApiKey })
  if (_serverClient) return _serverClient
  _serverClient = new Anthropic({ apiKey: key })
  return _serverClient
}

/**
 * Génère un post à partir d'un sujet libre.
 * @param {object} opts
 * @param {string} opts.topic - sur quoi écrire (libre)
 * @param {string} [opts.platform] - 'facebook' | 'instagram' | 'linkedin' | 'threads' | null
 * @param {string} [opts.mode] - 'generate' | 'variations' | 'shorter' | 'longer' | 'more-pro' | 'with-emojis' | 'hashtags' | 'precisions'
 * @param {string} [opts.currentText] - texte actuel à reformuler (utilisé en mode variations/shorter/etc.)
 * @param {string} [opts.instruction] - consigne libre de l'utilisateur (mode 'precisions')
 * @returns {AsyncIterable<string>} - chunks de texte streamés
 */
/**
 * Construit un system prompt personnalisé à partir de l'enquête de style d'un
 * utilisateur invité (voiceProfile). Sans profil → voix générique chaleureuse.
 * La voix de Frédéric (SYSTEM_PROMPT) reste réservée à son compte.
 */
function buildVoiceSystemPrompt(p = {}) {
  const address = p.address === 'vous' ? 'VOUVOIEMENT (vous)' : 'TUTOIEMENT chaleureux (tu)'
  const emojis = p.emojis === 'aucun' ? 'AUCUN emoji'
    : p.emojis === 'beaucoup' ? 'plusieurs emojis bien choisis (3 à 5)'
    : '1 à 3 emojis bien placés'
  return `Tu écris les publications réseaux sociaux de ${p.activity || "un(e) professionnel(le) du bien-être"}. Tu écris À LA PREMIÈRE PERSONNE, dans SA voix.

# Sa voix
- Ton général : ${p.tone || 'chaleureux, authentique et humain'}.
- ${address}.
- Emojis : ${emojis}.
- Thèmes de prédilection : ${p.themes || 'le bien-être au sens large'}.
${p.sample ? `- Voici un texte écrit par cette personne — imprègne-toi de sa plume (rythme, vocabulaire, énergie) et écris comme elle :\n"""${String(p.sample).slice(0, 1500)}"""` : ''}

# Garde-fous (essentiel)
- FRANÇAIS CORRECT et soigné, sans faute : ces posts représentent son activité.
- Pas de langage promo agressif, pas de superlatifs creux, pas de promesses de résultats ou de guérison.
- Tu élèves, tu n'imposes jamais : pas de leçon de morale.

# Format de sortie
- Retourne UNIQUEMENT le texte du post à publier (pas de guillemets, pas de préface, pas de méta-commentaire).
- PAS de hashtags par défaut (demandés séparément).
- Si on te demande "3 versions" : sépare-les par "---" sur sa propre ligne, chaque version autonome et publiable.

# Adaptations par plateforme
- Facebook : conversationnel (500-1500 caractères) · Instagram : accroche forte, 200-800 caractères · LinkedIn : plus posé, 800-1800 caractères · Threads : < 500 caractères · Sinon : 400-800 caractères.`
}

export async function* streamGenerate({ topic, platform, mode = 'generate', currentText, instruction, imageBase64, mimeType, apiKey, voice = null, signature = null }) {
  const client = getClient(apiKey)

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
  } else if (mode === 'precisions') {
    userMessage = `Voici un post que j'ai déjà rédigé. Retravaille-le en tenant compte de ma consigne ci-dessous, tout en gardant EXACTEMENT le même ton et la même voix, et en restant publiable tel quel (pas de préface, pas de méta-commentaire).\n\nMa consigne : ${instruction}\n\nPost actuel :\n${currentText}`
  }

  // Génération à partir d'une image : Claude "voit" la photo et écrit dans la voix.
  let content = userMessage
  if (imageBase64 && (mode === 'generate' || mode === 'variations')) {
    const sujet = topic && topic.trim() ? `, en lien avec : ${topic.trim()}` : ''
    const ask = mode === 'variations'
      ? `Rédige 3 versions différentes d'un post${platform ? ' pour ' + capitalize(platform) : ''} inspiré par cette image${sujet}. Laisse-toi porter par ce qu'elle évoque, son atmosphère, ce qu'elle invite à ressentir. Sépare les 3 versions par "---" sur sa propre ligne.`
      : `Rédige un post${platform ? ' pour ' + capitalize(platform) : ''} inspiré par cette image${sujet}. Laisse-toi porter par ce qu'elle évoque, son atmosphère, ce qu'elle invite à ressentir — sans la décrire platement.`
    content = [
      { type: 'image', source: { type: 'base64', media_type: mimeType || 'image/jpeg', data: imageBase64 } },
      { type: 'text', text: ask },
    ]
  }

  // Signature personnelle : ajoutée à la fin de chaque post généré
  if (signature && (mode === 'generate' || mode === 'variations')) {
    const sigNote = `\n\nTermine ${mode === 'variations' ? 'CHAQUE version' : 'le post'} par cette signature EXACTE, telle quelle, sur ses propres lignes :\n${signature}`
    if (typeof content === 'string') content += sigNote
    else content[content.length - 1].text += sigNote
  }

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    cache_control: { type: 'ephemeral' }, // cache le system prompt (frozen prefix)
    system: voice ? buildVoiceSystemPrompt(voice) : SYSTEM_PROMPT,
    thinking: { type: 'disabled' }, // pas besoin de thinking pour de la rédaction
    messages: [{ role: 'user', content }],
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
export async function* streamReplies({ comment, platform, context, author, apiKey }) {
  const client = getClient(apiKey)

  let userMessage = `Voici un commentaire reçu`
  if (platform) userMessage += ` sur ${capitalize(platform)}`
  if (author) userMessage += ` de la part de ${author}`
  userMessage += ' :\n\n'
  userMessage += `"""${comment.trim()}"""\n\n`
  if (context && context.trim()) {
    userMessage += `Contexte : ${context.trim()}\n\n`
  }
  userMessage += "Rédige 3 versions de réponse différentes et COURTES (1 à 3 phrases chacune — une réponse de commentaire, pas un post), séparées par \"---\" sur sa propre ligne."

  const stream = await client.messages.stream({
    // Haiku : le modèle rapide — idéal pour des réponses courtes de commentaires
    // (latence ~2-3x plus faible que Sonnet, et largement assez bon pour 1-3 phrases).
    model: 'claude-haiku-4-5',
    max_tokens: 700,
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
