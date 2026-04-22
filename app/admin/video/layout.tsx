import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  title: 'Command Center — Video Dashboard',
  description: 'Admin video call dashboard',
};

export default function AdminVideoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${jetbrains.variable}`}>
      {children}
    </div>
  );
}
