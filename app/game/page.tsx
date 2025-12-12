'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import HeaderNavigator from '@/components/HeaderNavigator'
import { motion } from 'framer-motion'
import { Gift, TrendingUp, Clover, Club, ArrowRight, BarChart2, PieChart as PieIcon, Activity, Disc, Layers, Rocket, Wind } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'

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
    description: '그래프가 터지기 전 탈출하라!',
    icon: TrendingUp,
    path: '/game/bustabit',
    color: 'from-orange-600 to-red-700',
    accent: 'text-orange-500',
    shadow: 'shadow-orange-500/20'
  },
  {
    id: 'cloverpit',
    name: 'CLOVER PIT',
    description: '행운의 클로버를 찾아라!',
    icon: Clover,
    path: '/game/cloverpit',
    color: 'from-green-600 to-emerald-800',
    accent: 'text-green-500',
    shadow: 'shadow-green-500/20'
  },
  {
    id: 'roulette',
    name: 'ROULETTE',
    description: '행운의 숫자를 예측하라! 카지노의 꽃.',
    icon: Disc,
    path: '/game/roulette',
    color: 'from-purple-600 to-pink-700',
    accent: 'text-purple-500',
    shadow: 'shadow-purple-500/20',
    beta: true
  },
  {
    id: 'kuji',
    name: 'ICHIBAN KUJI',
    description: '원하는 경품을 뽑아보세요!',
    icon: Gift,
    path: '/game/kuji',
    color: 'from-blue-600 to-indigo-700',
    accent: 'text-blue-500',
    shadow: 'shadow-blue-500/20'
  },
  {
    id: 'stairs',
    name: 'INFINITE STAIRS',
    description: '한계에 도전하라! 무한 계단 오르기.',
    icon: Layers,
    path: '/game/stairs',
    color: 'from-cyan-600 to-blue-700',
    accent: 'text-cyan-500',
    shadow: 'shadow-cyan-500/20',
    beta: true
  },
  {
    id: 'skyroads',
    name: 'SKYROADS',
    description: '우주를 질주하라! 장애물을 피하고 연료를 수집하세요.',
    icon: Rocket,
    path: '/game/skyroads',
    color: 'from-indigo-600 to-purple-700',
    accent: 'text-indigo-500',
    shadow: 'shadow-indigo-500/20',
    pcOnly: true
  },
  {
    id: 'windrunner',
    name: 'WIND RUNNER',
    description: '바람을 가르며 달려라! 점프 액션 러닝.',
    icon: Wind,
    path: '/game/windrunner',
    color: 'from-cyan-500 to-blue-600',
    accent: 'text-cyan-400',
    shadow: 'shadow-cyan-500/20',
    pcOnly: true
  },
]

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function GamePage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // 데이터 가공
  const pieData = stats?.byGame.map((g: any) => ({
    name: g.gameType.toUpperCase(),
    value: g.totalGames
  })) || []

  return (
    <div className="min-h-screen bg-transparent text-slate-100 overflow-x-hidden">
      <HeaderNavigator />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-32 pb-20">
        
        {/* Header Section */}
        <section className="mb-12 text-center">
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

        {/* --- Game List (1 Row) --- */}
        <section className="mb-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {games.map((game, idx) => (
                    <Link href={game.path} key={game.id} className="group relative block h-32 md:h-64">
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
                            <div className="h-full bg-[#131316]/80 backdrop-blur-md border border-white/5 rounded-3xl p-4 md:p-6 flex flex-col justify-between hover:border-white/20 transition-all duration-300 shadow-xl overflow-hidden relative group-hover:shadow-2xl group-hover:bg-[#131316]/60">
                                
                                { (game as any).beta && (
                                    <div className="absolute top-4 right-4 bg-red-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded border border-red-400/50 shadow-[0_0_10px_rgba(239,68,68,0.5)] z-20 animate-pulse">
                                        BETA
                                    </div>
                                )}
                                { (game as any).pcOnly && (
                                    <div className="absolute top-4 right-4 bg-blue-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded border border-blue-400/50 shadow-[0_0_10px_rgba(59,130,246,0.5)] z-20">
                                        PC ONLY
                                    </div>
                                )}

                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-2 md:mb-4">
                                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-transform duration-500`}>
                                            <game.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-lg md:text-2xl font-black text-white mb-1 md:mb-2 tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-400 transition-all">
                                            {game.name}
                                        </h3>
                                        <p className="text-slate-400 text-xs leading-relaxed group-hover:text-slate-200 transition-colors line-clamp-1 md:line-clamp-2">
                                            {game.description}
                                        </p>
                                    </div>
                                    
                                    <div className="mt-auto pt-2 md:pt-4">
                                        <div className={`h-1 w-full rounded-full bg-gradient-to-r ${game.color} opacity-50`} />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </Link>
                ))}
            </div>
        </section>

        {/* --- 통계 대시보드 --- */}
        <section>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#131316]/50 backdrop-blur-md border border-white/5 rounded-3xl p-6 md:p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <BarChart2 className="w-6 h-6 text-violet-400" />
              <h2 className="text-2xl font-bold text-white">실시간 게임 현황</h2>
            </div>

            {loading ? (
              <div className="h-64 flex items-center justify-center text-slate-500 animate-pulse">
                데이터 분석 중...
              </div>
            ) : !stats ? (
              <div className="h-64 flex items-center justify-center text-slate-500">
                데이터가 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. 요약 카드 */}
                <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                    <div className="text-slate-400 text-sm mb-1">총 게임 수</div>
                    <div className="text-2xl font-bold text-white">{stats.summary.totalGames.toLocaleString()}</div>
                  </div>
                  <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                    <div className="text-slate-400 text-sm mb-1">전체 승률</div>
                    <div className="text-2xl font-bold text-emerald-400">{stats.summary.winRate.toFixed(1)}%</div>
                  </div>
                  <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                    <div className="text-slate-400 text-sm mb-1">평균 환급률(RTP)</div>
                    <div className="text-2xl font-bold text-yellow-400">{stats.summary.rtp.toFixed(1)}%</div>
                  </div>
                  <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                    <div className="text-slate-400 text-sm mb-1">총 순수익</div>
                    <div className={`text-2xl font-bold ${stats.summary.totalProfit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                      {stats.summary.totalProfit > 0 ? '+' : ''}{stats.summary.totalProfit.toLocaleString()} P
                    </div>
                  </div>
                </div>

                {/* 2. 일별 승률 추이 (Line Chart) */}
                <div className="lg:col-span-2 bg-black/20 rounded-2xl p-4 border border-white/5 min-h-[300px]">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-4 h-4 text-blue-400" />
                    <h3 className="font-bold text-slate-300">일별 승률 추이 (최근 7일)</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={stats.daily}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="date" stroke="#666" fontSize={12} tickLine={false} />
                      <YAxis stroke="#666" fontSize={12} tickLine={false} unit="%" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="winRate" name="승률" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* 3. 게임별 비중 (Pie Chart) */}
                <div className="bg-black/20 rounded-2xl p-4 border border-white/5 min-h-[300px]">
                  <div className="flex items-center gap-2 mb-4">
                    <PieIcon className="w-4 h-4 text-orange-400" />
                    <h3 className="font-bold text-slate-300">게임별 점유율</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* 4. 게임별 상세 (Bar Chart) */}
                <div className="lg:col-span-3 bg-black/20 rounded-2xl p-4 border border-white/5 min-h-[300px]">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart2 className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-slate-300">게임별 승률 및 환급률 비교</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={stats.byGame}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="gameType" stroke="#666" fontSize={12} tickLine={false} tickFormatter={(val) => val.toUpperCase()} />
                      <YAxis stroke="#666" fontSize={12} tickLine={false} unit="%" />
                      <Tooltip 
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                        contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Bar dataKey="winRate" name="승률 (%)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                      <Bar dataKey="rtp" name="환급률 (%)" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

              </div>
            )}
          </motion.div>
        </section>

      </main>
    </div>
  )
}
