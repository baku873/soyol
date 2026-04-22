import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  title: 'Command Center — Live Call',
  description: 'Admin video call session',
};

export default function AdminCallLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${jetbrains.variable}`} style={{ fontFamily: 'var(--font-jetbrains, monospace)' }}>
      {children}
    </div>
  );
}
