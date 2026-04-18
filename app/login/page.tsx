'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';
import SocialAuthButtons from '@/components/SocialAuthButtons';

const LoginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') || '/dashboard';
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const canSubmit = useMemo(() => !pending, [pending]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    const parsed = LoginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const formatted = parsed.error.format();
      setFieldErrors({
        email: formatted.email?._errors?.[0],
        password: formatted.password?._errors?.[0],
      });
      return;
    }
    setFieldErrors({});

    setPending(true);
    try {
      const res = await apiClient<{ success: true; user: { id: string; name: string; email?: string; avatar?: string; provider: 'local' | 'google' | 'facebook' } }>('/api/auth/login', {
        method: 'POST',
        json: parsed.data,
      });
      login(res.user);
      router.replace(redirect);
      router.refresh();
    } catch (err: any) {
      setApiError(err?.message || 'Login failed');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 md:p-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-slate-900 mb-2">Login</h1>
          <p className="text-slate-500 text-sm">Sign in with email, Google, or Facebook</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider ml-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all font-medium text-slate-900 text-base"
              placeholder="you@example.com"
              disabled={pending}
              autoComplete="email"
            />
            {fieldErrors.email ? <div className="mt-2 text-sm text-red-600">{fieldErrors.email}</div> : null}
          </div>

          <div>
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider ml-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all font-medium text-slate-900 text-base"
              placeholder="••••••••"
              disabled={pending}
              autoComplete="current-password"
            />
            {fieldErrors.password ? <div className="mt-2 text-sm text-red-600">{fieldErrors.password}</div> : null}
          </div>

          {apiError ? <div className="text-sm text-red-600">{apiError}</div> : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-4 bg-[#F57E20] hover:bg-[#e66d00] text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {pending ? <span className="w-5 h-5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" /> : 'Login'}
          </button>
        </form>

        <SocialAuthButtons mode="signIn" oauthRedirect={redirect} />

        <p className="text-center text-xs text-slate-400 mt-6">
          No account?{' '}
          <Link href="/register" className="text-[#F57E20] font-bold hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

