import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import '../globals.css';

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  title: 'Command System — Unit',
  description: 'Unit video feed station',
};

export default function UnitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${jetbrains.variable} font-mono min-h-screen`} style={{ background: '#080c0a' }}>
      {children}
    </div>
  );
}
