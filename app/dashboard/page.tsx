'use client';

import { useUser, useAuth } from '@/context/AuthContext';

export default function DashboardPage() {
  const { user, isSignedIn, isLoaded } = useUser();
  const { logout } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading…</div>
    );
  }

  if (!isSignedIn || !user) return null;

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center text-xl font-black text-slate-700">
              {user.avatar ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" /> : user.name[0]}
            </div>
            <div className="flex-1">
              <div className="text-xl font-black text-slate-900">{user.name}</div>
              <div className="text-sm text-slate-600">{user.email || '—'}</div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              {user.provider.toUpperCase()}
            </span>
          </div>

          <div className="mt-8">
            <button
              onClick={() => logout()}
              className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
