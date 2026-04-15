'use client';
import { motion } from 'framer-motion';
import {
  Truck,
  Shield,
  DollarSign,
  Users,
  Award,
  Phone,
  Mail,
  MapPin,
  Clock,
  Star,
  Zap,
  RotateCcw,
  Package,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingUp,
  Globe
} from 'lucide-react';
import { SITE_CONFIG } from '../../lib/constants';

export default function AboutPage() {
  const features = [
    {
      icon: Globe,
      title: 'Олон улсын захиалга',
      description: 'Япон, Солонгос, Хятад улсын хамгийн том интернет худалдааны сайтуудаас хүссэн барааг тань хамгийн хямд үнээр нийлүүлнэ.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Shield,
      title: 'Чанартай үйлдвэр',
      description: 'Бид найдвартай үйлдвэрүүдийг сонгон судлаж, чанарын шаардлага хангасан бүтээгдэхүүнийг захиалагчдад хүргэдэг.',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: TrendingUp,
      title: 'Трэнд бүтээгдэхүүн',
      description: 'Хамгийн сүүлийн үеийн трэнд болж буй шинэ, шинэлэг бараа бүтээгдэхүүнийг цаг тухай бүр санал болгож байна.',
      color: 'from-soyol to-yellow-400',
    },
    {
      icon: Zap,
      title: 'Технологийн шийдэл',
      description: 'Хиймэл оюун ухаан дээр суурилсан технологийн тусламжтайгаар захиалгын бүх процессийг хянах боломжтой.',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: Truck,
      title: 'Шуурхай хүргэлт',
      description: 'Улаанbaatar хотод 2-6 цагийн дотор, орон нутагт албан ёсны хуваарийн дагуу тээвэрт хүргэж өгнө.',
      color: 'from-red-500 to-orange-500',
    },
    {
      icon: HelpCircle,
      title: 'Найрсаг үйлчилгээ',
      description: 'Олон жилийн дадлага туршлагатай баг хамт олон танд итгэлтэй байдал, найрсаг харилцааг амлаж байна.',
      color: 'from-indigo-500 to-blue-500',
    },
  ];

  const stats = [
    { label: 'Байгуулагдсан', value: '2019', icon: Clock },
    { label: 'Сэтгэл ханамж', value: '100%', icon: Star },
    { label: 'Хүргэлтийн хугацаа', value: '2-6ц', icon: Truck },
    { label: 'Түнш орнууд', value: '3+', icon: Globe },
  ];

  const returnPolicies = [
    {
      title: 'Буцаах, солих нөхцөл',
      items: [
        'Бараа хүлээн авснаас хойш 72 цагийн дотор 77-181818 утсаар мэдэгдэж буцаах боломжтой.',
        'Бараа гэмтэлтэй эсвэл буруу бол борлуулагч зардлыг хариуцна. Бусад тохиолдолд худалдан авагч хариуцна.',
        'Буцаах барааны бүрэн бүтэн байдал, хайрцаг савыг жолооч шалгаж хүлээн авна.',
        'Солих бараа байхгүй тохиолдолд талууд тохиролцон төлбөрийг буцааж болно.'
      ],
      icon: RotateCcw,
      color: 'blue'
    },
    {
      title: 'Төлбөр буцаан олгох',
      items: [
        'Төлбөрийг 24 цагийн дотор худалдан авагчийн дансанд шилжүүлнэ.',
        'Худалдан авагчаас шалтгаалсан буцаалтад хүргэлтийн зардлыг хасаж тооцно.',
        'Өөрийн хүсэлтээр цуцалсан тохиолдолд банкны шимтгэл болон бусад зардлыг худалдан авагч хариуцна.'
      ],
      icon: DollarSign,
      color: 'green'
    },
    {
      title: 'Татгалзах үндэслэл',
      items: [
        'Худалдан авагчаас шалтгаалан бараа гэмтсэн, бохирдсон, чанараа алдсан бол.',
        'Ашиглалтаас үүдэн барааны үнэ цэнэ буурсан, эсвэл 72 цаг өнгөрсөн бол.',
        'Хувилан олшруулах боломжтой бараа, тусгай захиалгаар хийгдсэн бараа.',
        'Буцаах боломжгүй гэж заасан болон бусад тохиролцсон нөхцөлүүд.'
      ],
      icon: XCircle,
      color: 'red'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-soyol via-orange-500 to-yellow-400 py-24">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="inline-block px-4 py-1 rounded-full bg-white/20 backdrop-blur-md text-sm font-bold mb-6">
              Since 2019
            </span>
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
              БИДНИЙ ТУХАЙ
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto font-medium leading-relaxed mb-8">
              Soyol Video Shop нь Монголын хамгийн анхны видео дэлгүүр болон байгуулагдсан бөгөөд өнөөдрийг хүртэл цахим худалдааны чиглэлээр үйл ажиллагаа тогтвортой явуулж байна.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="px-6 py-3 bg-white text-soyol rounded-2xl font-black shadow-xl">
                ЭРХЭМ ЗОРИЛГО
              </div>
              <p className="w-full text-lg font-bold opacity-90 italic">
                "Хүлээлтээс давсан үйлчилгээг тогтвортой хүргэхийг бид зорьно"
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 -mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-center p-6 rounded-3xl bg-white/80 backdrop-blur-xl border border-white shadow-2xl"
              >
                <div className="w-12 h-12 mx-auto bg-soyol/10 rounded-2xl flex items-center justify-center mb-3">
                  <stat.icon className="w-6 h-6 text-soyol" />
                </div>
                <div className="text-3xl font-black text-gray-900 mb-1">{stat.value}</div>
                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">Яагаад биднийг сонгох вэ?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Бид чанартай барааг хамгийн хямд үнээр, хамгийн хурдан шуурхай хүргэхийг зорилгоо болгон ажилладаг.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -10 }}
                className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300"
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 shadow-lg`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed font-medium">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Policy Section */}
      <section className="py-24 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">Бараа буцаах болон солих</h2>
            <p className="text-xl text-gray-600">Бидний баримталдаг буцаалтын нөхцөл, журам</p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {returnPolicies.map((policy, index) => (
              <motion.div
                key={policy.title}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 flex flex-col"
              >
                <div className={`w-14 h-14 rounded-2xl bg-${policy.color}-100 flex items-center justify-center mb-6`}>
                  <policy.icon className={`w-7 h-7 text-${policy.color}-600`} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-6">{policy.title}</h3>
                <ul className="space-y-4 flex-grow">
                  {policy.items.map((item, i) => (
                    <li key={i} className="flex gap-3 text-gray-600 font-medium">
                      <div className="mt-1.5 min-w-[6px] h-[6px] rounded-full bg-gray-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
