import "./globals.css";

export const metadata = {
  title: "Social Poster Biz",
  description: "Publication multi-réseaux sociaux pour Aux graines du bien-être",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#FAF7F2",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
