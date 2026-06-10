export const metadata = { title: 'Conditions d\'utilisation — Social Poster' }

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-ivory-50 text-warm-700 px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-warm-800">Conditions d'utilisation</h1>
        <p className="text-sm text-warm-500">Dernière mise à jour : juin 2026</p>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-lg font-semibold text-warm-700">1. Le service</h2>
          <p>
            Social Poster est un outil privé de création et de publication de contenus
            sur les réseaux sociaux (Facebook, Instagram, TikTok, Google…), édité par
            Aux Graines du Bien-Être (Ghisonaccia, Corse). L'accès se fait uniquement
            sur invitation.
          </p>

          <h2 className="text-lg font-semibold text-warm-700">2. Comptes connectés</h2>
          <p>
            En connectant un compte de réseau social, vous autorisez Social Poster à
            publier en votre nom les contenus que vous créez et validez vous-même.
            Aucune publication n'est effectuée sans votre action ou votre planification
            explicite. Vous pouvez déconnecter un compte à tout moment depuis l'écran
            « Comptes », ce qui supprime immédiatement les autorisations associées.
          </p>

          <h2 className="text-lg font-semibold text-warm-700">3. Vos responsabilités</h2>
          <p>
            Vous restez seul responsable des contenus publiés via l'outil et de leur
            conformité aux règles de chaque plateforme (TikTok, Meta, Google…) ainsi
            qu'à la législation en vigueur.
          </p>

          <h2 className="text-lg font-semibold text-warm-700">4. Disponibilité</h2>
          <p>
            Le service est fourni « en l'état », sans garantie de disponibilité
            permanente. Les fonctionnalités dépendent des API officielles des
            plateformes connectées et peuvent évoluer avec elles.
          </p>

          <h2 className="text-lg font-semibold text-warm-700">5. Contact</h2>
          <p>
            Pour toute question : Aux Graines du Bien-Être —{' '}
            <a href="mailto:lesmassagesdefred@gmail.com" className="text-sage-600 underline">
              lesmassagesdefred@gmail.com
            </a>
          </p>
        </section>
      </div>
    </main>
  )
}
