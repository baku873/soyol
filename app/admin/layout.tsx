'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminKeyboardShortcuts from '@/components/admin/AdminKeyboardShortcuts';

/**
 * Admin UI: requires signed-in user with role === 'admin'.
 * Sensitive operations must still be enforced in API routes.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isSignedIn, isLoaded } = useUser();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      const next = pathname || '/admin';
      router.replace(`/login?redirect=${encodeURIComponent(next)}`);
    }
  }, [isLoaded, isSignedIn, isAdmin, router, pathname]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center gap-4">
        <p className="text-lg font-semibold max-w-md">Админ эрхгүй</p>
        <p className="text-sm text-slate-400 max-w-md leading-relaxed">
          Та нэвтэрсэн ч энэ бүртгэлд <code className="text-orange-300">role: &quot;admin&quot;</code> байхгүй байна.
          Deploy орчинд <code className="text-orange-300">MONGO_DB</code> нь өгөгдлийн сангийн нэртэй таарч байгаа эсэх,
          мөн таны хэрэглэгчийн баримт зөв санд байгаа эсэхийг шалгана уу.
        </p>
        <button
          type="button"
          onClick={() => router.replace('/')}
          className="mt-2 px-5 py-2.5 rounded-full bg-white text-slate-900 text-sm font-bold hover:bg-slate-200 transition-colors"
        >
          Нүүр хуудас
        </button>
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
