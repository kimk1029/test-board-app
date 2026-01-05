'use client'

import dynamic from 'next/dynamic'
import GameContainer from '@/components/GameContainer'
import { useEffect, useState, useCallback } from 'react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const LottoGame = dynamic(() => import('./LottoGame'), {
  ssr: false,
  loading: () => null
})

export default function LottoPage() {
    const [isDemo, setIsDemo] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        const token = localStorage.getItem('token')
        setIsDemo(!token)
    }, [])

    const handleLoadingProgress = useCallback((val: number) => {
        setProgress(val)
        if (val >= 100) {
            setTimeout(() => setIsLoading(false), 500)
        }
    }, [])

    return (
        <GameContainer isDemo={isDemo} centerContent={false}>
            {/* Back Button Overlay */}
            <div className="absolute top-4 left-4 z-50">
                <Link href="/game">
                    <Button variant="outline" size="icon" className="rounded-full bg-black/50 border-white/20 hover:bg-white/20 text-white">
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                </Link>
            </div>

            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
                    <div className="w-64 space-y-4">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-white mb-2 tracking-widest">우주 레이스</h2>
                            <p className="text-sm text-gray-400">Loading Resources... {progress}%</p>
                        </div>
                        <Progress value={progress} className="w-full" />
                    </div>
                </div>
            )}

            {/* Game Component */}
            <LottoGame onLoadingProgress={handleLoadingProgress} />
        </GameContainer>
    )
}
