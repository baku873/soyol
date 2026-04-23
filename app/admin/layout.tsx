'use client';

import { useUser } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminKeyboardShortcuts from '@/components/admin/AdminKeyboardShortcuts';

/**
 * Admin Layout
 *
 * Security is enforced server-side by middleware.ts which verifies the JWT
 * and checks role === 'admin' BEFORE this component ever renders.
 *
 * The loading state below is purely UX polish — it prevents a flash of
 * admin UI while the client-side AuthContext hydrates. It is NOT a
 * security gate; by the time this component renders, the user is already
 * verified as an admin by the middleware.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isSignedIn, isLoaded } = useUser();

  // Show spinner while client auth context hydrates.
  // This is UI polish, not security — middleware already blocked non-admins.
  if (!isLoaded || !isSignedIn || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <AdminSidebar />
      <AdminKeyboardShortcuts />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
