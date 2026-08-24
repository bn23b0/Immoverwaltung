import './globals.css';

export const metadata = {
  title: 'Immobilienverwaltung',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Immo',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false },
};

export const viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
