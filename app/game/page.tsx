'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import HeaderNavigator from '@/components/HeaderNavigator'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Gift, TrendingUp, Clover, Club, Disc, Layers, Rocket, Wind, Users,
    BarChart2, Trophy, Coins, Zap, LayoutGrid, Dices, Award
} from 'lucide-react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

// --- Game Data ---
const GAMES = {
    casino: [
        { id: 'holdem', name: 'Texas Holdem', desc: '심리전의 정수, 텍사스 홀덤', icon: Users, path: '/game/holdem', color: 'from-red-600 to-rose-900', accent: 'text-red-500' },
        { id: 'blackjack', name: 'Blackjack', desc: '21을 향한 승부', icon: Club, path: '/game/blackjack', color: 'from-slate-700 to-slate-900', accent: 'text-slate-400' },
        { id: 'bustabit', name: 'Graph Game', desc: '타이밍이 생명! 그래프', icon: TrendingUp, path: '/game/bustabit', color: 'from-orange-600 to-red-700', accent: 'text-orange-500' },
        { id: 'roulette', name: 'Roulette', desc: '운명의 휠을 돌려라', icon: Disc, path: '/game/roulette', color: 'from-purple-600 to-pink-700', accent: 'text-purple-500', beta: true },
        { id: 'cloverpit', name: 'Slots', desc: '잭팟을 노려라', icon: Clover, path: '/game/cloverpit', color: 'from-green-600 to-emerald-800', accent: 'text-green-500' },
    ],
    arcade: [
        { id: 'skyroads', name: 'Sky Roads', desc: '우주를 질주하라', icon: Rocket, path: '/game/skyroads', color: 'from-indigo-600 to-purple-700', accent: 'text-indigo-500', pcOnly: true },
        { id: 'windrunner', name: 'Wind Runner', desc: '바람을 가르는 질주', icon: Wind, path: '/game/windrunner', color: 'from-cyan-500 to-blue-600', accent: 'text-cyan-400', pcOnly: true },
        { id: 'stairs', name: 'Infinite Stairs', desc: '무한 계단 오르기', icon: Layers, path: '/game/stairs', color: 'from-blue-600 to-indigo-700', accent: 'text-blue-500', beta: true },
    ],
    kuji: [
        { id: 'kuji', name: 'Ichiban Kuji', desc: '행운의 뽑기! (100P)', icon: Gift, path: '/game/kuji', color: 'from-yellow-500 to-amber-700', accent: 'text-yellow-500' }
    ]
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function GameLobby() {
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('casino')
    const [kujiResult, setKujiResult] = useState<any>(null)
    const [isBuyingKuji, setIsBuyingKuji] = useState(false)

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

    const handleBuyKuji = async () => {
        if (isBuyingKuji) return;
        setIsBuyingKuji(true);
        setKujiResult(null);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                toast.error('로그인이 필요합니다.');
                return;
            }
            const res = await fetch('/api/shop/kuji', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setKujiResult(data.prize);
                toast.success(`[Rank ${data.prize.rank}] ${data.prize.name} 당첨!`);
                fetchStats(); // Update stats/points (indirectly)
            } else {
                toast.error(data.error);
            }
        } catch (e) {
            toast.error('구매 중 오류가 발생했습니다.');
        } finally {
            setIsBuyingKuji(false);
        }
    }

    // --- Components ---

    const GameCard = ({ game, compact = false }: { game: any, compact?: boolean }) => (
        <Link href={game.path} className={`group relative block ${compact ? 'h-40' : 'h-48'}`}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -5 }}
                className="h-full w-full"
            >
                <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500 rounded-2xl -z-10`} />
                <div className="h-full bg-[#18181b] border border-white/5 rounded-2xl p-5 flex flex-col justify-between hover:border-white/20 hover:bg-[#202023] transition-all duration-300 relative overflow-hidden">
                    {game.beta && <span className="absolute top-3 right-3 text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded border border-red-400/20">BETA</span>}
                    {game.pcOnly && <span className="absolute top-3 right-3 text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20">PC</span>}

                    <div className="z-10">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${game.color} flex items-center justify-center shadow-lg mb-3`}>
                            <game.icon className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 transition-all">
                            {game.name}
                        </h3>
                        <p className="text-gray-400 text-xs line-clamp-2">{game.desc}</p>
                    </div>
                </div>
            </motion.div>
        </Link>
    )

    return (
        <div className="min-h-screen bg-[#09090b] text-slate-100 overflow-x-hidden selection:bg-indigo-500/30">
            <HeaderNavigator />

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 pb-20">
                <section className="mb-10 flex flex-col md:flex-row justify-between items-end gap-6">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2">GAME CENTER</h1>
                        <p className="text-slate-400">다양한 게임과 보상이 기다리고 있습니다.</p>
                    </div>
                    {/* Stats Summary Mini */}
                    {stats && (
                        <div className="flex gap-4">
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
                        </div>
                    )}
                </section>

                <Tabs defaultValue="casino" value={activeTab} onValueChange={setActiveTab} className="w-full mb-16">
                    <TabsList className="bg-[#18181b] border border-white/5 p-1 mb-8">
                        <TabsTrigger value="casino" className="data-[state=active]:bg-[#27272a] data-[state=active]:text-white px-6">
                            <Dices className="w-4 h-4 mr-2" /> Casino
                        </TabsTrigger>
                        <TabsTrigger value="arcade" className="data-[state=active]:bg-[#27272a] data-[state=active]:text-white px-6">
                            <Zap className="w-4 h-4 mr-2" /> Arcade
                        </TabsTrigger>
                        <TabsTrigger value="kuji" className="data-[state=active]:bg-[#27272a] data-[state=active]:text-white px-6">
                            <Gift className="w-4 h-4 mr-2" /> Event & Kuji
                        </TabsTrigger>
                    </TabsList>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <TabsContent value="casino" className="mt-0">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                    {GAMES.casino.map(g => <GameCard key={g.id} game={g} compact />)}
                                </div>
                            </TabsContent>

                            <TabsContent value="arcade" className="mt-0">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {GAMES.arcade.map(g => <GameCard key={g.id} game={g} compact />)}
                                </div>
                            </TabsContent>

                            <TabsContent value="kuji" className="mt-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                    {/* Kuji Machine UI */}
                                    <Card className="bg-[#18181b] border-white/10 overflow-hidden relative">
                                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent pointer-events-none" />
                                        <CardHeader className="text-center pb-2">
                                            <div className="mx-auto w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4 border border-yellow-500/30">
                                                <Gift className="w-8 h-8 text-yellow-500" />
                                            </div>
                                            <CardTitle className="text-2xl text-white">Ichiban Kuji</CardTitle>
                                            <CardDescription>100 포인트로 행운을 잡으세요!</CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex flex-col items-center pt-6 pb-8">
                                            <AnimatePresence mode="wait">
                                                {kujiResult ? (
                                                    <motion.div
                                                        initial={{ scale: 0.8, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        className="text-center mb-6 p-6 bg-yellow-500/10 rounded-xl border border-yellow-500/30 w-full"
                                                    >
                                                        <div className="text-yellow-500 font-black text-4xl mb-2">{kujiResult.rank}</div>
                                                        <div className="text-white text-lg font-bold">{kujiResult.name}</div>
                                                    </motion.div>
                                                ) : (
                                                    <div className="text-center mb-6 p-6 border border-dashed border-zinc-700 rounded-xl w-full text-zinc-500">
                                                        결과가 여기에 표시됩니다
                                                    </div>
                                                )}
                                            </AnimatePresence>

                                            <Button
                                                size="lg"
                                                className="w-full bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 border-none text-white font-bold h-14 text-lg shadow-lg shadow-yellow-900/20"
                                                onClick={handleBuyKuji}
                                                disabled={isBuyingKuji}
                                            >
                                                {isBuyingKuji ? "뽑는 중..." : "100P 뽑기"}
                                            </Button>
                                            <p className="mt-4 text-xs text-zinc-500 text-center">
                                                S상: MacBook Pro (0.1%) | A상: iPad (0.5%) | B상: AirPods (2%)<br />
                                                사용된 포인트는 환불되지 않습니다.
                                            </p>
                                        </CardContent>
                                    </Card>

                                    {/* Event Banner (Dummy) */}
                                    <Card className="bg-[#18181b] border-white/10 h-full flex flex-col justify-center items-center p-8 text-center opacity-70 hover:opacity-100 transition-opacity">
                                        <Trophy className="w-12 h-12 text-purple-500 mb-4" />
                                        <h3 className="text-xl font-bold text-white mb-2">시즌 랭킹 이벤트</h3>
                                        <p className="text-zinc-400">
                                            매월 1일, 아케이드 게임 랭킹 1위에게<br />특별한 보상을 드립니다.
                                        </p>
                                    </Card>
                                </div>
                            </TabsContent>
                        </motion.div>
                    </AnimatePresence>
                </Tabs>

                {/* --- Bottom Stats Section --- */}
                <section className="border-t border-white/5 pt-12">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                        <BarChart2 className="w-6 h-6 text-indigo-500" />
                        Game Statistics
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Casino Stats Chart */}
                        <Card className="bg-[#18181b] border-white/10">
                            <CardHeader>
                                <CardTitle className="text-lg text-white">Casino Win Rates</CardTitle>
                                <CardDescription>카지노 게임별 승률 현황</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                {stats?.byGame ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.byGame} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                            <XAxis type="number" stroke="#666" fontSize={12} unit="%" domain={[0, 100]} />
                                            <YAxis dataKey="gameType" type="category" stroke="#999" fontSize={12} tickFormatter={(v) => v.toUpperCase()} width={80} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#111', borderColor: '#333' }}
                                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            />
                                            <Bar dataKey="winRate" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} name="Win Rate" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-zinc-600">No Data</div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Arcade Ranking List */}
                        <Card className="bg-[#18181b] border-white/10">
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
                                                {stats?.rankings?.[gameKey]?.length > 0 ? (
                                                    stats.rankings[gameKey].map((rank: any, idx: number) => (
                                                        <div key={idx} className="flex items-center justify-between bg-black/20 p-3 rounded-lg border border-white/5">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 flex items-center justify-center rounded font-bold ${idx === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                                                                        idx === 1 ? 'bg-zinc-400/20 text-zinc-400' :
                                                                            idx === 2 ? 'bg-amber-700/20 text-amber-700' : 'text-zinc-600'
                                                                    }`}>
                                                                    {idx + 1}
                                                                </div>
                                                                <span className="text-white font-medium">{rank.nickname}</span>
                                                            </div>
                                                            <span className="font-mono text-indigo-400">{rank.score.toLocaleString()}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-10 text-zinc-600">아직 기록이 없습니다. 도전을 시작하세요!</div>
                                                )}
                                            </div>
                                        </TabsContent>
                                    ))}
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>
                </section>
            </main>
        </div>
    )
}
