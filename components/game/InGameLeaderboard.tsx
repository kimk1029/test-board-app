'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Crown, ChevronDown, ChevronUp } from 'lucide-react'

interface RankingUser {
    id: number
    email: string
    nickname: string | null
    points: number
    level: number
    rank: number
}

export default function InGameLeaderboard() {
    const [rankings, setRankings] = useState<RankingUser[]>([])
    const [loading, setLoading] = useState(true)
    const [isOpen, setIsOpen] = useState(true)

    useEffect(() => {
        const fetchRankings = async () => {
            try {
                const res = await fetch('/api/ranking/period?limit=5')
                if (res.ok) {
                    const data = await res.json()
                    setRankings(data.rankings || [])
                }
            } catch (error) {
                console.error('Leaderboard fetch error:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchRankings()
        // Optional: Refresh every 30s?
        const interval = setInterval(fetchRankings, 30000)
        return () => clearInterval(interval)
    }, [])

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown className="w-3 h-3 text-yellow-400" fill="currentColor" />
        if (rank === 2) return <Trophy className="w-3 h-3 text-slate-300" />
        if (rank === 3) return <Trophy className="w-3 h-3 text-amber-600" />
        return <span className="text-[10px] font-bold text-slate-500 w-3 text-center">{rank}</span>
    }

    if (loading && rankings.length === 0) return null

    return (
        <div className="absolute bottom-4 left-4 z-[40] w-64 md:w-72">
            <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-lg">
                {/* Header */}
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full px-4 py-3 bg-black/60 border-b border-white/5 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span className="text-xs font-bold text-slate-200 tracking-wider">LEADERBOARD</span>
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
                                {rankings.map((user) => (
                                    <div key={user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors group">
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center justify-center w-5 h-5 rounded bg-black/40">
                                                {getRankIcon(user.rank)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-300 truncate max-w-[80px]">
                                                    {user.nickname || user.email.split('@')[0]}
                                                </span>
                                                <span className="text-[9px] text-slate-500">LV.{user.level}</span>
                                            </div>
                                        </div>
                                        <div className="text-xs font-mono font-bold text-emerald-400">
                                            {user.points.toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                                {rankings.length === 0 && (
                                    <div className="text-center py-4 text-xs text-slate-500">No data</div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

