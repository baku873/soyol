'use client';

import { SWRConfig } from 'swr';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Toaster } from 'react-hot-toast';
import { LanguageProvider } from '../context/LanguageContext';
import { AuthProvider } from '../context/AuthContext';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const swrDefaults = {
  revalidateOnFocus: false,
  dedupingInterval: 120000,
  errorRetryCount: 2,
};

import FloatingChatButton from '../components/FloatingChatButton';
import { usePushNotifications } from '../hooks/usePushNotifications';
import LuxuryNavbar from '../components/LuxuryNavbar';
import Footer from '../components/Footer';

import { GoogleOAuthProvider } from '@react-oauth/google';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  usePushNotifications();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const isAdminRoute = !!pathname && pathname.startsWith('/admin');

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <SWRConfig value={swrDefaults}>
        <LanguageProvider>
          <AuthProvider>
            <ErrorBoundary>
              {!isAdminRoute && <LuxuryNavbar />}
              <main className={isAdminRoute ? 'min-h-screen relative z-0' : 'min-h-screen pb-16 md:pb-0 relative z-0'}>
                {children}
              </main>
              {!isAdminRoute && <Footer />}
              <FloatingChatButton />
              <Toaster position="top-right" reverseOrder={false} />
            </ErrorBoundary>
          </AuthProvider>
        </LanguageProvider>
      </SWRConfig>
    </GoogleOAuthProvider>
  );
}
