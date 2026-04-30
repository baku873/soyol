'use client';

import { motion } from 'framer-motion';
import { Shield, Truck, HeadphonesIcon, Award } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Найдвартай',
    description: '100% баталгаатай бараа ',
  },
  {
    icon: Truck,
    title: 'Хурдан хүргэлт',
    description: 'Үнэгүй хүргэлт Улаанбаатар хотод',
  },
  {
    icon: HeadphonesIcon,
    title: '24/7 Дэмжлэг',
    description: 'Хэдийд ч холбогдох боломжтой',
  },
  {
    icon: Award,
    title: 'Өндөр чанар',
    description: 'Шалгарсан бүтээгдэхүүнүүд',
  },
];

export default function AboutSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* About Us Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-soyol/5 rounded-full border border-soyol/10 mb-6"
          >
            <span className="w-2 h-2 bg-soyol rounded-full animate-pulse" />
            <span className="text-sm font-bold text-soyol">Бидний тухай</span>
          </motion.div>

          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-6">
            Монголын тэргүүлэгч
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-soyol to-soyol-light">
              онлайн дэлгүүр
            </span>
          </h2>

          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Soyol Video Shop нь Таобао болон бусад олон улсын платформуудаас
            өндөр чанартай бүтээгдэхүүнүүдийг бөөний үнээр Монголд хүргэх үйлчилгээ
            үзүүлдэг. Бид таны хэрэгцээнд тохирсон, итгэлтэй бүтээгдэхүүнүүдийг
            сонгоход тань туслана.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1,
                }}
                whileHover={{ y: -4 }}
                className="group relative bg-white rounded-2xl p-8 border border-gray-100 hover:border-soyol/20 hover:shadow-xl hover:shadow-soyol/5 transition-all"
              >
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                  className="w-14 h-14 bg-gradient-to-br from-soyol to-soyol-light rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-soyol/20"
                >
                  <Icon className="w-7 h-7 text-white" />
                </motion.div>

                <h3 className="text-xl font-black text-gray-900 mb-2 group-hover:text-soyol transition-colors">
                  {feature.title}
                </h3>

                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>

                {/* Decorative corner accent */}
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-soyol/5 to-transparent rounded-bl-full" />
              </motion.div>
            );
          })}
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {[
            { value: '500+', label: 'Бараа' },
            { value: '1000+', label: 'Хэрэглэгч' },
            { value: '98%', label: 'Сэтгэл ханамж' },
            { value: '24/7', label: 'Дэмжлэг' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="text-center"
            >
              <p className="text-4xl md:text-5xl font-black text-gray-900 mb-2">
                {stat.value}
              </p>
              <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
