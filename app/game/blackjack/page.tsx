'use client'

import { useEffect, useRef, Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import HeaderNavigator from '@/components/HeaderNavigator'
import { BlackjackGame } from './BlackjackGame'
import { GameState } from '../types'
import GameContainer from '@/components/GameContainer' // [신규]

function BlackjackGameComponent() {
  const searchParams = useSearchParams()
  const betAmount = parseInt(searchParams.get('bet') || '0')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<BlackjackGame | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    setIsDemo(!localStorage.getItem('token'))
  }, [])

  // [수정] 캔버스 크기 계산 (공통 로직)
  const getCanvasSize = () => {
    const totalHeaderHeight = 80; 
    const totalSidePadding = 100; 
    const totalBottomPadding = 30; 
    
    const width = Math.max(320, window.innerWidth - totalSidePadding);
    const height = Math.max(480, window.innerHeight - totalHeaderHeight - totalBottomPadding);
    
    return { width, height }
  }

  useEffect(() => {
    if (!canvasRef.current) return

    const { width, height } = getCanvasSize()

    const canvas = canvasRef.current
    const game = new BlackjackGame(canvas, betAmount, width, height)

    game.setStateChangeCallback((state: GameState) => {
      // console.log('State change:', state)
    })

    game.setMessageCallback((msg: string) => {
      setMessage(msg)
      setTimeout(() => setMessage(''), 3000)
    })

    game.setLoadingProgressCallback((progress: number) => {
      setLoadingProgress(progress)
      if (progress >= 100) {
        setTimeout(() => setLoading(false), 500)
      }
    })

    gameRef.current = game
    game.start()
    
    handleResize()

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy()
        gameRef.current = null
      }
    }
  }, [betAmount])

  const handleResize = () => {
      if (!gameRef.current) return;
      const { width, height } = getCanvasSize()
      gameRef.current.resize(width, height);
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => setTimeout(handleResize, 100));
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    }
  }, []);

  return (
    <div className="h-screen bg-gray-900 overflow-hidden">
      <HeaderNavigator />
      <GameContainer className="relative" isDemo={isDemo}>
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 backdrop-blur-sm">
            <div className="w-64 sm:w-96 bg-gray-800 rounded-xl p-8 border border-white/10 shadow-2xl">
              <h2 className="text-white text-2xl mb-4 text-center font-bold tracking-wider">LOADING TABLE</h2>
              <div className="w-full bg-gray-700/50 rounded-full h-3 mb-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-green-600 h-3 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 font-mono">
                <span>SHUFFLING CARDS...</span>
                <span>{loadingProgress}%</span>
              </div>
            </div>
          </div>
        )}
        
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain"
          style={{ 
            display: 'block',
            touchAction: 'none'
          }}
        />
        
        {message && (
          <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur text-white px-8 py-4 rounded-full text-xl font-bold z-10 animate-in fade-in slide-in-from-top-4 border border-white/10 shadow-2xl whitespace-nowrap">
            {message}
          </div>
        )}
      </GameContainer>
    </div>
  )
}

export default function BlackjackGamePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading...</div>}>
      <BlackjackGameComponent />
    </Suspense>
  )
}
