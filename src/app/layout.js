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
  colorScheme: "light only",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className="h-full antialiased" style={{ colorScheme: 'light only' }}>
      <head>
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light" />
      </head>
      <body className="min-h-full" style={{ backgroundColor: '#FAF7F2', color: '#3D352E' }}>{children}</body>
    </html>
  );
}
