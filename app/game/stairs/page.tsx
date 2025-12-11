'use client'

import dynamic from 'next/dynamic'
import React, { useEffect, useState } from 'react'
import GameContainer from '@/components/GameContainer'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const InfiniteStairsGame = dynamic(() => import('./InfiniteStairsGame'), {
  ssr: false,
  loading: () => <div className="text-white">Loading Game...</div>
})

export default function InfiniteStairsPage() {
    const [isDemo, setIsDemo] = useState(false)

    useEffect(() => {
        const token = localStorage.getItem('token')
        setIsDemo(!token)
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

            <InfiniteStairsGame />
        </GameContainer>
    )
}

