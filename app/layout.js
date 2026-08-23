import './globals.css';

export const metadata = {
  title: 'Immobilienverwaltung',
  manifest: '/manifest.json',
};
export const viewport = { themeColor: '#0f172a' };

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
