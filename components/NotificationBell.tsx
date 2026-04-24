'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, X, CheckCheck, Trash2 } from 'lucide-react';
import { useUser } from '@/context/AuthContext';
import { useNotifications, type ClientNotification } from '@/hooks/useNotifications';
import NotificationToast from './NotificationToast';

const META: Record<string, { icon: string; bg: string }> = {
  product_added: { icon: '🛍️', bg: 'rgba(59,130,246,0.08)' },
  product_coming_soon: { icon: '⏰', bg: 'rgba(249,115,22,0.08)' },
  product_on_sale: { icon: '🔥', bg: 'rgba(239,68,68,0.08)' },
  new_product: { icon: '✨', bg: 'rgba(168,85,247,0.08)' },
  order_placed: { icon: '📦', bg: 'rgba(59,130,246,0.08)' },
  order_confirmed: { icon: '✅', bg: 'rgba(34,197,94,0.08)' },
  order_shipped: { icon: '🚚', bg: 'rgba(59,130,246,0.08)' },
  order_delivered: { icon: '🎉', bg: 'rgba(34,197,94,0.08)' },
  order_cancelled: { icon: '❌', bg: 'rgba(239,68,68,0.08)' },
  admin_message_received: { icon: '💬', bg: 'rgba(59,130,246,0.08)' },
  admin_message_replied: { icon: '💬', bg: 'rgba(59,130,246,0.08)' },
  call_incoming: { icon: '📞', bg: 'rgba(34,197,94,0.08)' },
  call_missed: { icon: '📞', bg: 'rgba(239,68,68,0.08)' },
  call_transferred: { icon: '📞', bg: 'rgba(249,115,22,0.08)' },
};

function timeAgo(d: string): string {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'Дөнгөж сая';
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} цаг`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} өдөр`;
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
}

function getLink(n: ClientNotification): string | null {
  const data = n.data as Record<string, string> | undefined;
  if (data?.url) return data.url;
  if (n.type.startsWith('order_')) return '/orders';
  if (n.type.startsWith('product_') && data?.productId) return `/product/${data.productId}`;
  return null;
}

export default function NotificationBell() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const {
    notifications, unreadCount, loading,
    latestRealtime, clearLatestRealtime,
    markAsRead, markAllAsRead, deleteNotification,
  } = useNotifications();

  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const list = notifications.slice(0, 10);

  useEffect(() => {
    if (latestRealtime) { setPulse(true); const t = setTimeout(() => setPulse(false), 2000); return () => clearTimeout(t); }
  }, [latestRealtime]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const onItem = useCallback((n: ClientNotification) => {
    if (!n.isRead) markAsRead(n._id);
    const link = getLink(n);
    if (link) { setOpen(false); router.push(link); }
  }, [markAsRead, router]);

  const badge = unreadCount > 99 ? '99+' : unreadCount;

  /* Signed-out */
  if (!isSignedIn) {
    return (
      <div className="relative" ref={ref}>
        <motion.button type="button" onClick={() => setOpen(o => !o)} whileHover={{ scale: 1.15, y: -2 }} whileTap={{ scale: 0.95 }}
          className="relative p-1.5 hover:bg-gray-50 rounded-lg transition-colors group cursor-pointer" aria-label="Мэдэгдэл">
          <Bell className="w-6 h-6 text-[#1C1C1E] group-hover:text-[#FF5000] transition-colors" strokeWidth={1.8} />
        </motion.button>
        <AnimatePresence>
          {open && (<>
            <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: -6 }}
              transition={{ duration: 0.2, type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute right-[-44px] sm:right-[-90px] top-full mt-3 w-[calc(100vw-32px)] sm:w-[380px] max-w-[400px] z-[100] bg-white rounded-[24px] shadow-[0_12px_48px_rgba(0,0,0,0.12)] border border-[#E5E5EA] p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-[#1C1C1E] text-[20px]">Мэдэгдэл</span>
                <button onClick={() => setOpen(false)} className="w-[30px] h-[30px] rounded-full bg-[#F2F2F7] flex items-center justify-center text-gray-400 hover:text-gray-600">
                  <X className="w-[18px] h-[18px]" strokeWidth={2.5} /></button>
              </div>
              <div className="flex flex-col items-center py-6 gap-3">
                <div className="w-12 h-12 rounded-full bg-[#F2F2F7] flex items-center justify-center"><Bell className="w-5 h-5 text-gray-400" /></div>
                <p className="text-[14px] text-gray-500 text-center px-4">Мэдэгдэл үзэхийн тулд нэвтэрнэ үү.</p>
              </div>
              <Link href="/sign-in" onClick={() => setOpen(false)}
                className="mt-2 block w-full text-center py-3.5 bg-[#FF5000] text-white text-[15px] font-bold rounded-full shadow-[0_4px_12px_rgba(255,80,0,0.25)]">Нэвтрэх</Link>
            </motion.div>
          </>)}
        </AnimatePresence>
      </div>
    );
  }

  /* Signed-in */
  return (<>
    <NotificationToast notification={latestRealtime} onDismiss={clearLatestRealtime} onClick={(n) => { clearLatestRealtime(); onItem(n); }} />
    <div className="relative" ref={ref}>
      <motion.button type="button" onClick={() => setOpen(o => !o)} whileHover={{ scale: 1.15, y: -2 }} whileTap={{ scale: 0.95 }}
        className="relative p-1.5 hover:bg-gray-50 rounded-2xl transition-colors group cursor-pointer border border-transparent hover:border-gray-100" aria-label="Мэдэгдэл">
        <motion.div animate={pulse ? { rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.2, 1.1, 1.15, 1] } : {}} transition={{ duration: 0.6 }}>
          <Bell className={`w-6 h-6 transition-colors ${unreadCount > 0 ? 'text-[#FF5000]' : 'text-[#1C1C1E] group-hover:text-[#FF5000]'}`} strokeWidth={1.8} />
        </motion.div>
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-[#FF3B30] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              {badge}
            </motion.span>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {pulse && <motion.span initial={{ scale: 0.8, opacity: 0.8 }} animate={{ scale: 2.5, opacity: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 1 }} className="absolute inset-0 rounded-full bg-[#FF3B30]/20 pointer-events-none" />}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (<>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.96, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.2, type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute right-[-44px] sm:right-[-20px] top-full mt-3 w-[calc(100vw-32px)] sm:w-[400px] max-w-[420px] z-[9999] bg-white sm:bg-white/98 sm:backdrop-blur-3xl rounded-[24px] shadow-[0_12px_48px_rgba(0,0,0,0.15)] border border-[#E5E5EA]/60 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-3">
                <span className="font-bold text-[#1C1C1E] text-[20px]">Мэдэгдэл</span>
                {unreadCount > 0 && <span className="px-2 py-0.5 bg-[#FF5000]/10 text-[#FF5000] text-[11px] font-bold rounded-full">{unreadCount} шинэ</span>}
              </div>
              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button type="button" onClick={() => markAllAsRead()} className="p-2 rounded-full hover:bg-[#F2F2F7] text-gray-400 hover:text-[#FF5000] transition-colors" title="Бүгдийг уншсан">
                    <CheckCheck className="w-4 h-4" strokeWidth={2} />
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="w-[30px] h-[30px] rounded-full bg-[#F2F2F7] flex items-center justify-center text-gray-400 hover:text-gray-600">
                  <X className="w-[18px] h-[18px]" strokeWidth={2.5} /></button>
              </div>
            </div>
            {/* Body */}
            <div className="max-h-[60vh] overflow-y-auto overscroll-contain pb-2">
              {loading && list.length === 0 ? (
                <div className="p-10 flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-[#FF5000] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[13px] text-gray-400">Уншиж байна...</span>
                </div>
              ) : list.length === 0 ? (
                <div className="p-10 flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-[#F2F2F7] flex items-center justify-center"><Bell className="w-6 h-6 text-gray-300" /></div>
                  <span className="text-[14px] text-gray-400">Танд мэдэгдэл ирээгүй байна</span>
                </div>
              ) : (
                <ul className="flex flex-col gap-1 px-2.5">
                  <AnimatePresence initial={false}>
                    {list.map((n) => {
                      const m = META[n.type] || { icon: '🔔', bg: 'rgba(107,114,128,0.08)' };
                      return (
                        <motion.li key={n._id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
                          <div
                            className={`group flex w-full items-start rounded-[18px] active:scale-[0.98] transition-all ${!n.isRead ? 'bg-[#FF5000]/[0.04] border border-[#FF5000]/10' : 'bg-transparent border border-transparent hover:bg-[#F2F2F7]/60'}`}>
                            <button type="button" onClick={() => onItem(n)}
                              className="min-w-0 flex-1 text-left p-3.5 pr-2 flex items-start gap-3 rounded-l-[18px]">
                              <div className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 text-lg" style={{ backgroundColor: m.bg }}>{m.icon}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2 mb-0.5">
                                  <h4 className={`text-[14px] font-bold line-clamp-1 ${!n.isRead ? 'text-[#111]' : 'text-gray-700'}`}>{n.title}</h4>
                                  <span className={`text-[11px] font-semibold whitespace-nowrap ${!n.isRead ? 'text-[#FF5000]' : 'text-gray-400'}`}>{timeAgo(n.createdAt)}</span>
                                </div>
                                <p className="text-[13px] text-gray-500 line-clamp-2 leading-relaxed">{n.body}</p>
                              </div>
                            </button>
                            <button type="button" onClick={() => deleteNotification(n._id)}
                              className="opacity-0 group-hover:opacity-100 shrink-0 mt-2.5 mr-2 p-1.5 rounded-full hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all" title="Устгах">
                              <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                            </button>
                          </div>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              )}
            </div>
            {/* Footer */}
            {list.length > 0 && (
              <div className="px-3 pt-1 pb-3 border-t border-gray-100/80">
                <Link href="/notifications" onClick={() => setOpen(false)}
                  className="block w-full text-center py-3 bg-[#F2F2F7] text-[#111] text-[14px] font-bold rounded-full hover:bg-[#E5E5EA] active:scale-[0.98] transition-all">
                  Бүх мэдэгдэл харах
                </Link>
              </div>
            )}
          </motion.div>
        </>)}
      </AnimatePresence>
    </div>
  </>);
}
