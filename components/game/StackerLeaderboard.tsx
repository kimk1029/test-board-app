'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Crown, ChevronDown, ChevronUp, Box } from 'lucide-react'

interface RankingUser {
    userId: number
    email: string
    nickname: string
    score: number
    level: number
    rank: number
}

export default function StackerLeaderboard() {
    const [rankings, setRankings] = useState<RankingUser[]>([])
    const [isOpen, setIsOpen] = useState(true)

    useEffect(() => {
        const abortController = new AbortController()
        
        const fetchRankings = async () => {
            try {
                const res = await fetch('/api/ranking/stacker', {
                    signal: abortController.signal
                })
                if (res.ok) {
                    const data = await res.json()
                    setRankings(data.rankings || [])
                }
            } catch (error: any) {
                if (error.name !== 'AbortError') {
                    console.error('Leaderboard fetch error:', error)
                }
            }
        }

        fetchRankings()
        
        return () => {
            abortController.abort()
        }
    }, [])

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown className="w-3 h-3 text-yellow-400" fill="currentColor" />
        if (rank === 2) return <Trophy className="w-3 h-3 text-slate-300" />
        if (rank === 3) return <Trophy className="w-3 h-3 text-amber-600" />
        return <span className="text-[10px] font-bold text-slate-500 w-3 text-center">{rank}</span>
    }

    return (
        <div className="hidden md:block absolute bottom-4 left-4 z-[40] w-72">
            <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-lg">
                {/* Header */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full px-4 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between hover:bg-white/10 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Box className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-bold text-slate-200 tracking-wider">TOP STACKERS</span>
                    </div>
                    {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
                </button>

            {/* Content */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="p-2 space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                            {rankings.length === 0 ? (
                                <div className="text-center py-4 text-xs text-slate-500">No records yet</div>
                            ) : (
                                rankings.map((user) => (
                                    <div key={user.userId} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors group">
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center justify-center w-5 h-5 rounded bg-black/40">
                                                {getRankIcon(user.rank)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-300 truncate max-w-[80px]">
                                                    {user.nickname}
                                                </span>
                                                <span className="text-[9px] text-slate-500">LV.{user.level || 1}</span>
                                            </div>
                                        </div>
                                        
                                            <div className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1">
                                                {user.score.toLocaleString()}
                                                <span className="text-[9px] text-slate-600">BLOCKS</span>
                                            </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            </div>
        </div>
    )
}

