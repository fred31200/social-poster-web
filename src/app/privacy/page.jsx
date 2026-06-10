export const metadata = { title: 'Politique de confidentialité — Social Poster' }

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-ivory-50 text-warm-700 px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-warm-800">Politique de confidentialité</h1>
        <p className="text-sm text-warm-500">Dernière mise à jour : juin 2026</p>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-lg font-semibold text-warm-700">1. Données collectées</h2>
          <p>
            Social Poster conserve uniquement ce qui est nécessaire au fonctionnement
            du service : votre adresse e-mail de connexion, les jetons d'accès des
            comptes de réseaux sociaux que vous choisissez de connecter (Facebook,
            Instagram, TikTok, Google…), et les contenus que vous créez ou planifiez
            dans l'outil.
          </p>

          <h2 className="text-lg font-semibold text-warm-700">2. Utilisation</h2>
          <p>
            Ces données servent exclusivement à publier vos contenus sur les comptes
            que vous avez connectés et à afficher vos statistiques de publication.
            Elles ne sont jamais vendues, partagées ni utilisées à des fins
            publicitaires.
          </p>

          <h2 className="text-lg font-semibold text-warm-700">3. Stockage et sécurité</h2>
          <p>
            Les données sont hébergées chez Vercel et Upstash (infrastructure
            européenne et américaine) et protégées par chiffrement en transit. Les
            jetons d'accès ne sont jamais exposés côté navigateur.
          </p>

          <h2 className="text-lg font-semibold text-warm-700">4. Suppression</h2>
          <p>
            Déconnecter un compte de réseau social supprime immédiatement ses jetons
            d'accès. Vous pouvez demander la suppression complète de votre compte et
            de vos données à tout moment en nous contactant.
          </p>

          <h2 className="text-lg font-semibold text-warm-700">5. Contact</h2>
          <p>
            Aux Graines du Bien-Être (Ghisonaccia, Corse) —{' '}
            <a href="mailto:lesmassagesdefred@gmail.com" className="text-sage-600 underline">
              lesmassagesdefred@gmail.com
            </a>
          </p>
        </section>
      </div>
    </main>
  )
}
