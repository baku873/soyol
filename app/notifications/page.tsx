'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Trash2, ArrowLeft, ChevronDown } from 'lucide-react';
import { useNotifications, type ClientNotification } from '@/hooks/useNotifications';
import { useUser } from '@/context/AuthContext';

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

type FilterTab = 'all' | 'unread' | 'orders' | 'products' | 'system';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Бүгд' },
  { key: 'unread', label: 'Уншаагүй' },
  { key: 'orders', label: 'Захиалга' },
  { key: 'products', label: 'Бүтээгдэхүүн' },
  { key: 'system', label: 'Систем' },
];

function filterNotifications(items: ClientNotification[], tab: FilterTab): ClientNotification[] {
  switch (tab) {
    case 'unread': return items.filter((n) => !n.isRead);
    case 'orders': return items.filter((n) => n.type.startsWith('order_'));
    case 'products': return items.filter((n) => n.type.startsWith('product_') || n.type === 'new_product');
    case 'system': return items.filter((n) => n.type.startsWith('admin_') || n.type.startsWith('call_'));
    default: return items;
  }
}

function timeAgo(d: string): string {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'Дөнгөж сая';
  if (m < 60) return `${m} мин өмнө`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} цагийн өмнө`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} өдрийн өмнө`;
  const dt = new Date(d);
  return `${dt.getFullYear()}.${dt.getMonth() + 1}.${dt.getDate()}`;
}

function getLink(n: ClientNotification): string | null {
  const data = n.data as Record<string, string> | undefined;
  if (data?.url) return data.url;
  if (n.type.startsWith('order_')) return '/orders';
  if (n.type.startsWith('product_') && data?.productId) return `/product/${data.productId}`;
  return null;
}

export default function NotificationsPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const {
    notifications, unreadCount, loading, hasMore,
    markAsRead, markAllAsRead, deleteNotification, loadMore,
  } = useNotifications();

  const [tab, setTab] = useState<FilterTab>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = filterNotifications(notifications, tab);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const deleteSelected = useCallback(async () => {
    const ids = Array.from(selected);
    for (const id of ids) await deleteNotification(id);
    setSelected(new Set());
  }, [selected, deleteNotification]);

  const onItem = useCallback((n: ClientNotification) => {
    if (!n.isRead) markAsRead(n._id);
    const link = getLink(n);
    if (link) router.push(link);
  }, [markAsRead, router]);

  if (!isLoaded) return <div className="min-h-screen" />;
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-16 h-16 rounded-full bg-[#F2F2F7] flex items-center justify-center">
          <Bell className="w-7 h-7 text-gray-400" />
        </div>
        <p className="text-gray-500 text-center">Мэдэгдэл үзэхийн тулд нэвтэрнэ үү</p>
        <Link href="/sign-in" className="px-8 py-3 bg-[#FF5000] text-white font-bold rounded-full">Нэвтрэх</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" strokeWidth={2} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Мэдэгдэл</h1>
          {unreadCount > 0 && (
            <span className="px-2.5 py-1 bg-[#FF5000]/10 text-[#FF5000] text-xs font-bold rounded-full">{unreadCount}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button onClick={deleteSelected} className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-colors">
              <Trash2 className="w-4 h-4" /> {selected.size} устгах
            </button>
          )}
          {unreadCount > 0 && (
            <button onClick={() => markAllAsRead()} className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-[#FF5000] bg-[#FF5000]/10 rounded-xl hover:bg-[#FF5000]/15 transition-colors">
              <CheckCheck className="w-4 h-4" /> Бүгдийг уншсан
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap transition-all ${tab === t.key ? 'bg-[#FF5000] text-white shadow-md shadow-orange-500/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading && filtered.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#FF5000] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
            <Bell className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-400 font-medium">{tab === 'unread' ? 'Уншаагүй мэдэгдэл алга' : 'Мэдэгдэл алга'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {filtered.map((n) => {
              const m = META[n.type] || { icon: '🔔', bg: 'rgba(107,114,128,0.08)' };
              const isSelected = selected.has(n._id);
              return (
                <motion.div key={n._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`relative p-4 rounded-2xl transition-all flex items-start gap-3 group cursor-pointer border
                    ${!n.isRead ? 'bg-[#FF5000]/[0.03] border-[#FF5000]/10' : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'}
                    ${isSelected ? 'ring-2 ring-[#FF5000]/30' : ''}`}
                  onClick={() => onItem(n)}
                >
                  {/* Checkbox */}
                  <button onClick={(e) => { e.stopPropagation(); toggleSelect(n._id); }}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-1 transition-all
                      ${isSelected ? 'bg-[#FF5000] border-[#FF5000] text-white' : 'border-gray-300 hover:border-[#FF5000]'}`}>
                    {isSelected && <span className="text-[10px] font-bold">✓</span>}
                  </button>
                  {/* Icon */}
                  <div className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 text-xl" style={{ backgroundColor: m.bg }}>{m.icon}</div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h3 className={`text-[15px] font-bold line-clamp-1 ${!n.isRead ? 'text-gray-900' : 'text-gray-700'}`}>{n.title}</h3>
                      <span className={`text-[11px] font-medium whitespace-nowrap ${!n.isRead ? 'text-[#FF5000]' : 'text-gray-400'}`}>{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="text-[13px] text-gray-500 line-clamp-2 leading-relaxed">{n.body}</p>
                  </div>
                  {/* Delete */}
                  <button onClick={(e) => { e.stopPropagation(); deleteNotification(n._id); }}
                    className="opacity-0 group-hover:opacity-100 p-2 rounded-xl hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all shrink-0" title="Устгах">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Load More */}
          {hasMore && (
            <button onClick={loadMore} disabled={loading}
              className="mt-4 w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
              {loading ? <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> : <><ChevronDown className="w-4 h-4" /> Цааш үзэх</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
