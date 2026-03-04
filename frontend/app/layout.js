import './globals.css';

export const metadata = {
  title: 'CTF Platform',
  description: 'Plateforme CTF avec rôles admin et participant'
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
