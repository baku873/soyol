'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { ShoppingBag, User, Phone, MapPin, CreditCard, Package, ChevronRight, Plus, Check, X } from 'lucide-react';
import { useCartStore } from '@store/cartStore';
import { formatPrice } from '@lib/utils';
import type { OrderFormData } from "@/types/Order";
import toast from 'react-hot-toast';
import { useUser } from '@/context/AuthContext';
import useSWR from 'swr';
import QPay from '@/components/checkout/QPay';

interface Address {
  id: string;
  label?: string;
  city: string;
  district: string;
  khoroo: string;
  street: string;
  entrance?: string;
  floor?: string;
  door?: string;
  note?: string;
  isDefault: boolean;
}

const UB_DISTRICTS = [
  'Баянзүрх',
  'Баянгол',
  'Сүхбаатар',
  'Чингэлтэй',
  'Хан-Уул',
  'Сонгинохайрхан',
  'Налайх',
  'Багануур',
  'Багахангай'
];

const PROVINCES = [
  'Архангай',
  'Баян-Өлгий',
  'Баянхонгор',
  'Булган',
  'Говь-Алтай',
  'Говьсүмбэр',
  'Дархан-Уул',
  'Дорнод',
  'Дорноговь',
  'Дундговь',
  'Завхан',
  'Орхон',
  'Өвөрхангай',
  'Өмнөговь',
  'Сүхбаатар',
  'Сэлэнгэ',
  'Төв',
  'Увс',
  'Ховд',
  'Хөвсгөл',
  'Хэнтий'
];

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch addresses');
  const data = await res.json();
  return data.addresses || [];
};

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isSignedIn } = useUser();
  const { items, getSelectedTotalPrice, removeItem } = useCartStore();
  const selectedItems = items.filter(item => item.selected);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [addressTab, setAddressTab] = useState<'saved' | 'new'>(isSignedIn ? 'saved' : 'new');
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isAddressSheetOpen, setIsAddressSheetOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('qpay');

  const { data: addresses, isLoading: isLoadingAddresses } = useSWR<Address[]>(
    user ? '/api/user/addresses' : null,
    fetcher
  );

  const [formData, setFormData] = useState<OrderFormData>({
    fullName: '',
    phone: '',
    label: '',
    address: '',
    city: 'Улаанбаатар',
    district: '',
    khoroo: '',
    street: '',
    apartment: '',
    entrance: '',
    floor: '',
    door: '',
    notes: '',
  });

  const [saveAddress, setSaveAddress] = useState(true);
  const [showAllAddresses, setShowAllAddresses] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<{ id: string; total: number } | null>(null);

  // Auto-fill user info
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: user.name || '',
        phone: user.phone || '',
      }));
    }
  }, [user]);

  // Handle address loading and default selection
  useEffect(() => {
    if (addresses && addresses.length > 0) {
      const addressId = searchParams?.get('addressId');
      const isNewAddress = searchParams?.get('newAddress');

      if (addressId) {
        const addr = addresses.find(a => a.id === addressId);
        if (addr) {
          setSelectedAddressId(addr.id);
          handleAddressSelect(addr);
          setAddressTab('saved');
          return;
        }
      }

      if (isNewAddress) {
        setAddressTab('new');
        setFormData(prev => ({ ...prev, address: '', district: '', notes: '', label: '' }));
        setSelectedAddressId(null);
        return;
      }

      const defaultAddr = addresses.find(a => a.isDefault) || addresses[0];
      if (!selectedAddressId) {
        setSelectedAddressId(defaultAddr.id);
        handleAddressSelect(defaultAddr);
      }
      setAddressTab('saved');
    } else if (addresses && addresses.length === 0) {
      setAddressTab('new');
    }
  }, [addresses, searchParams]);

  const handleAddressSelect = (addr: Address) => {
    setSelectedAddressId(addr.id);
    setFormData(prev => ({
      ...prev,
      city: addr.city,
      district: addr.district,
      khoroo: addr.khoroo || '',
      street: addr.street || '',
      entrance: addr.entrance || '',
      floor: addr.floor || '',
      door: addr.door || '',
      address: `${addr.khoroo || ''}-${addr.city === 'Улаанбаатар' ? 'р хороо' : 'р баг'}, ${addr.street || ''}, ${addr.entrance ? `Орц: ${addr.entrance}, ` : ''}${addr.floor ? `Давхар: ${addr.floor}, ` : ''}${addr.door ? `Хаалга: ${addr.door}` : ''}`,
      notes: addr.note || '',
    }));
  };

  // Calculate delivery fee from highest per-product deliveryFee
  const maxDeliveryFee = selectedItems.reduce((max, item) => {
    const fee = (item as any).deliveryFee ?? 0;
    return Math.max(max, fee);
  }, 0);
  const DELIVERY_FEE = deliveryMethod === 'delivery' ? maxDeliveryFee : 0;
  const grandTotal = getSelectedTotalPrice() + DELIVERY_FEE;

  const hasPreOrder = selectedItems.some(item => (item as any).stockStatus === 'pre-order');
  const inStockCount = selectedItems.filter(item => (item as any).stockStatus !== 'pre-order').length;
  const preOrderCount = selectedItems.filter(item => (item as any).stockStatus === 'pre-order').length;
  const deliveryEstimate = hasPreOrder ? '7-14 хоног' : 'Өнөөдөр - Маргааш';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'city') {
      setFormData(prev => ({ ...prev, city: value, district: '' }));
    } else {
      setFormData(prev => {
        const next = { ...prev, [name]: value };
        // Auto-generate composite address string if it's a granular field change
        if (['khoroo', 'street', 'apartment', 'entrance', 'floor', 'door'].includes(name)) {
          next.address = `${next.khoroo || ''}-${next.city === 'Улаанбаатар' ? 'р хороо' : 'р баг'}, ${next.street || ''}, ${next.entrance ? `Орц: ${next.entrance}, ` : ''}${next.floor ? `Давхар: ${next.floor}, ` : ''}${next.door ? `Хаалга: ${next.door}` : ''}`;
        }
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    if (!formData.fullName.trim()) { toast.error('Нэрээ оруулна уу'); return false; }
    if (!formData.phone.trim() || formData.phone.length < 8) { toast.error('Утасны дугаараа зөв оруулна уу'); return false; }

    if (deliveryMethod === 'delivery') {
      if (!formData.address.trim()) { toast.error('Хаягаа оруулна уу'); return false; }
      if (!formData.district.trim()) {
        toast.error(formData.city === 'Улаанбаатар' ? 'Дүүргээ сонгоно уу' : 'Аймгаа сонгоно уу');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) { toast.error('Таны сагс хоосон байна'); return; }
    if (!validateForm()) return;
    setIsSubmitting(true);

    try {
      const cartItems = selectedItems.map(item => ({
        id: item.id,
        productId: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        quantity: item.quantity,
        variantId: item.variantId,
        selectedOptions: item.selectedOptions
      }));

      const orderData = {
        items: cartItems,
        // ОВОГ НЭРИЙГ ЗАССАН ХЭСЭГ: formData.fullName-ээр шууд авна
        fullName: formData.fullName,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        district: formData.district,
        notes: formData.notes,
        status: 'pending',
        hasPreOrder,
        deliveryEstimate,
        paymentMethod,
        deliveryMethod,
        shipping: deliveryMethod === 'delivery' ? formData : {
          ...formData,
          address: 'Store Pickup',
          city: 'Ulaanbaatar',
          district: 'Sukhbaatar'
        },
        shippingCost: DELIVERY_FEE,
        saveAddress: saveAddress && addressTab === 'new',
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create order');

      toast.success('Захиалга амжилттай бүртгэгдлээ!', {
        duration: 3000,
        position: 'top-center',
        style: { background: '#FF7900', color: 'white', fontWeight: 'bold', borderRadius: '12px', padding: '16px' },
      });

      // Only remove successfully ordered (selected) items from cart
      selectedItems.forEach(item => removeItem(item.cartItemId));

      if (paymentMethod === 'qpay') {
        setCreatedOrder({ id: data.orderId, total: grandTotal });
      } else {
        router.push(`/success?orderId=${data.orderId}`);
      }
    } catch {
      toast.error('Алдаа гарлаа');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdOrder) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <QPay
            orderId={createdOrder.id}
            amount={createdOrder.total}
            onSuccess={() => router.push(`/success?orderId=${createdOrder.id}`)}
          />
        </motion.div>
      </div>
    );
  }

  if (selectedItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <ShoppingBag className="w-24 h-24 mx-auto text-gray-300" />
            <h1 className="text-3xl font-black text-gray-900">Таны сагс хоосон байна</h1>
            <p className="text-gray-600">Эхлээд бараа сонгоно уу</p>
            <motion.a whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} href="/" className="inline-block px-8 py-4 bg-soyol text-white font-bold rounded-2xl shadow-lg glow-orange">
              Нүүр хуудас руу буцах
            </motion.a>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-8">
          <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors">
            <div className="p-1.5 bg-white rounded-lg border border-gray-200 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </div>
            <span className="text-sm font-medium">Буцах</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">Захиалга баталгаажуулах</h1>
          <p className="text-sm sm:text-base text-gray-600">Хүргэлтийн мэдээллээ оруулна уу</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-6 sm:gap-8 pb-[160px] lg:pb-0">
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Method Toggle */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                <div className="p-2.5 bg-orange-50 rounded-xl"><Package className="w-5 h-5 text-orange-600" /></div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Хүргэлтийн төрөл</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setDeliveryMethod('delivery')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${deliveryMethod === 'delivery' ? 'border-orange-500 bg-orange-50/50 text-orange-700' : 'border-gray-100 hover:border-orange-200 text-gray-600'}`}
                >
                  <Package className={`w-8 h-8 ${deliveryMethod === 'delivery' ? 'text-orange-600' : 'text-gray-400'}`} />
                  <span className="font-bold">Хүргэлтээр авах</span>
                  <span className="text-xs font-medium px-2 py-1 bg-white rounded-full border border-gray-200">{maxDeliveryFee > 0 ? `${maxDeliveryFee.toLocaleString()}₮` : 'Үнэгүй'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMethod('pickup')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${deliveryMethod === 'pickup' ? 'border-orange-500 bg-orange-50/50 text-orange-700' : 'border-gray-100 hover:border-orange-200 text-gray-600'}`}
                >
                  <MapPin className={`w-8 h-8 ${deliveryMethod === 'pickup' ? 'text-orange-600' : 'text-gray-400'}`} />
                  <span className="font-bold">Өөрөө ирж авах</span>
                  <span className="text-xs font-medium px-2 py-1 bg-white rounded-full border border-gray-200">Үнэгүй</span>
                </button>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                <div className="p-2.5 bg-orange-50 rounded-xl"><User className="w-5 h-5 text-orange-600" /></div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Хэрэглэгчийн мэдээлэл</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs uppercase font-bold text-gray-500 mb-1.5 ml-1">Овог нэр <span className="text-red-500">*</span></label>
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} placeholder="Жишээ: Бат Болд" className="w-full px-4 py-3 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none font-medium text-base" required />
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold text-gray-500 mb-1.5 ml-1">Утасны дугаар <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="99119911" className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none font-medium text-base" required />
                  </div>
                </div>
              </div>
            </motion.div>

            {deliveryMethod === 'delivery' ? (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-orange-50 rounded-xl"><MapPin className="w-5 h-5 text-orange-600" /></div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">Хүргэлтийн хаяг</h2>
                  </div>
                </div>

                {/* Selected Address Card */}
                {selectedAddressId ? (() => {
                  const addr = addresses?.find(a => a.id === selectedAddressId);
                  return addr || addressTab === 'new' ? (
                    <div
                      onClick={() => setIsAddressSheetOpen(true)}
                      className="p-4 rounded-xl border border-gray-200 hover:border-orange-500 bg-white cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-100 transition-colors">
                          <MapPin className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-gray-900">{addressTab === 'new' ? (formData.label || 'Шинэ хаяг') : (addr?.label || 'Гэрийн хаяг')}</span>
                            {addr?.isDefault && <span className="text-[10px] bg-[#FF6B00] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Үндсэн</span>}
                            {addressTab === 'new' && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">Бүртгэлгүй хаяг</span>}
                          </div>
                          <p className="text-sm text-gray-600 font-medium line-clamp-2">
                            {formData.district}, {formData.khoroo ? `${formData.khoroo}-р хороо` : ''}, {formData.street}
                            {formData.entrance && `, Орц: ${formData.entrance}`}
                            {formData.floor && `, Давхар: ${formData.floor}`}
                            {formData.door && `, Хаалга: ${formData.door}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[11px] font-bold text-orange-600 uppercase tracking-widest">Солих</span>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                      </div>
                    </div>
                  ) : null;
                })() : (
                  <button
                    type="button"
                    onClick={() => setIsAddressSheetOpen(true)}
                    className="w-full p-5 rounded-xl border-2 border-dashed border-gray-200 hover:border-orange-500 bg-gray-50 hover:bg-orange-50/50 transition-all flex items-center justify-center gap-2 text-gray-500 hover:text-orange-600 font-bold"
                  >
                    <Plus className="w-5 h-5" strokeWidth={2.5} />
                    Хаяг сонгох эсвэл нэмэх
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                  <div className="p-2.5 bg-orange-50 rounded-xl"><MapPin className="w-5 h-5 text-orange-600" /></div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">[Бэлэн] бараа авах цэг</h2>
                </div>
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-orange-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Төв салбар</h4>
                      <p className="text-sm text-gray-600 mb-2">Ундрам плаза Unic office 5давхар 501тоот</p>
                      <p className="text-sm text-gray-600"><span className="font-semibold">Цагийн хуваарь:</span> 10:00 - 20:00 (Өдөр бүр)</p>
                      <p className="text-sm text-gray-600 mt-1"><span className="font-semibold">Утас:</span> 77181818</p>

                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs text-orange-600 font-medium bg-orange-50 px-3 py-2 rounded-lg inline-block">
                          💡 Та захиалгаа баталгаажуулсны дараа очиж авах боломжтой.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}


          </div>

          <div className="lg:col-span-1">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 lg:sticky lg:top-24">
              <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                <div className="p-2.5 bg-orange-50 rounded-xl"><Package className="w-5 h-5 text-orange-600" /></div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Захиалгын хураангуй</h2>
              </div>
              <div className="space-y-4 mb-6 max-h-60 sm:max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                {selectedItems.map((item, idx) => (
                  <div key={item.id || idx} className="flex gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors">
                    <div className="relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden border border-gray-100">
                      <Image src={item.image || '/placeholder.png'} alt={item.name} fill className="object-cover" sizes="56px" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h4 className="text-sm font-bold text-gray-900 line-clamp-1">{item.name}</h4>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-gray-500">Тоо: {item.quantity}</p>
                        <p className="text-sm font-bold text-orange-600">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Delivery Time Info Box */}
              {preOrderCount === 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-green-600">✅</span>
                    <span className="font-bold text-green-700 text-sm">Бүх бараа бэлэн байна</span>
                  </div>
                  <p className="text-xs text-green-600 pl-6">Хүргэлт: Өнөөдөр - Маргааш</p>
                </div>
              ) : inStockCount === 0 ? (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-orange-600">✈️</span>
                    <span className="font-bold text-orange-700 text-sm">[Захиалгаар] ирэх бараа</span>
                  </div>
                  <p className="text-xs text-orange-600 pl-6">Хүргэлт: 7-14 хоног</p>
                  <p className="text-xs text-orange-600 pl-6 mt-1">Бараа ирмэгц танд мэдэгдэнэ</p>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-yellow-600">⚠️</span>
                    <span className="font-bold text-yellow-700 text-sm">Хоёр төрлийн бараа байна</span>
                  </div>
                  <div className="pl-6 text-xs text-yellow-600 space-y-1">
                    <p>• {inStockCount} бэлэн бараа</p>
                    <p>• {preOrderCount} захиалгын бараа</p>
                    <p className="font-medium mt-1">Хүргэлт: 7-14 хоног (хамт хүргэнэ)</p>
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-6 border-t border-dashed border-gray-200">
                <div className="flex justify-between text-sm text-gray-600"><span>Барааны үнэ:</span><span className="font-bold">{formatPrice(getSelectedTotalPrice())}</span></div>
                <div className="flex justify-between text-sm text-gray-600"><span>Хүргэлт:</span><span className="font-bold text-gray-900">{DELIVERY_FEE === 0 ? '0₮' : formatPrice(DELIVERY_FEE)}</span></div>
                <div className="flex justify-between text-lg font-black pt-3 border-t border-gray-100"><span>Нийт:</span><span className="text-orange-600">{formatPrice(grandTotal)}</span></div>
              </div>

              {/* Payment Method Selector */}
              <div className="mt-6 mb-6 pt-6 border-t border-dashed border-gray-200">
                <h3 className="text-sm font-bold text-gray-900 mb-3">💳 Төлбөрийн арга</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'qpay', icon: '📱', label: 'QR кодоор', title: 'QPay' },
                    { id: 'bank', icon: '🏦', label: 'Хаан банк', title: 'Дансаар' },
                  ].map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${paymentMethod === method.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-200 hover:bg-gray-50'
                        }`}
                    >
                      <div className="font-bold text-gray-900 text-sm mb-0.5 flex items-center gap-2">
                        <span>{method.icon}</span>
                        {method.title}
                      </div>
                      <div className="text-[10px] text-gray-500 font-medium">{method.label}</div>
                      {paymentMethod === method.id && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-500" />
                      )}
                    </button>
                  ))}
                </div>

                {paymentMethod === 'bank' && (
                  <div className="mt-3 p-4 border-2 border-dashed border-orange-200 rounded-xl bg-orange-50 flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">🏦</span>
                      <p className="text-sm font-bold text-gray-900">Банкны шилжүүлэг</p>
                    </div>
                    <div className="space-y-1.5 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Банк:</span>
                        <span className="font-bold text-gray-900">Хаан банк</span>
                      </div>
                      <div className="flex justify-between">
                        <span>IBAN:</span>
                        <span className="font-bold text-gray-900">MN83000500</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Данс:</span>
                        <span className="font-bold text-gray-900">5664240180</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Хүлээн авагч:</span>
                        <span className="font-bold text-gray-900">Battogtokh khukhuu</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-orange-100">
                        <span>Гүйлгээний утга:</span>
                        <span className="font-black text-orange-600">Утасны дугаараа бичнэ үү</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="hidden lg:block">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={isSubmitting} className="w-full mt-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-orange-500/40 transition-all">
                  {isSubmitting ? (<><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Боловсруулж байна...</span></>) : (<><CreditCard className="w-5 h-5" /><span>Захиалга өгөх</span></>)}
                </motion.button>
                <p className="text-[10px] text-gray-400 text-center mt-4">Захиалга өгснөөр та манай <a href="#" className="text-orange-600 hover:underline">үйлчилгээний нөхцөл</a>-тэй танилцаж зөвшөөрсөн гэж үзнэ</p>
              </div>
            </motion.div>
          </div>

          {/* Mobile Fixed Bottom Button */}
          <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+56px)] left-0 right-0 bg-white border-t border-gray-100 p-4 lg:hidden z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto mb-2">
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">Нийт төлөх</span>
                <span className="text-lg font-black text-gray-900">{formatPrice(grandTotal)}</span>
              </div>
              <motion.button whileTap={{ scale: 0.95 }} type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting ? (<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />) : (<><span>Захиалга өгөх</span><CreditCard className="w-4 h-4 ml-1" /></>)}
              </motion.button>
            </div>
          </div>
        </form>

      </div>

      {/* Address Selection Bottom Sheet */}
      <AnimatePresence>
        {isAddressSheetOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsAddressSheetOpen(false);
                if (!selectedAddressId) setAddressTab('saved');
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative bg-white w-full max-w-lg rounded-t-[30px] sm:rounded-[30px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="p-5 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-10">
                <h3 className="text-lg font-bold text-gray-900">
                  {addressTab === 'new' ? 'Шинэ хаяг нэмэх' : 'Хүргэлтийн хаяг сонгох'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    if (addressTab === 'new' && addresses && addresses.length > 0) {
                      setAddressTab('saved');
                    } else {
                      setIsAddressSheetOpen(false);
                      if (!selectedAddressId) setAddressTab('saved');
                    }
                  }}
                  className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <X className="w-5 h-5" strokeWidth={2.5} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-gray-50/50">
                {addressTab === 'saved' ? (
                  <div className="space-y-3">
                    {addresses && addresses.length > 0 ? (
                      <>
                        {[...addresses]
                          .reverse()
                          .sort((a, b) => (a.isDefault === b.isDefault ? 0 : a.isDefault ? -1 : 1))
                          .map((addr) => (
                            <div
                              key={addr.id}
                              onClick={() => {
                                handleAddressSelect(addr);
                                setAddressTab('saved');
                                setIsAddressSheetOpen(false);
                              }}
                              className={`p-5 rounded-[20px] border-2 cursor-pointer transition-all flex items-start gap-4 ${selectedAddressId === addr.id
                                  ? 'border-orange-500 bg-orange-50/30 shadow-[0_4px_20px_rgba(249,115,22,0.1)]'
                                  : 'border-transparent bg-white shadow-sm hover:border-orange-200'
                                }`}
                            >
                              <div className={`mt-1 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${selectedAddressId === addr.id ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-orange-50 text-orange-500'}`}>
                                <MapPin className="w-6 h-6" strokeWidth={2.5} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-[16px] font-bold text-gray-900">{addr.label || 'Гэрийн хаяг'}</h3>
                                  {addr.isDefault && <span className="text-[10px] bg-[#FF6B00] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Үндсэн</span>}
                                  {selectedAddressId === addr.id && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold ml-auto flex items-center gap-1"><Check className="w-3 h-3" />Сонгосон</span>}
                                </div>
                                <p className="text-[14px] text-gray-600 font-medium leading-[1.6]">
                                  {addr.city}, {addr.district}, {addr.khoroo}-р хороо
                                </p>
                                <p className="text-[13px] text-gray-400 mt-1">
                                  {addr.street} {addr.entrance && `, Орц: ${addr.entrance}`} {addr.floor && `, Давхар: ${addr.floor}`} {addr.door && `, Хаалга: ${addr.door}`}
                                </p>
                              </div>
                            </div>
                          ))}

                        <button
                          type="button"
                          onClick={() => {
                            setAddressTab('new');
                            setFormData(prev => ({ ...prev, address: '', district: '', khoroo: '', street: '', entrance: '', floor: '', door: '', notes: '' }));
                            setSelectedAddressId(null);
                          }}
                          className="w-full mt-4 p-5 rounded-[20px] border-2 border-dashed border-gray-200 hover:border-orange-500 bg-white hover:bg-orange-50/50 transition-all flex flex-col items-center justify-center gap-3 text-gray-500 hover:text-orange-600 group active:scale-[0.98]"
                        >
                          <div className="w-12 h-12 rounded-full bg-gray-50 group-hover:bg-white flex items-center justify-center transition-colors">
                            <Plus className="w-6 h-6" strokeWidth={2.5} />
                          </div>
                          <span className="font-bold text-sm tracking-wide">Шинэ хаяг нэмэх</span>
                        </button>
                      </>
                    ) : (
                      <div className="text-center py-12 bg-white rounded-[20px] border border-gray-100 shadow-sm">
                        <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-5">
                          <MapPin className="w-10 h-10 text-orange-500" />
                        </div>
                        <h3 className="text-[18px] font-bold text-gray-900 mb-3">Одоогоор хаяг байхгүй байна</h3>
                        <p className="text-[15px] text-gray-500 mb-8 max-w-[250px] mx-auto leading-relaxed">Та хүргэлтийн хаягаа нэмснээр захиалга хийхэд хялбар болох болно.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setAddressTab('new');
                            setFormData(prev => ({ ...prev, address: '', district: '', notes: '' }));
                          }}
                          className="px-8 py-3.5 bg-[#1A1A1A] text-white text-[15px] font-bold rounded-xl active:scale-95 transition-transform"
                        >
                          Шинэ хаяг нэмэх
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-5 bg-white p-5 rounded-[20px] border border-gray-100 shadow-sm">
                    {/* The new address form inputs */}
                    <div>
                      <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Хаягийн нэр</label>
                      <input
                        type="text"
                        name="label"
                        value={formData.label || ''}
                        onChange={handleInputChange}
                        placeholder="Гэр, Ажил г.м"
                        className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border-2 border-gray-50 focus:bg-white focus:border-orange-200 transition-all outline-none font-medium text-[15px] text-gray-900"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Хот / Аймаг</label>
                        <select
                          name="city"
                          value={formData.city || 'Улаанбаатар'}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border-2 border-gray-50 focus:bg-white focus:border-orange-200 transition-all outline-none font-medium text-[15px] appearance-none"
                        >
                          <option value="Улаанбаатар">Улаанбаатар</option>
                          <option value="Орон нутаг">Орон Нутаг</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                          {formData.city === 'Улаанбаатар' ? 'Дүүрэг' : 'Аймаг'}
                        </label>
                        <select
                          name="district"
                          value={formData.district || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border-2 border-gray-50 focus:bg-white focus:border-orange-200 transition-all outline-none font-medium text-[15px] appearance-none"
                        >
                          <option value="">Сонгох...</option>
                          {formData.city === 'Улаанбаатар' ? (
                            UB_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)
                          ) : (
                            PROVINCES.map(p => <option key={p} value={p}>{p}</option>)
                          )}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">{formData.city === 'Улаанбаатар' ? 'Хороо' : 'Баг'}</label>
                        <input
                          type="text"
                          name="khoroo"
                          value={formData.khoroo || ''}
                          onChange={handleInputChange}
                          placeholder="Жишээ: 1"
                          className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border-2 border-gray-50 focus:bg-white focus:border-orange-200 transition-all outline-none font-medium text-[15px]"
                        />
                      </div>
                      <div>
                        <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Гудамж, Байр</label>
                        <input
                          type="text"
                          name="street"
                          value={formData.street || ''}
                          onChange={handleInputChange}
                          placeholder="Жишээ: 12-р байр"
                          className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border-2 border-gray-50 focus:bg-white focus:border-orange-200 transition-all outline-none font-medium text-[15px]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Орц</label>
                        <input
                          type="text"
                          name="entrance"
                          value={formData.entrance || ''}
                          onChange={handleInputChange}
                          placeholder="1"
                          className="w-full px-3 py-3 rounded-xl bg-gray-50 border-2 border-gray-50 focus:bg-white focus:border-orange-200 transition-all outline-none font-medium text-[14px]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Давхар</label>
                        <input
                          type="text"
                          name="floor"
                          value={formData.floor || ''}
                          onChange={handleInputChange}
                          placeholder="5"
                          className="w-full px-3 py-3 rounded-xl bg-gray-50 border-2 border-gray-50 focus:bg-white focus:border-orange-200 transition-all outline-none font-medium text-[14px]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Хаалга</label>
                        <input
                          type="text"
                          name="door"
                          value={formData.door || ''}
                          onChange={handleInputChange}
                          placeholder="24"
                          className="w-full px-3 py-3 rounded-xl bg-gray-50 border-2 border-gray-50 focus:bg-white focus:border-orange-200 transition-all outline-none font-medium text-[14px]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Нэмэлт тайлбар (Заавал биш)</label>
                      <input
                        type="text"
                        name="notes"
                        value={formData.notes || ''}
                        onChange={handleInputChange}
                        placeholder="Орцны код, хүргэлтийн үеийн заавар г.м"
                        className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border-2 border-gray-50 focus:bg-white focus:border-orange-200 transition-all outline-none font-medium text-[14px]"
                      />
                    </div>

                    {isSignedIn && (
                      <div className="pt-2">
                        <label className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 cursor-pointer hover:bg-orange-50/50 transition-colors border border-transparent hover:border-orange-100">
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${saveAddress ? 'bg-[#FF6B00]' : 'bg-gray-200'}`}>
                              {saveAddress && <Check className="w-4 h-4 text-white" strokeWidth={4} />}
                            </div>
                            <span className="text-[14px] font-bold text-gray-700">Энэ хаягийг хадгалах</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={saveAddress}
                            onChange={(e) => setSaveAddress(e.target.checked)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (!formData.district || !formData.street) {
                          toast.error('Дүүрэг болон гудамж байраа оруулна уу');
                          return;
                        }
                        setIsAddressSheetOpen(false);
                        toast.success('Шинэ хаяг баталгаажлаа');
                      }}
                      className="w-full py-4 mt-2 bg-[#FF6B00] text-white text-[16px] font-bold rounded-2xl shadow-[0_8px_20px_rgba(255,107,0,0.25)] active:scale-[0.98] transition-all"
                    >
                      Батлах
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}