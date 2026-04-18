'use client';
import { useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Package, Phone, Home, Sparkles, ShoppingBag } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  useEffect(() => {
    // Confetti animation
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#FF7900', '#FFA500', '#FFD700'],
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#FF7900', '#FFA500', '#FFD700'],
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl border border-gray-100 text-center"
        >
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="mb-8"
          >
            <div className="relative inline-block">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 bg-gradient-to-r from-soyol to-yellow-400 rounded-full blur-2xl opacity-30"
              />
              <div className="relative bg-gradient-to-r from-soyol to-yellow-400 p-6 rounded-full">
                <CheckCircle2 className="w-20 h-20 text-white" />
              </div>
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl md:text-5xl font-black text-gray-900 mb-4"
          >
            Баярлалаа!
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-2 mb-6"
          >
            <Sparkles className="w-5 h-5 text-soyol" />
            <p className="text-xl text-gray-600 font-bold">
              Захиалга амжилттай бүртгэгдлээ
            </p>
            <Sparkles className="w-5 h-5 text-soyol" />
          </motion.div>

          {/* Order Number */}
          {orderId && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-r from-soyol/10 to-yellow-400/10 rounded-2xl p-6 mb-8"
            >
              <p className="text-sm text-gray-600 mb-2">Захиалгын дугаар</p>
              <p className="text-3xl font-black text-soyol">#{orderId.slice(-6).toUpperCase()}</p>
            </motion.div>
          )}

          {/* Info Cards */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">


            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-gray-50 rounded-2xl p-6 text-left"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-soyol/10 rounded-xl">
                  <Phone className="w-6 h-6 text-soyol" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Холбоо барих</h3>
                  <p className="text-sm text-gray-600">
                    Асуулт байвал 77181818 дугаараар залгана уу
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Message */}


          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            {orderId ? (
              <Link
                href={`/orders/${orderId}`}
                className="flex-1 py-4 bg-soyol text-white font-bold rounded-2xl shadow-lg glow-orange flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                <ShoppingBag className="w-5 h-5" />
                <span>Захиалга харах</span>
              </Link>
            ) : (
              <Link
                href="/"
                className="flex-1 py-4 bg-soyol text-white font-bold rounded-2xl shadow-lg glow-orange flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                <Home className="w-5 h-5" />
                <span>Нүүр хуудас</span>
              </Link>
            )}

            <Link
              href="tel:85552229"
              className="flex-1 py-4 bg-white border-2 border-soyol text-soyol font-bold rounded-2xl shadow-lg flex items-center justify-center gap-3 hover:bg-soyol hover:text-white transition active:scale-95"
            >
              <Phone className="w-5 h-5" />
              <span>Холбогдох</span>
            </Link>
          </div>

          {/* Footer Note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="mt-8 pt-8 border-t border-gray-200"
          >
            <p className="text-sm text-gray-500">
              🎉 Soyol Video Shop-оос худалдан авалт хийсэнд баярлалаа!
            </p>
          </motion.div>
        </motion.div>


      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
