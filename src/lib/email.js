/**
 * Email via Resend (https://resend.com).
 * Set RESEND_API_KEY in Vercel env vars.
 * Optional: RESEND_FROM_EMAIL (default: onboarding@resend.dev — limited to your Resend signup email in sandbox)
 *
 * For production with real users, verify a domain on Resend and set RESEND_FROM_EMAIL=noreply@yourdomain.com
 */

export async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — email skipped')
    return false
  }
  const from = process.env.RESEND_FROM_EMAIL || 'Social Poster <onboarding@resend.dev>'
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html }),
    })
    if (!r.ok) { console.error('[email]', await r.json().catch(() => ({}))); return false }
    return true
  } catch (e) {
    console.error('[email]', e?.message)
    return false
  }
}

export function resetPasswordHtml({ resetUrl, expiresInMinutes = 60 }) {
  return `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#FAF7F2;border-radius:16px;">
  <h1 style="font-size:20px;color:#3D352E;margin-bottom:8px;">Réinitialisation de mot de passe</h1>
  <p style="color:#7C726A;font-size:14px;line-height:1.6;margin-bottom:24px;">
    Tu as demandé à réinitialiser ton mot de passe Social Poster.<br>
    Clique sur le bouton ci-dessous — le lien expire dans ${expiresInMinutes} minutes.
  </p>
  <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#6E8C6B;color:#fff;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;">Réinitialiser mon mot de passe</a>
  <p style="color:#B8AFA2;font-size:12px;margin-top:24px;">Si tu n'as pas demandé cette réinitialisation, ignore cet email.</p>
</div>`
}

export function newCommentsHtml({ count, appUrl }) {
  return `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#FAF7F2;border-radius:16px;">
  <h1 style="font-size:20px;color:#3D352E;margin-bottom:8px;">🌿 ${count} nouveau${count > 1 ? 'x' : ''} commentaire${count > 1 ? 's' : ''}</h1>
  <p style="color:#7C726A;font-size:14px;line-height:1.6;margin-bottom:24px;">
    Tu as ${count} nouveau${count > 1 ? 'x' : ''} commentaire${count > 1 ? 's' : ''} en attente dans ton Inbox Social Poster.
  </p>
  <a href="${appUrl}" style="display:inline-block;padding:12px 24px;background:#6E8C6B;color:#fff;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;">Voir l'Inbox</a>
</div>`
}
