'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import HeaderNavigator from '@/components/HeaderNavigator'
import { Button } from '@/components/ui/button'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { Trophy, Crown, Activity, Gamepad2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface RankingUser {
  id: number
  email: string
  nickname: string | null
  points: number
  level: number
  rank: number
}

export default function Home() {
  const router = useRouter()
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
        <section className="mb-12">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex flex-col md:flex-row justify-between items-end gap-6"
            >
                <div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-2 bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">
                        DASHBOARD
                    </h1>
                    <p className="text-slate-400 text-lg">
                        Welcome back, <span className="text-purple-400 font-bold">{currentUser?.nickname || 'Guest'}</span>.
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

        {/* Enter Game Lobby Button - New Section */}
        <section className="mb-16">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
            >
                <Link href="/game" className="group relative block w-full">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-20 group-hover:opacity-30 blur-2xl transition-opacity duration-500 rounded-3xl -z-10" />
                    <div className="h-32 md:h-40 bg-[#131316] border border-white/10 rounded-3xl flex items-center justify-between px-8 md:px-16 hover:border-purple-500/50 transition-all duration-300 shadow-2xl overflow-hidden relative group-hover:scale-[1.01]">
                         <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                         
                         <div className="flex items-center gap-6 md:gap-8 relative z-10">
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:shadow-purple-500/30 transition-all">
                                <Gamepad2 className="w-8 h-8 md:w-10 md:h-10 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl md:text-3xl font-black text-white mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-purple-300 transition-all">
                                    ENTER GAME LOBBY
                                </h2>
                                <p className="text-slate-400 text-sm md:text-base group-hover:text-slate-200">
                                    다양한 미니게임이 기다리고 있습니다. 지금 입장하세요!
                                </p>
                            </div>
                         </div>

                         <div className="hidden md:flex items-center gap-2 text-purple-400 font-bold group-hover:translate-x-2 transition-transform">
                            PLAY NOW
                            <ArrowRight className="w-5 h-5" />
                         </div>
                    </div>
                </Link>
            </motion.div>
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
