'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, MapPin, Edit3, Trash2, Plus, Loader2, X, Check, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

type Address = {
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
};

export default function AddressPage() {
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        label: 'Гэр',
        city: 'Улаанбаатар',
        district: '',
        khoroo: '',
        street: '',
        entrance: '',
        floor: '',
        door: '',
        note: '',
        isDefault: false
    });

    useEffect(() => {
        fetchAddresses();
    }, []);

    const fetchAddresses = () => {
        setIsLoading(true);
        fetch('/api/user/addresses')
            .then(res => res.json())
            .then(data => setAddresses(data.addresses || []))
            .catch(() => toast.error('Хаяг татахад алдаа гарлаа'))
            .finally(() => setIsLoading(false));
    };

    const handleDelete = async (id: string) => {
        if (id.startsWith('order-')) {
            toast.error('Захиалгын түүхээс ирсэн хаягийг устгах боломжгүй');
            return;
        }
        try {
            const res = await fetch(`/api/user/addresses/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            setAddresses(prev => prev.filter(a => a.id !== id));
            toast.success('Хаяг устгагдлаа');
        } catch {
            toast.error('Устгахад алдаа гарлаа');
        }
    };

    const handleEdit = (addr: Address) => {
        setFormData({
            label: addr.label || 'Гэр',
            city: addr.city,
            district: addr.district,
            khoroo: addr.khoroo,
            street: addr.street,
            entrance: addr.entrance || '',
            floor: addr.floor || '',
            door: addr.door || '',
            note: addr.note || '',
            isDefault: addr.isDefault
        });
        setEditingId(addr.id);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.district || !formData.khoroo || !formData.street) {
            toast.error('Шаардлагатай талбаруудыг бөглөнө үү');
            return;
        }

        setIsSaving(true);
        try {
            const method = editingId ? 'PUT' : 'POST';
            const url = editingId ? `/api/user/addresses/${editingId}` : '/api/user/addresses';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) throw new Error();
            
            toast.success(editingId ? 'Хаяг амжилттай шинэчлэгдлээ' : 'Хаяг амжилттай хадгалагдлаа');
            setIsModalOpen(false);
            setEditingId(null);
            fetchAddresses();
            setFormData({
                label: 'Гэр',
                city: 'Улаанбаатар',
                district: '',
                khoroo: '',
                street: '',
                entrance: '',
                floor: '',
                door: '',
                note: '',
                isDefault: false
            });
        } catch {
            toast.error('Хадгалахад алдаа гарлаа');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] font-sans pb-[120px]">
            {/* Header */}
            <div className="bg-white h-[60px] flex items-center px-4 shadow-sm sticky top-0 z-50">
                <Link href="/profile" className="p-2 -ml-2 text-gray-800">
                    <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
                </Link>
                <h1 className="flex-1 text-center text-[17px] font-bold text-gray-900 pr-8">
                    Миний хаягууд
                </h1>
            </div>

            <div className="p-4 space-y-4 max-w-md mx-auto">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="w-10 h-10 animate-spin text-[#FF6B00]" />
                        <p className="text-gray-400 text-sm font-medium">Хаяг ачаалж байна...</p>
                    </div>
                ) : addresses.length === 0 ? (
                    <div className="py-24 flex flex-col items-center text-center px-6">
                        <div className="w-24 h-24 rounded-full bg-orange-50 flex items-center justify-center mb-6 shadow-inner">
                            <MapPin className="w-12 h-12 text-[#FF6B00]" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-[18px] font-bold text-gray-900 mb-3">Одоогоор хаяг байхгүй байна</h3>
                        <p className="text-[15px] text-gray-500 leading-relaxed mb-8">
                            Та хүргэлтийн хаягаа нэмснээр захиалга хийхэд илүү хялбар болох болно.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1 mb-2">
                             <h2 className="text-[14px] font-bold text-gray-400 uppercase tracking-wider">Бүртгэлтэй хаягууд ({addresses.length})</h2>
                        </div>
                        {addresses.map((addr) => (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={addr.id} 
                                className="bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-5 relative border border-gray-50 overflow-hidden group"
                            >
                                {addr.isDefault && (
                                    <div className="absolute top-0 right-0">
                                        <div className="bg-[#FF6B00] text-white px-3 py-1 rounded-bl-xl text-[10px] font-bold uppercase tracking-tighter">Үндсэн</div>
                                    </div>
                                )}
                                <div className="flex items-start gap-4">
                                    <div className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center ${addr.id.startsWith('order-') ? 'bg-gray-100' : 'bg-orange-50'}`}>
                                        <MapPin className={`w-5 h-5 ${addr.id.startsWith('order-') ? 'text-gray-400' : 'text-[#FF6B00]'}`} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex-1 pr-8">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="text-[16px] font-bold text-gray-900">{addr.label || 'Хаяг'}</h3>
                                            {addr.id.startsWith('order-') && (
                                                <span className="text-[10px] text-gray-400 font-medium bg-gray-50 px-2 py-0.5 rounded-full">Түүхээс</span>
                                            )}
                                        </div>
                                        <p className="text-[14px] text-gray-600 font-medium leading-[1.6]">
                                            {addr.city}, {addr.district}, {addr.khoroo}-р хороо
                                        </p>
                                        <p className="text-[13px] text-gray-400 mt-1">
                                            {addr.street} {addr.entrance ? `, Орц: ${addr.entrance}` : ''} {addr.floor ? `, Дахар: ${addr.floor}` : ''} {addr.door ? `, Хаалга: ${addr.door}` : ''}
                                        </p>
                                        {addr.note && <p className="text-[12px] italic text-[#FF6B00] mt-2 font-medium">⚠️ {addr.note}</p>}
                                    </div>
                                </div>
                                <div className="absolute top-1/2 -translate-y-1/2 right-4 flex flex-col gap-2">
                                    {!addr.id.startsWith('order-') && (
                                        <>
                                            {!addr.isDefault && (
                                                <button 
                                                    onClick={async () => {
                                                        const loadingToast = toast.loading('Тохируулж байна...');
                                                        try {
                                                            const res = await fetch(`/api/user/addresses/${addr.id}`, {
                                                                method: 'PUT',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ isDefault: true })
                                                            });
                                                            if (!res.ok) throw new Error();
                                                            toast.success('Үндсэн хаяг солигдлоо', { id: loadingToast });
                                                            fetchAddresses();
                                                        } catch {
                                                            toast.error('Алдаа гарлаа', { id: loadingToast });
                                                        }
                                                    }}
                                                    className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors" title="Үндсэн болгох"
                                                >
                                                    <Check className="w-4 h-4" strokeWidth={3} />
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => handleEdit(addr)}
                                                className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" aria-label="Засах"
                                            >
                                                <Edit3 className="w-4 h-4" strokeWidth={2} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(addr.id)}
                                                className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                aria-label="Устгах"
                                            >
                                                <Trash2 className="w-4 h-4" strokeWidth={2} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Fixed Bottom Button */}
            <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-gray-100 z-40 pb-8 rounded-t-[30px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <button 
                    onClick={() => {
                        setEditingId(null);
                        setFormData({
                            label: 'Гэр', city: 'Улаанбаатар', district: '', khoroo: '', street: '', 
                            entrance: '', floor: '', door: '', note: '', isDefault: false
                        });
                        setIsModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-[#1A1A1A] text-white text-[16px] font-bold rounded-2xl active:scale-[0.98] transition-all"
                >
                    <Plus className="w-5 h-5" strokeWidth={3} />
                    Шинэ хаяг нэмэх
                </button>
            </div>

            {/* Add Address Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="relative bg-white w-full max-w-md rounded-t-[30px] sm:rounded-[30px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                                <h3 className="text-[20px] font-bold text-gray-900">{editingId ? 'Хаяг засах' : 'Хаяг нэмэх'}</h3>
                                <button 
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setEditingId(null);
                                    }}
                                    className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
                                >
                                    <X className="w-6 h-6" strokeWidth={2.5} />
                                </button>
                            </div>

                            {/* Modal Content - Scrollable */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                <form id="address-form" onSubmit={handleSubmit} className="space-y-5">
                                    {/* Label selection */}
                                    <div>
                                        <label className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Хаягны нэр</label>
                                        <div className="flex gap-2">
                                            {['Гэр', 'Ажил', 'Бусад'].map((l) => (
                                                <button
                                                    key={l}
                                                    type="button"
                                                    onClick={() => setFormData(p => ({ ...p, label: l }))}
                                                    className={`flex-1 py-3 px-4 rounded-xl text-[14px] font-bold transition-all border-2 ${
                                                        formData.label === l 
                                                        ? 'bg-orange-50 border-[#FF6B00] text-[#FF6B00]' 
                                                        : 'bg-gray-50 border-gray-50 text-gray-500'
                                                    }`}
                                                >
                                                    {l}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Хот / Аймаг</label>
                                            <input 
                                                type="text"
                                                value={formData.city}
                                                onChange={(e) => setFormData(p => ({ ...p, city: e.target.value }))}
                                                className="w-full bg-gray-50 border-2 border-gray-50 rounded-xl px-4 py-3.5 text-[15px] font-medium focus:border-orange-200 outline-none transition-all"
                                                placeholder="Улаанбаатар"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Дүүрэг / Сум</label>
                                            <input 
                                                type="text"
                                                value={formData.district}
                                                onChange={(e) => setFormData(p => ({ ...p, district: e.target.value }))}
                                                className="w-full bg-gray-50 border-2 border-gray-50 rounded-xl px-4 py-3.5 text-[15px] font-medium focus:border-orange-200 outline-none transition-all"
                                                placeholder="БЗД"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Хороо / Баг</label>
                                            <input 
                                                type="text"
                                                value={formData.khoroo}
                                                onChange={(e) => setFormData(p => ({ ...p, khoroo: e.target.value }))}
                                                className="w-full bg-gray-50 border-2 border-gray-50 rounded-xl px-4 py-3.5 text-[15px] font-medium focus:border-orange-200 outline-none transition-all"
                                                placeholder="13-р хороо"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Гудамж, Байр, Тоот</label>
                                        <input 
                                            type="text"
                                            value={formData.street}
                                            onChange={(e) => setFormData(p => ({ ...p, street: e.target.value }))}
                                            className="w-full bg-gray-50 border-2 border-gray-50 rounded-xl px-4 py-3.5 text-[15px] font-medium focus:border-orange-200 outline-none transition-all"
                                            placeholder="24-р байр"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Орц</label>
                                            <input 
                                                type="text"
                                                value={formData.entrance}
                                                onChange={(e) => setFormData(p => ({ ...p, entrance: e.target.value }))}
                                                className="w-full bg-gray-50 border-2 border-gray-50 rounded-xl px-3 py-3 text-[14px] font-medium outline-none"
                                                placeholder="1"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Дахар</label>
                                            <input 
                                                type="text"
                                                value={formData.floor}
                                                onChange={(e) => setFormData(p => ({ ...p, floor: e.target.value }))}
                                                className="w-full bg-gray-50 border-2 border-gray-50 rounded-xl px-3 py-3 text-[14px] font-medium outline-none"
                                                placeholder="5"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Хаалга</label>
                                            <input 
                                                type="text"
                                                value={formData.door}
                                                onChange={(e) => setFormData(p => ({ ...p, door: e.target.value }))}
                                                className="w-full bg-gray-50 border-2 border-gray-50 rounded-xl px-3 py-3 text-[14px] font-medium outline-none"
                                                placeholder="25"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Нэмэлт тэмдэглэл</label>
                                        <textarea 
                                            value={formData.note}
                                            onChange={(e) => setFormData(p => ({ ...p, note: e.target.value }))}
                                            className="w-full bg-gray-50 border-2 border-gray-50 rounded-xl px-4 py-3.5 text-[14px] font-medium outline-none min-h-[80px]"
                                            placeholder="Код, тайлбар г.м"
                                        />
                                    </div>

                                    <div 
                                        onClick={() => setFormData(p => ({ ...p, isDefault: !p.isDefault }))}
                                        className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer active:scale-[0.99] transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${formData.isDefault ? 'bg-[#FF6B00]' : 'bg-gray-200'}`}>
                                                {formData.isDefault && <Check className="w-4 h-4 text-white" strokeWidth={4} />}
                                            </div>
                                            <span className="text-[14px] font-bold text-gray-700">Үндсэн хаягаар тохируулах</span>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-gray-100 bg-white sticky bottom-0 z-10 pb-10 sm:pb-6">
                                <button 
                                    form="address-form"
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full flex items-center justify-center gap-2 py-4 bg-[#FF6B00] text-white text-[16px] font-bold rounded-2xl shadow-[0_8px_20px_rgba(255,107,0,0.25)] active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {isSaving ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" strokeWidth={2.5} />
                                            {editingId ? 'Шинэчлэх' : 'Хадгалах'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
