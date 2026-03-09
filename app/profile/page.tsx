'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Package,
  Heart,
  MapPin,
  Bell,
  ShieldCheck,
  HelpCircle,
  FileText,
  ChevronRight,
  LogOut,
  Camera
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useWishlistStore } from '@/store/wishlistStore';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const wishlistCount = useWishlistStore(state => state.getTotalItems());
  const [stats, setStats] = useState({ orders: 0, wishlist: 0, addresses: 0 });

  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.all([
      fetch('/api/orders').then(r => r.json()),
      fetch('/api/user/addresses').then(r => r.json()),
    ]).then(([ordersData, addressData]) => {
      setStats({
        orders: ordersData.orders?.length || 0,
        wishlist: wishlistCount,
        addresses: addressData.addresses?.length || 0,
      });
    }).catch(() => { });
  }, [isAuthenticated, wishlistCount]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      if (!isAuthenticated) {
        router.push('/sign-in');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [isAuthenticated, router]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Амжилттай гарлаа');
      router.push('/');
    } catch (error) {
      toast.error('Гарахад алдаа гарлаа');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6B00]"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-[100px] relative font-sans">
      {/* 1. PROFILE HEADER SECTION */}
      <div className="relative h-[220px] bg-gradient-to-b from-[#FF6B00] to-[#FF8C00] px-4 flex flex-col items-center">
        {/* Curved Bottom Edge */}
        <div className="absolute bottom-[-1px] left-0 w-full overflow-hidden leading-[0]">
          <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none" className="block w-full h-[30px]">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118.08,130.83,121.37,189.9,109.83,235.84,101.55,278.49,76.65,321.39,56.44Z" fill="#F5F5F5"></path>
          </svg>
        </div>

        {/* Avatar Area */}
        <div className="relative mb-3 z-10">
          <div className="w-[90px] h-[90px] rounded-full border-[3px] border-white shadow-[0_4px_12px_rgba(0,0,0,0.1)] bg-white flex items-center justify-center overflow-hidden">
            {user.imageUrl ? (
              <Image
                src={user.imageUrl}
                alt={user.name || 'User'}
                width={90}
                height={90}
                className="object-cover w-full h-full"
              />
            ) : (
              <span className="text-4xl font-extrabold text-[#FF6B00]">
                {user.name ? user.name.charAt(0).toUpperCase() : 'M'}
              </span>
            )}
          </div>
          {/* Camera Button */}
          <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md border border-gray-100">
            <Camera className="w-[14px] h-[14px] text-[#FF6B00]" strokeWidth={2.5} />
          </button>
        </div>

        <h1 className="text-[20px] font-bold text-white z-10 mb-0.5 tracking-tight">
          {user.name || 'Munh'}
        </h1>
        <p className="text-[14px] text-white/80 z-10 font-medium">
          {user.phone || user.email || ''}
        </p>

        <Link href="/profile/edit" className="mt-3 px-4 py-1.5 border border-white/40 rounded-full text-white text-[12px] font-bold tracking-wide hover:bg-white/10 transition-colors z-10">
          Профайл засах
        </Link>
      </div>

      {/* 2. STATS ROW */}
      <div className="relative z-20 px-4 -mt-6 mb-6">
        <div className="bg-white rounded-[16px] shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-4 flex items-center justify-between">
          <div className="flex-1 flex flex-col items-center">
            <span className="text-[18px] font-bold text-[#FF6B00]">{stats.orders}</span>
            <span className="text-[12px] text-gray-400 font-medium mt-0.5">Захиалга</span>
          </div>
          <div className="w-[1px] h-[30px] bg-gray-100"></div>
          <div className="flex-1 flex flex-col items-center">
            <span className="text-[18px] font-bold text-[#FF6B00]">{wishlistCount}</span>
            <span className="text-[12px] text-gray-400 font-medium mt-0.5">Хадгалсан</span>
          </div>
          <div className="w-[1px] h-[30px] bg-gray-100"></div>
          <div className="flex-1 flex flex-col items-center">
            <span className="text-[18px] font-bold text-[#FF6B00]">{stats.addresses}</span>
            <span className="text-[12px] text-gray-400 font-medium mt-0.5">Хаяг</span>
          </div>
        </div>
      </div>

      {/* 3. MENU SECTIONS */}
      <div className="px-4 space-y-6">

        {/* Section 1: МИНИЙ ДАНСНЫ МЭДЭЭЛЭЛ */}
        <div>
          <h2 className="text-[11px] font-bold text-[#999999] uppercase tracking-wider ml-4 mb-2">Миний дансны мэдээлэл</h2>
          <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
            <MenuItem
              icon={Package} iconBg="#FFF0E6" iconColor="#FF6B00"
              label="Миний захиалга" href="/orders"
              subtitle="3 идэвхтэй захиалга"
            />
            <MenuDivider />
            <MenuItem
              icon={Heart} iconBg="#FFF0F5" iconColor="#EC4899"
              label="Хадгалсан бараа" href="/wishlist"
            />
            <MenuDivider />
            <MenuItem
              icon={MapPin} iconBg="#F0FFF4" iconColor="#22C55E"
              label="Хаягийн бүртгэл" href="/addresses"
            />
          </div>
        </div>

        {/* Section 2: ТОХИРГОО */}
        <div>
          <h2 className="text-[11px] font-bold text-[#999999] uppercase tracking-wider ml-4 mb-2">Тохиргоо</h2>
          <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
            <MenuItem
              icon={Bell} iconBg="#F0F5FF" iconColor="#3B82F6"
              label="Мэдэгдэл" href="/settings/notifications"
            />
            <MenuDivider />
            <MenuItem
              icon={ShieldCheck} iconBg="#F5F0FF" iconColor="#8B5CF6"
              label="Нууцлал & Аюулгүй байдал" href="/settings/security"
            />
          </div>
        </div>

        {/* Section 3: ТУСЛАМЖ */}
        <div>
          <h2 className="text-[11px] font-bold text-[#999999] uppercase tracking-wider ml-4 mb-2">Тусламж</h2>
          <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
            <MenuItem
              icon={HelpCircle} iconBg="#FFFBF0" iconColor="#F59E0B"
              label="Тусламж & Дэмжлэг" href="/support"
            />
            <MenuDivider />
            <MenuItem
              icon={FileText} iconBg="#F5F5F5" iconColor="#6B7280"
              label="Үйлчилгээний нөхцөл" href="/terms"
            />
          </div>
        </div>

        {/* Section 4: БУСАД */}
        <div>
          <h2 className="text-[11px] font-bold text-[#999999] uppercase tracking-wider ml-4 mb-2">Бусад</h2>
          <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-4 h-[64px] active:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-[48px] h-[48px] rounded-[10px] bg-[#FFF5F5] flex items-center justify-center shrink-0">
                  <LogOut className="w-6 h-6 text-[#FF3B30]" strokeWidth={2} />
                </div>
                <span className="text-[15px] font-bold text-[#FF3B30]">Гарах</span>
              </div>
            </button>
          </div>
        </div>

        <p className="text-center text-[12px] text-[#CCCCCC] mt-8 mb-4 font-medium">
          Soyol v1.0.0
        </p>

      </div>
    </div>
  );
}

function MenuItem({
  icon: Icon, iconBg, iconColor, label, href, subtitle
}: {
  icon: any, iconBg: string, iconColor: string, label: string, href: string, subtitle?: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-4 h-[64px] active:bg-gray-50 transition-colors"
    >
      <div className="flex items-center gap-4 w-full">
        {/* Soft rounded square icon wrapper */}
        <div
          className="w-[48px] h-[48px] rounded-[10px] flex items-center justify-center shrink-0"
          style={{ backgroundColor: iconBg }}
        >
          <Icon className="w-6 h-6" style={{ color: iconColor }} strokeWidth={2} />
        </div>
        <div className="flex flex-col flex-1 justify-center min-w-0">
          <span className="text-[15px] font-bold text-[#1A1A1A] leading-tight truncate">{label}</span>
          {subtitle && (
            <span className="text-[12px] text-[#999999] mt-0.5 truncate">{subtitle}</span>
          )}
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-[#CCCCCC] shrink-0 ml-2" strokeWidth={2} />
    </Link>
  );
}

function MenuDivider() {
  return (
    <div className="ml-[80px] h-[1px] bg-[#F5F5F5]" />
  );
}
