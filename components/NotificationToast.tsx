'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ClientNotification } from '@/hooks/useNotifications';

const ICON_MAP: Record<string, string> = {
  product_added: '🛍️', product_coming_soon: '⏰', product_on_sale: '🔥',
  new_product: '✨', order_placed: '📦', order_confirmed: '✅',
  order_shipped: '🚚', order_delivered: '🎉', order_cancelled: '❌',
  admin_message_received: '💬', admin_message_replied: '💬',
  call_incoming: '📞', call_missed: '📞', call_transferred: '📞',
};

interface Props {
  notification: ClientNotification | null;
  onDismiss: () => void;
  onClick: (n: ClientNotification) => void;
}

interface ToastItem {
  id: string;
  notification: ClientNotification;
}

export default function NotificationToast({ notification, onDismiss, onClick }: Props) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    if (!notification) return;
    const id = `${notification._id}-${Date.now()}`;
    setToasts((prev) => {
      const next = [{ id, notification }, ...prev];
      return next.slice(0, 3); // Max 3 visible
    });
    onDismiss();
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[10000] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 380 }}>
      <AnimatePresence>
        {toasts.map((toast, i) => {
          const icon = ICON_MAP[toast.notification.type] || '🔔';
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={() => { dismiss(toast.id); onClick(toast.notification); }}
              className="pointer-events-auto cursor-pointer bg-white/98 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-gray-200/60 p-4 flex items-start gap-3 hover:shadow-lg transition-shadow"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-lg shrink-0">
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-gray-900 line-clamp-1">{toast.notification.title}</p>
                <p className="text-[13px] text-gray-500 line-clamp-1 mt-0.5">{toast.notification.body}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); dismiss(toast.id); }}
                className="text-gray-300 hover:text-gray-500 text-lg leading-none mt-0.5 shrink-0"
              >
                ×
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
