'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import HeaderNavigator from '@/components/HeaderNavigator'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { Gift, TrendingUp, Clover, Club, Trophy, Crown, Activity } from 'lucide-react'
import Link from 'next/link'

interface RankingUser {
  id: number
  email: string
  nickname: string | null
  points: number
  level: number
  rank: number
}

const games = [
  {
    id: 'bustabit',
    name: 'BUSTABIT',
    description: '그래프가 터지기 전에 탈출하세요! 실시간 배율 게임.',
    icon: TrendingUp,
    path: '/game/bustabit',
    color: 'from-orange-500 to-red-600',
    shadow: 'shadow-orange-500/20'
  },
  {
    id: 'blackjack',
    name: 'BLACKJACK',
    description: '딜러와의 짜릿한 승부! 21을 향한 전략 게임.',
    icon: Club, // Lucide doesn't have a specific Spade icon that looks good, Club works or use an image
    path: '/game/blackjack',
    color: 'from-slate-700 to-slate-900',
    shadow: 'shadow-slate-500/20'
  },
  {
    id: 'cloverpit',
    name: 'CLOVER PIT',
    description: '행운의 클로버를 찾아라! 슬롯 머신.',
    icon: Clover,
    path: '/game/cloverpit',
    color: 'from-green-500 to-emerald-700',
    shadow: 'shadow-green-500/20'
  },
  {
    id: 'kuji',
    name: 'ICHIBAN KUJI',
    description: '최고의 경품을 뽑아보세요! 이치방 쿠지.',
    icon: Gift,
    path: '/game/kuji',
    color: 'from-blue-500 to-indigo-600',
    shadow: 'shadow-blue-500/20'
  }
]

export default function Home() {
  const router = useRouter()
  const [rankings, setRankings] = useState<RankingUser[]>([])
  const [dailyRankings, setDailyRankings] = useState<RankingUser[]>([])
  const [weeklyRankings, setWeeklyRankings] = useState<RankingUser[]>([])
  const [monthlyRankings, setMonthlyRankings] = useState<RankingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [pointsHistory, setPointsHistory] = useState<Array<{ date: string; points: number }>>([])
  const [currentPoints, setCurrentPoints] = useState(0)
  const [currentUser, setCurrentUser] = useState<{ nickname: string; level: number } | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    const fetchData = async () => {
      try {
        // 유저 정보 (간단히 가져오거나 토큰 디코딩 - 여기선 /api/user/me 활용 가정)
        const token = localStorage.getItem('token')
        if (token) {
            const userRes = await fetch('/api/user/me', { headers: { Authorization: `Bearer ${token}` } });
            if (userRes.ok) {
                const userData = await userRes.json();
                setCurrentUser({ nickname: userData.nickname || userData.email.split('@')[0], level: userData.level });
                setCurrentPoints(userData.points);
            }
            
            // 포인트 히스토리
            const historyResponse = await fetch('/api/user/points-history', {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (historyResponse.ok) {
                const historyData = await historyResponse.json()
                setPointsHistory(historyData.history || [])
            }
        }

        // 전체 랭킹
        const response = await fetch('/api/ranking?limit=5') // 로비에서는 5개만
        if (response.ok) {
          const data = await response.json()
          setRankings(data.rankings || [])
        }

        // 기간별 랭킹 (초기 로딩 시 다 가져옴)
        const [dailyRes, weeklyRes, monthlyRes] = await Promise.all([
            fetch('/api/ranking/period?period=daily&limit=5'),
            fetch('/api/ranking/period?period=weekly&limit=5'),
            fetch('/api/ranking/period?period=monthly&limit=5')
        ]);

        if (dailyRes.ok) setDailyRankings((await dailyRes.json()).rankings || []);
        if (weeklyRes.ok) setWeeklyRankings((await weeklyRes.json()).rankings || []);
        if (monthlyRes.ok) setMonthlyRankings((await monthlyRes.json()).rankings || []);

      } catch (error) {
        console.error('데이터 조회 오류:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const getCurrentRankings = () => {
    switch (selectedPeriod) {
      case 'daily': return dailyRankings
      case 'weekly': return weeklyRankings
      case 'monthly': return monthlyRankings
      default: return dailyRankings
    }
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" fill="currentColor" />
    if (rank === 2) return <Trophy className="w-5 h-5 text-slate-300" />
    if (rank === 3) return <Trophy className="w-5 h-5 text-amber-600" />
    return <span className="w-5 text-center font-bold text-slate-500">#{rank}</span>
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0c] to-black text-slate-100 overflow-x-hidden selection:bg-purple-500/30">
      <HeaderNavigator />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 pb-20">
        
        {/* Hero / Welcome Section */}
        <section className="mb-16">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex flex-col md:flex-row justify-between items-end gap-6"
            >
                <div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-2 bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">
                        GAME LOBBY
                    </h1>
                    <p className="text-slate-400 text-lg">
                        Welcome back, <span className="text-purple-400 font-bold">{currentUser?.nickname || 'Guest'}</span>. Ready to play?
                    </p>
                </div>
                
                {/* User Stats Card */}
                <div className="flex gap-4">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 min-w-[140px]">
                        <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Level</div>
                        <div className="text-2xl font-black text-white flex items-baseline gap-1">
                            {currentUser?.level || 1}
                            <span className="text-xs font-normal text-slate-500">LVL</span>
                        </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 min-w-[180px]">
                        <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Points</div>
                        <div className="text-2xl font-black text-emerald-400 flex items-baseline gap-1">
                            {currentPoints.toLocaleString()}
                            <span className="text-xs font-normal text-emerald-600/70">PTS</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </section>

        {/* Game Grid Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {games.map((game, idx) => (
                <Link href={game.path} key={game.id} className="group relative">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: idx * 0.1 }}
                        whileHover={{ y: -5, scale: 1.02 }}
                        className="h-full"
                    >
                        <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500 rounded-3xl -z-10`} />
                        <div className="h-full bg-[#131316] border border-white/5 rounded-3xl p-6 flex flex-col justify-between hover:border-white/20 transition-colors duration-300 shadow-xl overflow-hidden relative group-hover:shadow-2xl">
                            
                            {/* Background Pattern */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-white/10 transition-colors" />

                            <div className="relative z-10">
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${game.color} flex items-center justify-center mb-6 shadow-lg ${game.shadow}`}>
                                    <game.icon className="w-7 h-7 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-purple-300 transition-colors">{game.name}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed mb-6">{game.description}</p>
                            </div>

                            <div className="relative z-10">
                                <div className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-center text-sm font-bold text-slate-300 group-hover:bg-white/10 group-hover:text-white transition-all flex items-center justify-center gap-2">
                                    PLAY NOW
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </Link>
            ))}
        </section>

        {/* Dashboard Widgets Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Rank Board */}
            <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="lg:col-span-1"
            >
                <div className="bg-[#131316]/80 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden h-full">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-yellow-500" />
                            LEADERBOARD
                        </h3>
                        <div className="flex gap-1 bg-black/20 p-1 rounded-lg">
                            {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                                <button
                                    key={period}
                                    onClick={() => setSelectedPeriod(period)}
                                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                                        selectedPeriod === period 
                                        ? 'bg-purple-600 text-white shadow-lg' 
                                        : 'text-slate-500 hover:text-slate-300'
                                    }`}
                                >
                                    {period === 'daily' ? 'D' : period === 'weekly' ? 'W' : 'M'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="p-4">
                        {loading ? (
                            <div className="flex justify-center py-10 text-slate-500 text-sm">Loading ranks...</div>
                        ) : getCurrentRankings().length === 0 ? (
                            <div className="flex justify-center py-10 text-slate-500 text-sm">No data available</div>
                        ) : (
                            <div className="space-y-3">
                                {getCurrentRankings().map((user) => (
                                    <div key={user.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 flex justify-center">
                                                {getRankIcon(user.rank)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-slate-200 group-hover:text-white transition-colors">
                                                    {user.nickname || user.email.split('@')[0]}
                                                </div>
                                                <div className="text-[10px] font-bold text-slate-500 uppercase">Level {user.level}</div>
                                            </div>
                                        </div>
                                        <div className="text-emerald-400 font-bold text-sm tracking-wide">
                                            {user.points.toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Chart Widget */}
            <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="lg:col-span-2"
            >
                <div className="bg-[#131316]/80 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden h-full flex flex-col">
                    <div className="p-6 border-b border-white/5">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Activity className="w-5 h-5 text-cyan-400" />
                            PERFORMANCE HISTORY
                        </h3>
                    </div>
                    <div className="p-6 flex-1 min-h-[300px]">
                        {pointsHistory.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                                {isClient && localStorage.getItem('token') ? 'Loading history...' : 'Login required'}
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={pointsHistory}>
                                    <defs>
                                        <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis 
                                        dataKey="date" 
                                        tickFormatter={(value) => {
                                            const date = new Date(value)
                                            return `${date.getMonth() + 1}/${date.getDate()}`
                                        }}
                                        stroke="#64748b"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        dy={10}
                                    />
                                    <YAxis 
                                        tickFormatter={(value) => `${value}`}
                                        stroke="#64748b"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        dx={-10}
                                    />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                                        labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                                        formatter={(value: number) => [`${value.toLocaleString()} P`, 'Points']}
                                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="points" 
                                        stroke="#8b5cf6" 
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: '#1e293b', stroke: '#8b5cf6', strokeWidth: 2 }}
                                        activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </motion.div>

        </div>
      </main>
    </div>
  )
}
