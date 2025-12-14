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
        // 폴링 제거: 서버 부하 감소를 위해 자동 갱신 제거
        // 필요시 페이지 재진입 시 갱신
    }, [])

    if (events.length === 0) return null

    const marqueeContent = [...events, ...events].map((e, i) => (
        <span key={`${e.id}-${i}`} className="inline-flex items-center mx-4 font-pixel text-base md:text-lg tracking-wider">
            <span className="text-neon-gold mr-2">★ [{e.gameType.toUpperCase()}]</span>
            <span className="text-neon-white">{e.message.replace(`[${e.gameType.toUpperCase()}] `, '')}</span>
        </span>
    ))

    return (
        <>
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
                
                .font-pixel {
                    font-family: 'VT323', monospace;
                }
                
                .neon-box {
                    background-color: #09090b;
                    border: 1px solid rgba(217, 70, 239, 0.5);
                    box-shadow: 
                        0 0 10px rgba(217, 70, 239, 0.2),
                        inset 0 0 20px rgba(217, 70, 239, 0.1);
                }

                .text-neon-gold {
                    color: #facc15;
                    text-shadow: 0 0 5px rgba(250, 204, 21, 0.8);
                }
                
                .text-neon-white {
                    color: #ffffff;
                    text-shadow: 0 0 5px rgba(217, 70, 239, 0.8), 0 0 10px rgba(217, 70, 239, 0.4);
                }

                .label-neon-red {
                    color: #ff0055;
                    text-shadow: 0 0 5px #ff0055, 0 0 15px #ff0055;
                }
            `}</style>

            <div className="w-full h-8 md:h-9 relative mb-4 rounded-sm overflow-hidden neon-box flex items-center">
                {/* Background Scanlines */}
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(18,16,19,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 bg-[length:100%_2px,3px_100%] pointer-events-none" />

                {/* Left Label */}
                <div className="relative z-20 h-full flex items-center px-2 md:px-3 bg-black/40 border-r border-purple-500/30">
                    <span className="font-pixel text-base md:text-lg label-neon-red animate-pulse whitespace-nowrap tracking-widest pt-0.5">
                        LIVE JACKPOT
                    </span>
                </div>

                {/* Marquee Content */}
                <div className="flex-1 h-full flex items-center overflow-hidden relative z-10"
                    style={{ maskImage: 'linear-gradient(to right, transparent, black 10px, black 95%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 10px, black 95%, transparent)' }}>
                    <motion.div
                        className="flex whitespace-nowrap items-center h-full pt-0.5"
                        animate={{ x: ['0%', '-50%'] }}
                        transition={{
                            repeat: Infinity,
                            ease: "linear",
                            duration: Math.max(20, events.length * 8)
                        }}
                    >
                        {marqueeContent}
                    </motion.div>
                </div>
            </div>
        </>
    )
}
