'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import HeaderNavigator from '@/components/HeaderNavigator'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Gift, TrendingUp, Clover, Club, Disc, Layers, Rocket, Wind, Users,
    BarChart2, Trophy, Coins, Zap, LayoutGrid, Dices, Award, Box
} from 'lucide-react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

// --- Game Data ---
const GAMES = {
    casino: [
        { id: 'holdem', name: 'Texas Holdem', desc: '심리전의 정수, 텍사스 홀덤', icon: Users, path: '/game/holdem', color: 'from-red-600 to-rose-900', accent: 'text-red-500', multiplayer: true },
        { id: 'blackjack', name: 'Blackjack', desc: '21을 향한 승부', icon: Club, path: '/game/blackjack', color: 'from-slate-700 to-slate-900', accent: 'text-slate-400' },
        { id: 'bustabit', name: 'Graph Game', desc: '타이밍이 생명! 그래프', icon: TrendingUp, path: '/game/bustabit', color: 'from-orange-600 to-red-700', accent: 'text-orange-500' },
        { id: 'roulette', name: 'Roulette', desc: '운명의 휠을 돌려라', icon: Disc, path: '/game/roulette', color: 'from-purple-600 to-pink-700', accent: 'text-purple-500' },
        { id: 'cloverpit', name: 'Slots', desc: '잭팟을 노려라', icon: Clover, path: '/game/cloverpit', color: 'from-green-600 to-emerald-800', accent: 'text-green-500' },
    ],
    arcade: [
        { id: 'skyroads', name: 'Sky Roads', desc: '우주를 질주하라', icon: Rocket, path: '/game/skyroads', color: 'from-indigo-600 to-purple-700', accent: 'text-indigo-500', pcOnly: true },
        { id: 'windrunner', name: 'Wind Runner', desc: '바람을 가르는 질주', icon: Wind, path: '/game/windrunner', color: 'from-cyan-500 to-blue-600', accent: 'text-cyan-400', pcOnly: true },
        { id: 'stairs', name: 'Infinite Stairs', desc: '무한 계단 오르기', icon: Layers, path: '/game/stairs', color: 'from-blue-600 to-indigo-700', accent: 'text-blue-500' },
        { id: 'stacker', name: 'Stacker', desc: '블록을 쌓아 올려라', icon: Box, path: '/game/stacker', color: 'from-cyan-600 to-purple-700', accent: 'text-cyan-400' },
    ],
    shop: [ // Kuji moved to shop category for display
        { id: 'kuji', name: 'Ichiban Kuji', desc: '행운의 뽑기! (100P)', icon: Gift, path: '/game/kuji', color: 'from-yellow-500 to-amber-700', accent: 'text-yellow-500', inProgress: true }
    ]
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function GameLobby() {
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [kujiResult, setKujiResult] = useState<any>(null)
    const [isBuyingKuji, setIsBuyingKuji] = useState(false)
    const [showKujiModal, setShowKujiModal] = useState(false)

    useEffect(() => {
        const abortController = new AbortController()
        
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/stats', {
                    signal: abortController.signal
                })
                if (res.ok) {
                    const data = await res.json()
                    // Filter out non-casino games from chart data
                    if (data.byGame) {
                        data.byGame = data.byGame.filter((g: any) =>
                            ['blackjack', 'bustabit', 'cloverpit', 'roulette', 'holdem'].includes(g.gameType)
                        );
                    }
                    // 디버깅: 순위 데이터 확인
                    if (data.rankings) {
                        console.log('Rankings data:', data.rankings)
                    }
                    setStats(data)
                } else {
                    console.error('Stats API error:', res.status, await res.text())
                }
            } catch (e: any) {
                // AbortError는 무시 (의도적인 취소)
                if (e.name !== 'AbortError') {
                    console.error('Stats fetch error:', e)
                }
            } finally {
                if (!abortController.signal.aborted) {
                    setLoading(false)
                }
            }
        }
        
        fetchStats()
        
        return () => {
            abortController.abort()
        }
    }, [])


    const handleGameClick = (e: React.MouseEvent, game: any) => {
        // No modal needed anymore, direct link
    }

    const handleBuyKuji = async () => {
        if (isBuyingKuji) return;
        setIsBuyingKuji(true);
        setKujiResult(null);
        
        const abortController = new AbortController();
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                toast.error('로그인이 필요합니다.');
                setIsBuyingKuji(false);
                return;
            }
            const res = await fetch('/api/shop/kuji', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                signal: abortController.signal
            });
            const data = await res.json();
            if (res.ok) {
                setKujiResult(data.prize);
                toast.success(`[Rank ${data.prize.rank}] ${data.prize.name} 당첨!`);
                // Stats 업데이트 (AbortController 없이, 단순 요청)
                try {
                    const statsRes = await fetch('/api/stats');
                    if (statsRes.ok) {
                        const statsData = await statsRes.json();
                        if (statsData.byGame) {
                            statsData.byGame = statsData.byGame.filter((g: any) =>
                                ['blackjack', 'bustabit', 'cloverpit', 'roulette', 'holdem'].includes(g.gameType)
                            );
                        }
                        setStats(statsData);
                    }
                } catch (e) {
                    // Stats 업데이트 실패는 무시
                }
            } else {
                toast.error(data.error || '뽑기 실패');
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error('Kuji buy error:', error);
                toast.error('뽑기 중 오류가 발생했습니다.');
            }
        } finally {
            setIsBuyingKuji(false);
        }
    }

    // --- Components ---

    const GameCard = ({ game, gameStats }: { game: any; gameStats?: any }) => {
        // 해당 게임의 통계 찾기
        const stat = gameStats?.find((s: any) => s.gameType === game.id)
        
        return (
        <Link href={game.path} onClick={(e) => handleGameClick(e, game)} className="group relative block h-40">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -5 }}
                className="h-full w-full"
            >
                <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500 rounded-2xl -z-10`} />
                <div className={`h-full bg-[#18181b] border rounded-2xl p-4 flex flex-col justify-between hover:bg-[#202023] transition-all duration-300 relative overflow-hidden ${game.inProgress
                        ? 'border-cyan-500/60 animate-neon-pulse'
                        : 'border-white/5 hover:border-white/20'
                    }`}>
                    {game.beta && <span className="absolute top-3 right-3 text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded border border-red-400/20">BETA</span>}
                    {game.pcOnly && <span className="absolute top-3 right-3 text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20">PC</span>}
                    {game.multiplayer && <span className="absolute top-3 right-3 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20 animate-pulse">MULTI</span>}
                    {game.inProgress && (
                        <>
                            {/* 사이버펑크 네온 효과 배경 - 번쩍이는 효과 */}
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/30 to-cyan-500/0 animate-shimmer pointer-events-none" />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.15),transparent_70%)] animate-pulse pointer-events-none" />

                            {/* 네온 테두리 효과 */}
                            <div className="absolute inset-0 rounded-2xl border-2 border-cyan-500/40 animate-neon-pulse pointer-events-none" />

                            {/* 진행중 라벨 - 사이버펑크 스타일 */}
                            <div className="absolute top-3 right-3 z-10">
                                <div className="relative">
                                    {/* 네온 글로우 효과 */}
                                    <div className="absolute inset-0 bg-cyan-500 blur-lg opacity-60 animate-pulse" />
                                    {/* 메인 라벨 */}
                                    <span className="relative text-[10px] font-black text-cyan-300 bg-black/90 px-2.5 py-1 rounded border-2 border-cyan-500/80 tracking-wider uppercase animate-glow">
                                        IN PROGRESS
                                    </span>
                                </div>
                            </div>

                            {/* 절찬리 진행중 텍스트 */}
                            <div className="absolute bottom-3 left-3 right-3 z-10">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-yellow-500/30 blur-md animate-pulse" />
                                    <span className="relative text-[9px] font-bold text-yellow-300 bg-black/70 px-2 py-0.5 rounded border border-yellow-500/60 shadow-[0_0_15px_rgba(234,179,8,0.5)] tracking-wider">
                                        🔥 절찬리 진행중 🔥
                                    </span>
                                </div>
                            </div>
                        </>
                    )}

                    <div className={`z-10 ${game.inProgress ? 'mt-2' : ''}`}>
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${game.color} flex items-center justify-center shadow-lg mb-3 ${game.inProgress ? 'shadow-cyan-500/30' : ''}`}>
                            <game.icon className="w-4 h-4 text-white" />
                        </div>
                        <h3 className={`text-base font-bold mb-1 transition-all ${game.inProgress
                                ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                                : 'text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400'
                            }`}>
                            {game.name}
                        </h3>
                        <p className="text-gray-400 text-[11px] line-clamp-1">{game.desc}</p>
                    </div>
                </div>
            </motion.div>
        </Link>
        )
    }

    return (
        <div className="min-h-screen bg-[#09090b] text-slate-100 overflow-x-hidden selection:bg-indigo-500/30">
            <HeaderNavigator />

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 pb-20">
                {/* Header & Summary */}
                <section className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2">GAME CENTER</h1>
                        <p className="text-slate-400">다양한 게임과 보상이 기다리고 있습니다.</p>
                    </motion.div>
                    {stats && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex gap-4"
                        >
                            <div className="bg-[#18181b] border border-white/5 rounded-xl px-4 py-2 text-right">
                                <div className="text-xs text-slate-500">Live Win Rate</div>
                                <div className="text-xl font-bold text-emerald-400">{stats.summary.winRate.toFixed(1)}%</div>
                            </div>
                            <div className="bg-[#18181b] border border-white/5 rounded-xl px-4 py-2 text-right">
                                <div className="text-xs text-slate-500">Total Profit</div>
                                <div className={`text-xl font-bold ${stats.summary.totalProfit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                                    {stats.summary.totalProfit > 0 ? '+' : ''}{stats.summary.totalProfit.toLocaleString()}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </section>

                {/* --- Game Lists (Categorized) --- */}

                {/* Casino Games */}
                <section className="mb-12">
                    <div className="flex items-center gap-2 mb-6">
                        <Dices className="w-5 h-5 text-indigo-500" />
                        <h2 className="text-xl font-bold text-white">Casino Games</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {GAMES.casino.map(g => <GameCard key={g.id} game={g} gameStats={stats?.byGame} />)}
                    </div>
                </section>

                {/* Arcade Games */}
                <section className="mb-12">
                    <div className="flex items-center gap-2 mb-6">
                        <Zap className="w-5 h-5 text-yellow-500" />
                        <h2 className="text-xl font-bold text-white">Arcade Games</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {GAMES.arcade.map(g => <GameCard key={g.id} game={g} />)}
                    </div>
                </section>

                {/* Shop / Event */}
                <section className="mb-16">
                    <div className="flex items-center gap-2 mb-6">
                        <Gift className="w-5 h-5 text-pink-500" />
                        <h2 className="text-xl font-bold text-white">Shop & Event</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {GAMES.shop.map(g => <GameCard key={g.id} game={g} />)}
                    </div>
                </section>

                {/* Kuji Modal Overlay Removed */}

                {/* --- Bottom Stats Section --- */}
                <section className="border-t border-white/5 pt-12">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                        <BarChart2 className="w-6 h-6 text-indigo-500" />
                        Game Statistics
                    </h2>

                    {/* 카지노 통계 통합 꺽은선 그래프 */}
                    <Card className="bg-[#18181b] border-white/10 mb-8">
                        <CardHeader>
                            <CardTitle className="text-lg text-white">Casino Statistics Overview</CardTitle>
                            <CardDescription>카지노 게임별 승률, 환급률, 거래량, 배율 통합 현황</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[400px]">
                            {stats?.byGame && stats.byGame.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={stats.byGame}>
                                        <defs>
                                            <linearGradient id="colorWinRate" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorRTP" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorMultiplier" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis 
                                            dataKey="gameType" 
                                            stroke="#999" 
                                            fontSize={12} 
                                            tickFormatter={(v) => v.toUpperCase()} 
                                            angle={-45}
                                            textAnchor="end"
                                            height={80}
                                        />
                                        <YAxis 
                                            yAxisId="left"
                                            stroke="#64748b"
                                            fontSize={12}
                                            label={{ value: '승률/환급률 (%)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#94a3b8' } }}
                                        />
                                        <YAxis 
                                            yAxisId="right"
                                            orientation="right"
                                            stroke="#64748b"
                                            fontSize={12}
                                            label={{ value: '거래량/배율', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: '#94a3b8' } }}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                                            formatter={(value: any, name: any) => {
                                                if (value === undefined || value === null || typeof value !== 'number') {
                                                    return [value ?? 0, name ?? ''];
                                                }
                                                const nameStr = String(name || '');
                                                if (nameStr === 'winRate' || nameStr === 'rtp') {
                                                    return [`${value.toFixed(1)}%`, nameStr === 'winRate' ? '승률' : '환급률']
                                                } else if (nameStr === 'totalBet') {
                                                    return [`${value.toLocaleString()} P`, '거래량']
                                                } else if (nameStr === 'avgMultiplier') {
                                                    return [`${value.toFixed(2)}x`, '평균 배율']
                                                }
                                                return [value, nameStr]
                                            }}
                                        />
                                        <Legend 
                                            wrapperStyle={{ paddingTop: '20px' }}
                                            formatter={(value: string) => {
                                                const labels: Record<string, string> = {
                                                    'winRate': '승률',
                                                    'rtp': '환급률',
                                                    'totalBet': '거래량',
                                                    'avgMultiplier': '평균 배율'
                                                }
                                                return labels[value] || value
                                            }}
                                        />
                                        <Line 
                                            yAxisId="left"
                                            type="monotone" 
                                            dataKey="winRate" 
                                            stroke="#10b981" 
                                            strokeWidth={3}
                                            dot={{ r: 5, fill: '#10b981' }}
                                            activeDot={{ r: 7 }}
                                            name="winRate"
                                        />
                                        <Line 
                                            yAxisId="left"
                                            type="monotone" 
                                            dataKey="rtp" 
                                            stroke="#3b82f6" 
                                            strokeWidth={3}
                                            dot={{ r: 5, fill: '#3b82f6' }}
                                            activeDot={{ r: 7 }}
                                            name="rtp"
                                        />
                                        <Line 
                                            yAxisId="right"
                                            type="monotone" 
                                            dataKey="totalBet" 
                                            stroke="#f59e0b" 
                                            strokeWidth={3}
                                            dot={{ r: 5, fill: '#f59e0b' }}
                                            activeDot={{ r: 7 }}
                                            name="totalBet"
                                        />
                                        <Line 
                                            yAxisId="right"
                                            type="monotone" 
                                            dataKey="avgMultiplier" 
                                            stroke="#a855f7" 
                                            strokeWidth={3}
                                            dot={{ r: 5, fill: '#a855f7' }}
                                            activeDot={{ r: 7 }}
                                            name="avgMultiplier"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-zinc-600">
                                    {loading ? "로딩 중..." : "데이터가 없습니다."}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* 게임별 상세 통계 (탭으로 전환) */}
                    <Card className="bg-[#18181b] border-white/10">
                        <CardHeader>
                            <CardTitle className="text-lg text-white">Game Details</CardTitle>
                            <CardDescription>카지노 게임별 상세 통계</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {stats?.byGame && stats.byGame.length > 0 ? (
                                <Tabs defaultValue={stats.byGame[0]?.gameType || 'blackjack'} className="w-full">
                                    <TabsList className="bg-[#27272a] mb-6 w-full justify-start flex-wrap">
                                        {stats.byGame.map((game: any) => (
                                            <TabsTrigger key={game.gameType} value={game.gameType} className="uppercase">
                                                {game.gameType}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                    
                                    {stats.byGame.map((game: any) => (
                                        <TabsContent key={game.gameType} value={game.gameType}>
                                            <div className="bg-black/20 p-6 rounded-lg border border-white/5">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="text-xl font-bold text-white uppercase">{game.gameType}</h4>
                                                    <span className="text-sm text-gray-500">{game.totalGames.toLocaleString()}회 플레이</span>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                                    <div>
                                                        <span className="text-gray-500 block mb-1">승리</span>
                                                        <div className="text-emerald-400 font-semibold text-lg">{game.wins?.toLocaleString() || 0}회</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500 block mb-1">패배</span>
                                                        <div className="text-red-400 font-semibold text-lg">{game.losses?.toLocaleString() || 0}회</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500 block mb-1">승률</span>
                                                        <div className="text-emerald-400 font-semibold text-lg">{game.winRate?.toFixed(1) || '0.0'}%</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500 block mb-1">환급률</span>
                                                        <div className="text-blue-400 font-semibold text-lg">{game.rtp?.toFixed(1) || '0.0'}%</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500 block mb-1">총 베팅</span>
                                                        <div className="text-blue-400 font-semibold text-lg">{game.totalBet?.toLocaleString() || 0} P</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500 block mb-1">총 지급</span>
                                                        <div className="text-purple-400 font-semibold text-lg">{game.totalPayout?.toLocaleString() || 0} P</div>
                                                    </div>
                                                    {game.maxPayout > 0 && (
                                                        <div>
                                                            <span className="text-gray-500 block mb-1">최대 승리</span>
                                                            <div className="text-yellow-400 font-semibold text-lg">{game.maxPayout?.toLocaleString() || 0} P</div>
                                                        </div>
                                                    )}
                                                    {game.avgMultiplier > 0 && (
                                                        <div>
                                                            <span className="text-gray-500 block mb-1">평균 배율</span>
                                                            <div className="text-pink-400 font-semibold text-lg">{game.avgMultiplier?.toFixed(2) || '0.00'}x</div>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <span className="text-gray-500 block mb-1">순수익</span>
                                                        <div className={`font-semibold text-lg ${game.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {game.profit >= 0 ? '+' : ''}{game.profit?.toLocaleString() || 0} P
                                                        </div>
                                                    </div>
                                                    {game.recent24h !== undefined && (
                                                        <div>
                                                            <span className="text-gray-500 block mb-1">최근 24시간</span>
                                                            <div className="text-cyan-400 font-semibold text-lg">{game.recent24h?.toLocaleString() || 0}회</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </TabsContent>
                                    ))}
                                </Tabs>
                            ) : (
                                <div className="text-center py-10 text-zinc-600">
                                    {loading ? "로딩 중..." : "데이터가 없습니다."}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Arcade Ranking List */}
                    <Card className="bg-[#18181b] border-white/10 mt-8">
                        <CardHeader>
                            <CardTitle className="text-lg text-white">Hall of Fame</CardTitle>
                            <CardDescription>기록 경쟁 게임 최고 득점자 (Top 3)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="skyroads" className="w-full">
                                <TabsList className="bg-[#27272a] mb-4 w-full justify-start">
                                    <TabsTrigger value="skyroads" className="flex-1">SkyRoads</TabsTrigger>
                                    <TabsTrigger value="windrunner" className="flex-1">WindRunner</TabsTrigger>
                                    <TabsTrigger value="stairs" className="flex-1">Stairs</TabsTrigger>
                                </TabsList>

                                {['skyroads', 'windrunner', 'stairs'].map((gameKey) => (
                                    <TabsContent key={gameKey} value={gameKey}>
                                        <div className="space-y-3">
                                            {loading ? (
                                                <div className="text-center py-10 text-zinc-600">로딩 중...</div>
                                            ) : stats?.rankings?.[gameKey]?.length > 0 ? (
                                                stats.rankings[gameKey].map((rank: any, idx: number) => (
                                                    <div key={idx} className="flex items-center justify-between bg-black/20 p-3 rounded-lg border border-white/5">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 flex items-center justify-center rounded font-bold ${idx === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                                                                idx === 1 ? 'bg-zinc-400/20 text-zinc-400' :
                                                                    idx === 2 ? 'bg-amber-700/20 text-amber-700' : 'text-zinc-600'
                                                                }`}>
                                                                {idx + 1}
                                                            </div>
                                                            <span className="text-white font-medium">{rank.nickname || 'Unknown'}</span>
                                                        </div>
                                                        <span className="font-mono text-indigo-400">{rank.score?.toLocaleString() || 0}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-10 text-zinc-600">
                                                    아직 기록이 없습니다. 도전을 시작하세요!
                                                    {stats && !stats.rankings && <div className="text-xs mt-2 text-zinc-700">(데이터 로드 중...)</div>}
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                                ))}
                            </Tabs>
                        </CardContent>
                    </Card>
                </section>
            </main>
        </div>
    )
}
