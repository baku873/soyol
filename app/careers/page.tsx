'use client';
import { motion } from 'framer-motion';
import {
  Rocket,
  Users,
  Heart,
  Coffee,
  Globe,
  Star,
  Zap,
  Briefcase,
  GraduationCap,
  Smile,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

export default function CareersPage() {
  const benefits = [
    {
      icon: Heart,
      title: 'Эрүүл мэндийн даатгал',
      desc: 'Ажилтны эрүүл мэнд бидний тэргүүлэх чиглэл.',
      color: 'text-red-500',
      bg: 'bg-red-50'
    },
    {
      icon: Coffee,
      title: 'Ур чадвар хөгжүүлэх',
      desc: 'Тасралтгүй суралцах, өсөх боломж.',
      color: 'text-orange-500',
      bg: 'bg-orange-50'
    },
    {
      icon: Smile,
      title: 'Найрсаг хамт олон',
      desc: 'Бие биедээ тусалдаг, эерэг уур амьсгал.',
      color: 'text-blue-500',
      bg: 'bg-blue-50'
    },
    {
      icon: Zap,
      title: 'Урамшуулалт цалин',
      desc: 'Гүйцэтгэлд суурилсан өндөр урамшуулал.',
      color: 'text-yellow-500',
      bg: 'bg-yellow-50'
    }
  ];

  const positions = [
    {
      title: 'Борлуулалтын менежер',
      type: 'Бүрэн цаг',
      location: 'Улаанбаатар',
      tags: ['Sales', 'Customer Service']
    },
    {
      title: 'Контент бүтээгч',
      type: 'Бүрэн цаг',
      location: 'Зайнаас / Оффис',
      tags: ['Video', 'Design', 'Creative']
    },
    {
      title: 'Логистик зохицуулагч',
      type: 'Бүрэн цаг',
      location: 'Сансар салбар',
      tags: ['Operations', 'Delivery']
    }
  ];

  return (
    <div className="min-h-screen bg-white">


      {/* Why Soyol Section */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="space-y-6">
              <div className="flex gap-4 p-6 rounded-3xl bg-gray-50 hover:bg-white hover:shadow-xl transition-all duration-300 border border-transparent hover:border-gray-100 group">
                <div className="w-12 h-12 rounded-2xl bg-soyol/10 flex items-center justify-center shrink-0 group-hover:bg-soyol group-hover:text-white transition-colors">
                  <Rocket className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">Технилогийн дэвшил</h3>
                  <p className="text-gray-600 font-medium">Бид хамгийн сүүлийн үеийн программ хангамж, AI шийдлүүдийг үйл ажиллагаандаа ашигладаг.</p>
                </div>
              </div>
              <div className="flex gap-4 p-6 rounded-3xl bg-gray-50 hover:bg-white hover:shadow-xl transition-all duration-300 border border-transparent hover:border-gray-100 group">
                <div className="w-12 h-12 rounded-2xl bg-soyol/10 flex items-center justify-center shrink-0 group-hover:bg-soyol group-hover:text-white transition-colors">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">Хамтын ажиллагаа</h3>
                  <p className="text-gray-600 font-medium">Манай хамт олон бие биенээ дэмжсэн, нээлттэй харилцааг эрхэмлэдэг.</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-6"
          >
            {benefits.map((benefit, i) => (
              <div key={i} className={`${benefit.bg} p-8 rounded-[40px] flex flex-col gap-4 border border-white/50`}>
                <benefit.icon className={`w-8 h-8 ${benefit.color}`} />
                <h4 className="text-lg font-black text-gray-900">{benefit.title}</h4>
                <p className="text-sm text-gray-600 font-medium">{benefit.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Open Positions */}

      {/* Footer CTA */}

    </div>
  );
}
