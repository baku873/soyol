'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { Phone, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';
import SocialAuthButtons from '@/components/SocialAuthButtons';

const PhoneLoginSchema = z.object({
  phone: z.string().min(8, 'Утасны дугаараа зөв оруулна уу'),
  password: z.string().min(1, 'Нууц үг оруулна уу'),
});

const EmailLoginSchema = z.object({
  email: z.string().email('Зөв и-мэйл хаяг оруулна уу'),
  password: z.string().min(1, 'Нууц үг оруулна уу'),
});

const OtpPhoneSchema = z.object({
  phone: z.string().min(8, 'Утасны дугаараа зөв оруулна уу'),
});

type AuthTab = 'password' | 'otp';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') || '/dashboard';
  const { login, isAuthenticated, isLoading } = useAuth();

  const [tab, setTab] = useState<AuthTab>('password');
  const [emailMode, setEmailMode] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    phone?: string;
    email?: string;
    password?: string;
  }>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const canSubmit = useMemo(() => !pending, [pending]);

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      router.replace('/');
      router.refresh();
    }
  }, [isLoading, isAuthenticated, router]);

  const subtitle =
    tab === 'otp'
      ? 'OTP кодоор нэвтрэх'
      : emailMode
        ? 'И-мэйл болон нууц үгээр нэвтрэх'
        : 'Нууц үгээр нэвтрэх';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (tab === 'otp') {
      const parsed = OtpPhoneSchema.safeParse({ phone });
      if (!parsed.success) {
        const formatted = parsed.error.format();
        setFieldErrors({ phone: formatted.phone?._errors?.[0] });
        return;
      }
      setFieldErrors({});
      setPending(true);
      try {
        await apiClient<{ success: boolean }>('/api/auth/send-otp', {
          method: 'POST',
          json: { phone: parsed.data.phone.trim() },
        });
        const q = new URLSearchParams({
          phone: parsed.data.phone.trim(),
          redirect_url: redirect,
        });
        router.push(`/verify?${q.toString()}`);
      } catch (err: unknown) {
        setApiError(err instanceof Error ? err.message : 'Код илгээхэд алдаа гарлаа');
      } finally {
        setPending(false);
      }
      return;
    }

    if (emailMode) {
      const parsed = EmailLoginSchema.safeParse({ email, password });
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
        const res = await apiClient<{
          success: true;
          user: {
            id: string;
            name: string;
            email?: string;
            avatar?: string;
            provider: 'local' | 'google' | 'facebook';
            phone?: string;
          };
        }>('/api/auth/login', {
          method: 'POST',
          json: { email: parsed.data.email, password: parsed.data.password },
        });
        login(res.user);
        router.replace(redirect);
        router.refresh();
      } catch (err: unknown) {
        setApiError(err instanceof Error ? err.message : 'Нэвтрэхэд алдаа гарлаа');
      } finally {
        setPending(false);
      }
      return;
    }

    const parsed = PhoneLoginSchema.safeParse({ phone, password });
    if (!parsed.success) {
      const formatted = parsed.error.format();
      setFieldErrors({
        phone: formatted.phone?._errors?.[0],
        password: formatted.password?._errors?.[0],
      });
      return;
    }
    setFieldErrors({});
    setPending(true);
    try {
      const res = await apiClient<{
        success: true;
        user: {
          id: string;
          name: string;
          email?: string;
          avatar?: string;
          provider: 'local' | 'google' | 'facebook';
          phone?: string;
        };
      }>('/api/auth/login', {
        method: 'POST',
        json: { phone: parsed.data.phone.trim(), password: parsed.data.password },
      });
      login(res.user);
      router.replace(redirect);
      router.refresh();
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Нэвтрэхэд алдаа гарлаа');
    } finally {
      setPending(false);
    }
  };

  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F2F5] p-4">
        <Loader2 className="w-9 h-9 animate-spin text-[#F58220]" aria-hidden />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F2F5] p-4 sm:p-6">
      <div className="w-full max-w-[420px] bg-white rounded-[1.75rem] shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] p-6 sm:p-8">
        <div className="text-center mb-6">
          <h1 className="text-[1.65rem] font-extrabold tracking-tight text-[#0f172a] mb-1.5">Нэвтрэх</h1>
          <p className="text-slate-500 text-sm font-medium">{subtitle}</p>
        </div>

        {/* Tabs: Нууц үг | OTP код */}
        <div className="flex rounded-2xl bg-slate-100/90 p-1 mb-6">
          <button
            type="button"
            onClick={() => {
              setTab('password');
              setApiError(null);
              setFieldErrors({});
            }}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 ${
              tab === 'password'
                ? 'bg-white text-[#0f172a] shadow-md shadow-slate-200/80'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Нууц үг
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('otp');
              setEmailMode(false);
              setApiError(null);
              setFieldErrors({});
            }}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 ${
              tab === 'otp'
                ? 'bg-white text-[#0f172a] shadow-md shadow-slate-200/80'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            OTP код
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          {tab === 'password' && !emailMode && (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-[0.12em] mb-2">
                Утасны дугаар
              </label>
              <div className="relative">
                <Phone
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-[1.125rem] h-[1.125rem] text-slate-400 pointer-events-none"
                  strokeWidth={2}
                />
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-[#F0F2F5] border-0 rounded-2xl text-[#0f172a] text-base font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-[#F58220]/35 focus:bg-white focus:outline-none transition-all"
                  placeholder="85552229"
                  disabled={pending}
                />
              </div>
              {fieldErrors.phone ? <p className="mt-1.5 text-sm text-red-600">{fieldErrors.phone}</p> : null}
            </div>
          )}

          {tab === 'password' && emailMode && (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-[0.12em] mb-2">
                И-мэйл
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3.5 bg-[#F0F2F5] border-0 rounded-2xl text-[#0f172a] text-base font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-[#F58220]/35 focus:bg-white focus:outline-none transition-all"
                  placeholder="you@example.com"
                  disabled={pending}
                  autoComplete="email"
                />
              </div>
              {fieldErrors.email ? <p className="mt-1.5 text-sm text-red-600">{fieldErrors.email}</p> : null}
            </div>
          )}

          {tab === 'otp' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-[0.12em] mb-2">
                Утасны дугаар
              </label>
              <div className="relative">
                <Phone
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-[1.125rem] h-[1.125rem] text-slate-400 pointer-events-none"
                  strokeWidth={2}
                />
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-[#F0F2F5] border-0 rounded-2xl text-[#0f172a] text-base font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-[#F58220]/35 focus:bg-white focus:outline-none transition-all"
                  placeholder="85552229"
                  disabled={pending}
                />
              </div>
              {fieldErrors.phone ? <p className="mt-1.5 text-sm text-red-600">{fieldErrors.phone}</p> : null}
            </div>
          )}

          {tab === 'password' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-[0.12em] mb-2">
                Нууц үг
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-[1.125rem] h-[1.125rem] text-slate-400 pointer-events-none"
                  strokeWidth={2}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-[#F0F2F5] border-0 rounded-2xl text-[#0f172a] text-base font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-[#F58220]/35 focus:bg-white focus:outline-none transition-all"
                  placeholder="••••••••"
                  disabled={pending}
                  autoComplete="current-password"
                />
              </div>
              {fieldErrors.password ? <p className="mt-1.5 text-sm text-red-600">{fieldErrors.password}</p> : null}
            </div>
          )}

          {apiError ? <p className="text-sm text-red-600 text-center">{apiError}</p> : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3.5 rounded-2xl bg-[#F58220] hover:bg-[#e97316] text-white font-bold text-[15px] shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-colors disabled:opacity-65 disabled:cursor-not-allowed"
          >
            {pending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {tab === 'otp' ? 'Код авах' : 'Нэвтрэх'}
                {tab === 'password' ? <ArrowRight className="w-5 h-5" strokeWidth={2.5} /> : null}
              </>
            )}
          </button>
        </form>

        {tab === 'password' && (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => {
                setEmailMode(!emailMode);
                setFieldErrors({});
                setApiError(null);
              }}
              className="text-xs font-semibold text-[#F58220] hover:underline"
            >
              {emailMode ? '← Утасны дугаараар нэвтрэх' : 'И-мэйлээр нэвтрэх'}
            </button>
          </div>
        )}

        <SocialAuthButtons mode="signIn" oauthRedirect={redirect} />

        <p className="text-center text-xs text-slate-400 mt-5">
          Бүртгэлгүй юу?{' '}
          <Link href="/register" className="text-[#F58220] font-bold hover:underline">
            Бүртгүүлэх
          </Link>
        </p>
      </div>
    </div>
  );
}
