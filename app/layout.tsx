import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import LuxuryNavbar from '../components/LuxuryNavbar';
import Footer from '../components/Footer';
import ClientLayout from './ClientLayout';
import { SITE_CONFIG } from '../lib/constants';
import { GoogleOAuthProvider } from '@react-oauth/google';
const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FF7900',
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://soyol.mn'),
  title: {
    default: `${SITE_CONFIG.name} - ${SITE_CONFIG.description}`,
    template: `%s | ${SITE_CONFIG.name}`,
  },
  description: 'Олон улсын чанартай бүтээгдэхүүнийг бөөний үнээр. Хурдан хүргэлт, баталгаат чанар, найдвартай үйлчилгээ.',
  keywords: ['video shop', 'Mongolia', 'бөөний үнэ', 'онлайн худалдаа', 'хурдан хүргэлт', 'электрон бараа', 'гар утас', 'компьютер'],
  authors: [{ name: 'Soyol Video Shop' }],
  creator: 'Soyol Video Shop',
  publisher: 'Soyol Video Shop',
  manifest: '/manifest.json',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'mn_MN',
    url: 'https://soyol.mn',
    siteName: SITE_CONFIG.name,
    title: `${SITE_CONFIG.name} - ${SITE_CONFIG.description}`,
    description: 'Олон улсын чанартай бүтээгдэхүүнийг бөөний үнээр',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: `${SITE_CONFIG.name} - Online Shopping`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_CONFIG.name} - ${SITE_CONFIG.description}`,
    description: 'Олон улсын чанартай бүтээгдэхүүнийг бөөний үнээр',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  const content = (
    <html lang="mn" className={inter.variable}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={SITE_CONFIG.name} />
      </head>
      <body className={`${inter.className} min-h-screen bg-white antialiased`}>
        <ClientLayout>
          <LuxuryNavbar />
          <main className="min-h-screen pb-16 md:pb-0 relative z-0">{children}</main>
          <Footer />
        </ClientLayout>
      </body>
    </html>
  );

  if (!googleClientId) {
    return content;
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      {content}
    </GoogleOAuthProvider>
  );
}
