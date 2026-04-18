'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';
import SocialAuthButtons from '@/components/SocialAuthButtons';

const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Include at least one uppercase letter')
  .regex(/[0-9]/, 'Include at least one number');

const RegisterSchema = z
  .object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Enter a valid email'),
    password: passwordField,
    confirmPassword: z.string().min(8, 'Confirm your password'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

function passwordStrength(pw: string): { label: string; score: 0 | 1 | 2 | 3 } {
  let score: 0 | 1 | 2 | 3 = 0;
  if (pw.length >= 8) score = 1;
  if (pw.length >= 10 && /[A-Z]/.test(pw) && /[0-9]/.test(pw)) score = 2;
  if (pw.length >= 12 && /[^A-Za-z0-9]/.test(pw)) score = 3;
  return {
    score,
    label: ['Weak', 'Okay', 'Strong', 'Very strong'][score],
  };
}

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthRedirect = searchParams.get('redirect') || '/dashboard';
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const strength = useMemo(() => passwordStrength(password), [password]);
  const canSubmit = useMemo(() => !pending, [pending]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    const parsed = RegisterSchema.safeParse({ name, email, password, confirmPassword });
    if (!parsed.success) {
      const formatted = parsed.error.format();
      setFieldErrors({
        name: formatted.name?._errors?.[0],
        email: formatted.email?._errors?.[0],
        password: formatted.password?._errors?.[0],
        confirmPassword: formatted.confirmPassword?._errors?.[0],
      });
      return;
    }
    setFieldErrors({});

    setPending(true);
    try {
      const res = await apiClient<{ success: true; user: { id: string; name: string; email?: string; avatar?: string; provider: 'local' | 'google' | 'facebook' } }>('/api/auth/register', {
        method: 'POST',
        json: parsed.data,
      });
      login(res.user);
      const next = searchParams.get('redirect');
      router.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
      router.refresh();
    } catch (err: any) {
      setApiError(err?.message || 'Registration failed');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 md:p-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-slate-900 mb-2">Register</h1>
          <p className="text-slate-500 text-sm">Create an account</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider ml-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all font-medium text-slate-900 text-base"
              placeholder="Your name"
              disabled={pending}
              autoComplete="name"
            />
            {fieldErrors.name ? <div className="mt-2 text-sm text-red-600">{fieldErrors.name}</div> : null}
          </div>

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
              autoComplete="new-password"
            />
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={[
                    'h-full transition-all',
                    strength.score === 0 ? 'w-1/4 bg-red-400' : '',
                    strength.score === 1 ? 'w-2/4 bg-orange-400' : '',
                    strength.score === 2 ? 'w-3/4 bg-emerald-400' : '',
                    strength.score === 3 ? 'w-full bg-emerald-600' : '',
                  ].join(' ')}
                />
              </div>
              <div className="text-xs font-bold text-slate-500">{strength.label}</div>
            </div>
            {fieldErrors.password ? <div className="mt-2 text-sm text-red-600">{fieldErrors.password}</div> : null}
          </div>

          <div>
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider ml-1">Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-2 w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all font-medium text-slate-900 text-base"
              placeholder="••••••••"
              disabled={pending}
              autoComplete="new-password"
            />
            {fieldErrors.confirmPassword ? (
              <div className="mt-2 text-sm text-red-600">{fieldErrors.confirmPassword}</div>
            ) : null}
          </div>

          {apiError ? <div className="text-sm text-red-600">{apiError}</div> : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-4 bg-[#F57E20] hover:bg-[#e66d00] text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {pending ? <span className="w-5 h-5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" /> : 'Register'}
          </button>
        </form>

        <SocialAuthButtons mode="signUp" oauthRedirect={oauthRedirect} />

        <p className="text-center text-xs text-slate-400 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-[#F57E20] font-bold hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

