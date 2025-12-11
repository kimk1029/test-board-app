'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface BillboardEvent {
    id: number
    message: string
    gameType: string
    createdAt: string
    user: string
}

export default function Billboard() {
    const [events, setEvents] = useState<BillboardEvent[]>([])
    
    const fetchEvents = async () => {
        try {
            const res = await fetch('/api/billboard')
            if (res.ok) {
                const data = await res.json()
                if (data.events && Array.isArray(data.events)) {
                    setEvents(data.events)
                }
            }
        } catch (e) {
            console.error(e)
        }
    }

    useEffect(() => {
        fetchEvents()
        const interval = setInterval(fetchEvents, 30000) // 30초마다 갱신
        return () => clearInterval(interval)
    }, [])

    if (events.length === 0) return null

    // 메시지 목록을 반복해서 흐르게 하기 위해 복제 (2번 복제하여 끊김 없는 루프 구현)
    const marqueeContent = [...events, ...events].map((e, i) => (
        <span key={`${e.id}-${i}`} className="inline-flex items-center mx-8 text-sm md:text-base font-medium text-white">
            <span className="text-yellow-400 mr-2">[{e.gameType.toUpperCase()}]</span>
            <span className="text-gray-200">{e.message.replace(`[${e.gameType.toUpperCase()}] `, '')}</span>
        </span>
    ))

    return (
        <div className="w-full bg-gradient-to-r from-black via-gray-900 to-black border-y border-yellow-500/30 h-10 md:h-12 flex items-center overflow-hidden relative mb-4 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
            <div className="absolute left-0 z-20 h-full flex items-center px-3 bg-black/90 border-r border-yellow-500/50 shadow-lg">
                <span className="text-yellow-400 font-black text-xs md:text-sm animate-pulse whitespace-nowrap">
                    🎉 JACKPOT NEWS
                </span>
            </div>
            
            <div className="flex-1 overflow-hidden relative h-full flex items-center" style={{ maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' }}>
                 <motion.div
                    className="flex whitespace-nowrap"
                    animate={{ x: ['0%', '-50%'] }}
                    transition={{ 
                        repeat: Infinity, 
                        ease: "linear", 
                        duration: Math.max(20, events.length * 10) // 속도 조절
                    }}
                 >
                    {marqueeContent}
                 </motion.div>
            </div>
        </div>
    )
}

