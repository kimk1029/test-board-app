'use client'

import { useState, useEffect } from 'react'
import HeaderNavigator from '@/components/HeaderNavigator'
import { motion } from 'framer-motion'
import { Trophy, Crown, Zap, Rocket, BarChart3, Search } from 'lucide-react'
import Billboard from '@/components/Billboard'

// 더미 데이터 (각 게임별 랭킹)
const GAME_RANKINGS = {
    blackjack: [
        { rank: 1, name: 'CardMaster', points: 54000, detail: 'Win Rate 62%' },
        { rank: 2, name: 'DealerBuster', points: 42000, detail: 'Win Rate 58%' },
        { rank: 3, name: 'AceHigh', points: 38000, detail: 'Win Rate 55%' },
        { rank: 4, name: 'BlackjackPro', points: 31000, detail: 'Win Rate 51%' },
        { rank: 5, name: 'HitOrStand', points: 28000, detail: 'Win Rate 49%' },
        { rank: 6, name: 'JackPot777', points: 25000, detail: 'Win Rate 48%' },
        { rank: 7, name: 'LuckyGuy', points: 21000, detail: 'Win Rate 45%' },
        { rank: 8, name: 'CasinoRoyale', points: 18000, detail: 'Win Rate 42%' },
    ],
    skyroads: [
        { rank: 1, name: 'SpacePilot', points: 25000, detail: 'Stage 12 Clear' },
        { rank: 2, name: 'GalaxyDrifter', points: 21000, detail: 'Stage 10 Clear' },
        { rank: 3, name: 'StarWalker', points: 18000, detail: 'Stage 9 Clear' },
        { rank: 4, name: 'VoidJumper', points: 15500, detail: 'Stage 8 Clear' },
        { rank: 5, name: 'CosmicRacer', points: 12000, detail: 'Stage 7 Clear' },
        { rank: 6, name: 'NebulaSurfer', points: 10500, detail: 'Stage 6 Clear' },
        { rank: 7, name: 'AstroBoy', points: 9000, detail: 'Stage 5 Clear' },
        { rank: 8, name: 'SpeedDemon', points: 7500, detail: 'Stage 4 Clear' },
    ],
    bustabit: [
        { rank: 1, name: 'ToTheMoon', points: 45000, detail: 'Max Multi x84.5' },
        { rank: 2, name: 'HodlGang', points: 32000, detail: 'Max Multi x52.0' },
        { rank: 3, name: 'RocketMan', points: 28000, detail: 'Max Multi x31.2' },
        { rank: 4, name: 'CrashTest', points: 22000, detail: 'Max Multi x25.5' },
        { rank: 5, name: 'EarlyExit', points: 19000, detail: 'Max Multi x18.0' },
        { rank: 6, name: 'DiamondHands', points: 15000, detail: 'Max Multi x15.0' },
        { rank: 7, name: 'PaperHands', points: 12000, detail: 'Max Multi x12.5' },
        { rank: 8, name: 'FomoBuyer', points: 10000, detail: 'Max Multi x10.0' },
    ]
};

// 통합 랭킹 더미
const TOTAL_RANKING_DUMMY = [
    { rank: 1, name: 'JackpotKing', points: 125000, level: 42 },
    { rank: 2, name: 'SpeedRunner', points: 95400, level: 35 },
    { rank: 3, name: 'Lucky777', points: 88200, level: 28 },
    { rank: 4, name: 'DopamineAddict', points: 82000, level: 25 },
    { rank: 5, name: 'GameMaster', points: 78000, level: 24 },
    { rank: 6, name: 'NewbieKiller', points: 75000, level: 22 },
    { rank: 7, name: 'ProGamer', points: 71000, level: 20 },
    { rank: 8, name: 'WeekendWarrior', points: 68000, level: 19 },
    { rank: 9, name: 'CasualPlayer', points: 65000, level: 18 },
    { rank: 10, name: 'Guest1234', points: 62000, level: 15 },
];

export default function LeaderboardPage() {
  const [leaderboardTab, setLeaderboardTab] = useState<'total' | 'blackjack' | 'skyroads' | 'bustabit'>('total');

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" fill="currentColor" />
    if (rank === 2) return <Trophy className="w-5 h-5 text-slate-300" />
    if (rank === 3) return <Trophy className="w-5 h-5 text-amber-600" />
    return <span className="w-6 text-center font-bold text-slate-500">#{rank}</span>
  }

  const renderLeaderboardList = () => {
    if (leaderboardTab === 'total') {
        // 상위 3명
        const top3 = TOTAL_RANKING_DUMMY.slice(0, 3);
        // 나머지
        const rest = TOTAL_RANKING_DUMMY.slice(3);
        
        return (
            <div>
                {/* Top 3 Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    {top3.map((user, idx) => (
                        <motion.div 
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`relative ${user.rank === 1 ? 'md:-mt-6 z-10' : ''}`}
                        >
                            <div className={`bg-[#1a1a20] border ${user.rank === 1 ? 'border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.2)]' : 'border-white/10'} rounded-3xl p-6 flex flex-col items-center relative overflow-hidden group hover:border-purple-500/50 transition-all duration-300 h-full justify-center`}>
                                {user.rank === 1 && <div className="absolute inset-0 bg-yellow-500/5 pointer-events-none" />}
                                
                                <div className="relative mb-4">
                                    <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full ${user.rank === 1 ? 'bg-yellow-400/20 ring-yellow-400' : user.rank === 2 ? 'bg-slate-300/20 ring-slate-300' : 'bg-amber-700/20 ring-amber-700'} flex items-center justify-center mb-2 ring-2 ring-offset-4 ring-offset-[#1a1a20]`}>
                                        <span className={`text-3xl md:text-4xl font-black ${user.rank === 1 ? 'text-yellow-400' : user.rank === 2 ? 'text-slate-300' : 'text-amber-700'}`}>
                                            {user.rank}
                                        </span>
                                    </div>
                                    {user.rank === 1 && (
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 animate-bounce">
                                            <Crown className="w-8 h-8 md:w-10 md:h-10 text-yellow-400 fill-yellow-400" />
                                        </div>
                                    )}
                                </div>
                                
                                <h3 className="text-lg md:text-xl font-bold text-white mb-1">{user.name}</h3>
                                <div className="text-xs font-bold text-slate-500 uppercase mb-3">Level {user.level}</div>
                                <div className="text-2xl font-black text-emerald-400">
                                    {user.points.toLocaleString()} P
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Rest List */}
                <div className="bg-[#1a1a20]/80 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <div className="col-span-2 text-center">Rank</div>
                        <div className="col-span-6">Player</div>
                        <div className="col-span-4 text-right">Points</div>
                    </div>
                    <div className="divide-y divide-white/5">
                        {rest.map((user, idx) => (
                            <motion.div 
                                key={idx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + (idx * 0.05) }}
                                className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors"
                            >
                                <div className="col-span-2 flex justify-center text-slate-400 font-bold">
                                    {user.rank}
                                </div>
                                <div className="col-span-6">
                                    <div className="font-bold text-slate-200">{user.name}</div>
                                    <div className="text-xs text-slate-500">Level {user.level}</div>
                                </div>
                                <div className="col-span-4 text-right font-bold text-emerald-400">
                                    {user.points.toLocaleString()}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        );
    } else {
        // 게임별 랭킹 리스트
        const currentList = GAME_RANKINGS[leaderboardTab];
        return (
            <div className="bg-[#1a1a20]/80 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden">
                 <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <div className="col-span-2 text-center">Rank</div>
                    <div className="col-span-5">Player</div>
                    <div className="col-span-3 text-right">Points</div>
                    <div className="col-span-2 text-right">Detail</div>
                </div>
                <div className="divide-y divide-white/5">
                    {currentList.map((user, idx) => (
                        <motion.div 
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors"
                        >
                            <div className="col-span-2 flex justify-center">
                                {getRankIcon(user.rank)}
                            </div>
                            <div className="col-span-5 font-bold text-slate-200">
                                {user.name}
                            </div>
                            <div className="col-span-3 text-right font-bold text-emerald-400">
                                {user.points.toLocaleString()}
                            </div>
                            <div className="col-span-2 text-right text-xs font-medium text-slate-400">
                                {user.detail}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        );
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0c] to-black text-slate-100 overflow-x-hidden selection:bg-purple-500/30">
      <HeaderNavigator />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 pb-20">
        
        {/* Billboard (Optional on sub-page, but nice to have) */}
        {/* <section className="mb-10">
            <Billboard />
        </section> */}

        <section className="mb-12 text-center">
            <div className="flex flex-col items-center mb-6">
                <div className="flex items-center gap-2 text-yellow-400 mb-2 animate-pulse">
                    <Crown className="w-6 h-6" fill="currentColor" />
                    <span className="font-bold tracking-widest text-sm">HALL OF FAME</span>
                    <Crown className="w-6 h-6" fill="currentColor" />
                </div>
                <h1 className="text-4xl md:text-6xl font-black text-white text-center tracking-tight mb-4">
                    LEADERBOARD
                </h1>
                <p className="text-slate-400 max-w-xl mx-auto">
                    최고의 플레이어들에 도전하세요. 매주 월요일 00:00에 랭킹이 초기화됩니다.
                </p>
            </div>
        </section>

        {/* Leaderboard Tabs */}
        <div className="flex justify-center mb-10">
            <div className="flex p-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden overflow-x-auto max-w-full">
                {[
                    { id: 'total', label: '전체 랭킹', icon: Trophy },
                    { id: 'blackjack', label: 'Blackjack', icon: Zap },
                    { id: 'skyroads', label: 'Skyroads', icon: Rocket },
                    { id: 'bustabit', label: 'Bustabit', icon: BarChart3 },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setLeaderboardTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                            leaderboardTab === tab.id 
                            ? 'bg-white/10 text-white shadow-lg border border-white/10' 
                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                        }`}
                    >
                        <tab.icon className={`w-4 h-4 ${leaderboardTab === tab.id ? 'text-purple-400' : ''}`} />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto">
            {renderLeaderboardList()}
        </div>

      </main>
    </div>
  )
}

