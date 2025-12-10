'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import HeaderNavigator from '@/components/HeaderNavigator'
import { BustabitGame } from './BustabitGame'
import GameContainer from '@/components/GameContainer' // [신규]

function BustabitGameComponent() {
  const searchParams = useSearchParams()
  const betAmount = parseInt(searchParams.get('bet') || '0')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<BustabitGame | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    setIsDemo(!localStorage.getItem('token'))
  }, [])

  // [수정] 캔버스 크기 계산 로직 수정 (GameContainer 여백 고려)
  const getCanvasSize = () => {
    // GameContainer의 내부 여백과 테두리 등을 고려하여 캔버스 크기를 결정
    // GameContainer padding: pt-20(80px), px-12(48px), pb-8(32px) 대략 이정도
    // 하지만 GameContainer 내부의 div가 flex-1 w-full h-full이므로
    // window 사이즈에서 컨테이너 패딩을 뺀 크기를 구해야 함.
    
    // 네비게이션 높이(약 64px) + 상단 여백(30px) = 약 94px -> pt-24 (96px)
    // 좌우 여백 50px * 2 = 100px
    // 하단 여백 30px
    
    // 안전하게 계산하기 위해 containerRef의 크기를 가져오는 것이 좋으나,
    // 초기 렌더링 시에는 ref가 없을 수 있으므로 window 기준으로 계산
    
    const navHeight = 64;
    const topMargin = 30;
    const sideMargin = 50 * 2;
    const bottomMargin = 30;
    
    // GameContainer의 pt-20 (80px) 등을 고려
    const totalHeaderHeight = 80; // GameContainer pt-20
    const totalSidePadding = 100; // GameContainer px-[50px]
    const totalBottomPadding = 30; // GameContainer pb-[30px]
    
    const width = Math.max(320, window.innerWidth - totalSidePadding);
    const height = Math.max(480, window.innerHeight - totalHeaderHeight - totalBottomPadding);
    
    return { width, height };
  }

  useEffect(() => {
    if (!canvasRef.current) return

    const { width, height } = getCanvasSize()

    const canvas = canvasRef.current
    const game = new BustabitGame(canvas, betAmount, width, height)

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
    
    handleResize();

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy()
        gameRef.current = null
      }
    }
  }, [betAmount])

  const handleResize = () => {
      if (!gameRef.current) return;
      const { width, height } = getCanvasSize();
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
              <h2 className="text-white text-2xl mb-4 text-center font-bold tracking-wider">GAME LOADING</h2>
              <div className="w-full bg-gray-700/50 rounded-full h-3 mb-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-orange-500 to-red-600 h-3 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 font-mono">
                <span>INITIALIZING...</span>
                <span>{loadingProgress}%</span>
              </div>
            </div>
          </div>
        )}
        
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain" // object-contain으로 비율 유지하며 맞춤
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

export default function BustabitGamePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading...</div>}>
      <BustabitGameComponent />
    </Suspense>
  )
}
