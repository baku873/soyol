'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  User, ShoppingBag, Heart, Settings,
  Package, TrendingUp, Clock, CheckCircle,
  XCircle, Loader2, LogOut
} from 'lucide-react';
import { useUser, useAuth } from '@/context/AuthContext';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { formatPrice } from '@/lib/utils';

interface Order {
  _id: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  items: any;
}

export default function DashboardPage() {
  const { user, isSignedIn, isLoaded } = useUser();
  const { logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'wishlist' | 'settings'>('overview');

  const cartItemsCount = useCartStore((state) => state.getTotalItems());
  const wishlistItemsCount = useWishlistStore((state) => state.getTotalItems());

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => setOrders(data.orders || []))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (!isSignedIn || !user) return null;

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      case 'cancelled': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <Clock className="w-5 h-5 text-orange-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Хүлээгдэж байна';
      case 'processing': return 'Боловсруулж байна';
      case 'shipped': return 'Илгээгдсэн';
      case 'completed': return 'Хүргэгдсэн';
      case 'cancelled': return 'Цуцлагдсан';
      default: return status;
    }
  };

  const userName = user.fullName || user.firstName || 'Хэрэглэгч';
  const userEmail = user.primaryEmailAddress?.emailAddress || '';

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-4 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-1"
          >
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sticky top-24">
              <div className="text-center mb-6 pb-6 border-b border-slate-200">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full text-white text-2xl font-bold mb-4 shadow-lg">
                  {user.imageUrl ? (
                    <img src={user.imageUrl} alt={userName} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    getInitials(userName)
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">{userName}</h3>
                <p className="text-sm text-slate-600">{userEmail}</p>
              </div>

              <nav className="space-y-1">

                <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'orders' ? 'bg-orange-50 text-orange-600' : 'text-slate-700 hover:bg-slate-50'}`}>
                  <Package className="w-5 h-5" strokeWidth={2} />
                  <span className="font-medium">Захиалгын түүх</span>
                </button>
                <Link href="/wishlist">
                  <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-slate-700 hover:bg-slate-50">
                    <Heart className="w-5 h-5" strokeWidth={2} />
                    <span className="font-medium">Хүслийн жагсаалт</span>
                  </button>
                </Link>
                <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-orange-50 text-orange-600' : 'text-slate-700 hover:bg-slate-50'}`}>
                  <Settings className="w-5 h-5" strokeWidth={2} />
                  <span className="font-medium">Тохиргоо</span>
                </button>
                <button onClick={() => logout()} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-red-600 hover:bg-red-50 mt-4 border-t border-slate-200 pt-4">
                  <LogOut className="w-5 h-5" strokeWidth={2} />
                  <span className="font-medium">Гарах</span>
                </button>
              </nav>
            </div>
          </motion.div>

          <div className="lg:col-span-3">
            {activeTab === 'orders' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Захиалгын түүх</h2>
                {orders.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600 mb-4">Та хараахан захиалга өгөөгүй байна</p>
                    <Link href="/"><button className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full font-medium hover:from-orange-600 hover:to-orange-700 transition-all">Худалдан авалт хийх</button></Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order._id} className="p-6 border border-slate-200 rounded-xl hover:border-orange-300 transition-colors">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <p className="font-bold text-slate-900 mb-1">Захиалга #{order._id.slice(0, 8)}</p>
                            <p className="text-sm text-slate-600">{new Date(order.createdAt).toLocaleDateString('mn-MN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(order.status)}
                            <span className="text-sm font-medium">{getStatusText(order.status)}</span>
                          </div>
                        </div>
                        <div className="pt-4 border-t border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Нийт дүн:</span>
                            <span className="text-lg font-bold text-slate-900">{formatPrice(order.totalPrice)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
            {activeTab === 'settings' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Тохиргоо</h2>
                <p className="text-slate-600">Тохиргоо удахгүй нэмэгдэнэ...</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
