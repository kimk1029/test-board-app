'use client'

import { useEffect, useRef, Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import HeaderNavigator from '@/components/HeaderNavigator'
import { BlackjackGame } from './BlackjackGame'
import { GameState } from '../types'

function BlackjackGameComponent() {
  const searchParams = useSearchParams()
  const betAmount = parseInt(searchParams.get('bet') || '0')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<BlackjackGame | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)

  // 게임 초기화
  useEffect(() => {
    if (!canvasRef.current) return

    // 초기 크기 설정 (화면 꽉 차게)
    const initialWidth = window.innerWidth
    const initialHeight = window.innerHeight - 80 // 헤더 고려

    const canvas = canvasRef.current
    const game = new BlackjackGame(canvas, betAmount, initialWidth, initialHeight)

    game.setStateChangeCallback((state: GameState) => {
      // console.log('State change:', state)
    })

    game.setMessageCallback((msg: string) => {
      setMessage(msg)
      // 메시지는 3초 후 사라짐
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
    
    // 초기 리사이즈 한 번 수행
    handleResize();

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy()
        gameRef.current = null
      }
    }
  }, [betAmount])

  // 리사이즈 핸들러
  const handleResize = () => {
      if (!gameRef.current || !containerRef.current) return;

      const width = window.innerWidth;
      const height = window.innerHeight - 70; // 헤더 높이 제외

      // 게임 인스턴스에 새 크기 전달
      gameRef.current.resize(width, height);
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    // 모바일 주소창 숨김/보임 등으로 높이 변할 때 대응
    window.addEventListener('orientationchange', () => setTimeout(handleResize, 100));
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-900 overflow-hidden">
      <HeaderNavigator />
      <div 
        ref={containerRef}
        className="relative flex-1 flex items-center justify-center w-full overflow-hidden"
      >
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 z-20">
            <div className="w-64 sm:w-96 bg-gray-800 rounded-lg p-6 sm:p-8 border border-gray-700">
              <h2 className="text-white text-xl sm:text-2xl mb-4 text-center font-bold">Loading Resources...</h2>
              <div className="w-full bg-gray-700 rounded-full h-4 mb-2 overflow-hidden">
                <div
                  className="bg-green-500 h-4 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <p className="text-gray-300 text-center text-sm">{loadingProgress}%</p>
            </div>
          </div>
        )}
        
        <canvas
          ref={canvasRef}
          className="shadow-2xl"
          style={{ 
            display: 'block',
            touchAction: 'none' // 캔버스 내 터치 제스처 브라우저 기본 동작 방지
          }}
        />
        
        {message && (
          <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white px-6 py-3 rounded-full text-lg font-bold z-10 animate-fade-in-down border border-gray-600 shadow-lg whitespace-nowrap">
            {message}
          </div>
        )}
      </div>
    </div>
  )
}

export default function BlackjackGamePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-gray-900 text-white">로딩 중...</div>}>
      <BlackjackGameComponent />
    </Suspense>
  )
}
