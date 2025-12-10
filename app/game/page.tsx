'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import HeaderNavigator from '@/components/HeaderNavigator'
import { motion } from 'framer-motion'
import { Gift, TrendingUp, Clover, Club, ArrowRight } from 'lucide-react'

const games = [
  {
    id: 'blackjack',
    name: 'BLACKJACK',
    description: '전략과 운의 승부! 딜러를 이겨라.',
    icon: Club,
    path: '/game/blackjack',
    color: 'from-slate-700 to-slate-900',
    accent: 'text-slate-400',
    shadow: 'shadow-slate-500/20'
  },
  {
    id: 'bustabit',
    name: 'BUSTABIT',
    description: '그래프가 터지기 전 탈출하라! 심장 쫄깃한 배율 게임.',
    icon: TrendingUp,
    path: '/game/bustabit',
    color: 'from-orange-600 to-red-700',
    accent: 'text-orange-500',
    shadow: 'shadow-orange-500/20'
  },
  {
    id: 'cloverpit',
    name: 'CLOVER PIT',
    description: '행운의 클로버를 찾아라! 슬롯 머신의 짜릿함.',
    icon: Clover,
    path: '/game/cloverpit',
    color: 'from-green-600 to-emerald-800',
    accent: 'text-green-500',
    shadow: 'shadow-green-500/20'
  },
  {
    id: 'kuji',
    name: 'ICHIBAN KUJI',
    description: '원하는 경품을 뽑아보세요! 이치방 쿠지.',
    icon: Gift,
    path: '/game/kuji',
    color: 'from-blue-600 to-indigo-700',
    accent: 'text-blue-500',
    shadow: 'shadow-blue-500/20'
  }
]

export default function GamePage() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <div className="min-h-screen bg-transparent text-slate-100 overflow-x-hidden">
      <HeaderNavigator />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-32 pb-20">
        
        {/* Header Section */}
        <section className="mb-16 text-center">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 bg-gradient-to-b from-white via-white to-slate-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                    GAME LOBBY
                </h1>
                <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                    최고의 승부사를 위한 프리미엄 게임 라운지입니다.<br/>
                    원하시는 게임을 선택하여 입장해주세요.
                </p>
            </motion.div>
        </section>

        {/* Game Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {games.map((game, idx) => (
                <Link href={game.path} key={game.id} className="group relative block h-64 md:h-80">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: idx * 0.1 }}
                        whileHover={{ y: -5 }}
                        className="h-full w-full"
                    >
                        {/* Background Glow */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-0 group-hover:opacity-30 blur-2xl transition-opacity duration-500 rounded-3xl -z-10`} />
                        
                        {/* Card Content */}
                        <div className="h-full bg-[#131316]/80 backdrop-blur-md border border-white/5 rounded-3xl p-8 flex flex-col justify-between hover:border-white/20 transition-all duration-300 shadow-xl overflow-hidden relative group-hover:shadow-2xl group-hover:bg-[#131316]/60">
                            
                            {/* Decorative Background */}
                            <div className={`absolute -top-20 -right-20 w-60 h-60 bg-gradient-to-br ${game.color} opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity`} />

                            <div className="relative z-10 flex items-start justify-between">
                                <div>
                                    <h3 className="text-3xl font-black text-white mb-2 tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-400 transition-all">
                                        {game.name}
                                    </h3>
                                    <div className={`h-1 w-12 rounded-full bg-gradient-to-r ${game.color}`} />
                                </div>
                                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${game.color} flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-transform duration-500`}>
                                    <game.icon className="w-8 h-8 text-white" />
                                </div>
                            </div>

                            <div className="relative z-10">
                                <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-6 group-hover:text-slate-200 transition-colors">
                                    {game.description}
                                </p>
                                <div className="flex items-center gap-2 text-sm font-bold text-white group-hover:gap-4 transition-all">
                                    ENTER GAME
                                    <ArrowRight className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </Link>
            ))}
        </section>

      </main>
    </div>
  )
}
