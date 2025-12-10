'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import HeaderNavigator from '@/components/HeaderNavigator'
import { BustabitGame } from './BustabitGame'

function BustabitGameComponent() {
  const searchParams = useSearchParams()
  const betAmount = parseInt(searchParams.get('bet') || '0')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<BustabitGame | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0) // [신규] 로딩 진행률

  // 게임 초기화
  useEffect(() => {
    if (!canvasRef.current) return

    // 초기 크기 설정
    const initialWidth = window.innerWidth
    const initialHeight = window.innerHeight - 80

    const canvas = canvasRef.current
    const game = new BustabitGame(canvas, betAmount, initialWidth, initialHeight)

    game.setMessageCallback((msg: string) => {
      setMessage(msg)
      // 메시지 자동 숨김
      setTimeout(() => setMessage(''), 3000)
    })

    // [신규] 로딩 콜백 연결
    game.setLoadingProgressCallback((progress: number) => {
      setLoadingProgress(progress)
      if (progress >= 100) {
        setTimeout(() => setLoading(false), 500)
      }
    })

    gameRef.current = game
    game.start()
    
    // 초기 리사이즈
    handleResize();

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy()
        gameRef.current = null
      }
    }
  }, [betAmount])

  // 리사이즈 핸들러 (블랙잭과 동일 패턴)
  const handleResize = () => {
      if (!gameRef.current || !containerRef.current) return;

      // BustabitGame에는 resize 메서드가 아직 없으므로, 생성자에서 크기를 받지만
      // 현재 구조상 동적 리사이징이 완벽하지 않을 수 있음.
      // 그러나 반응형 처리를 위해 게임 인스턴스를 재생성하는 것보단
      // 리로드 유도하거나, 게임 내부적으로 resize 메서드를 구현하는 것이 좋음.
      // 여기서는 일단 기존처럼 게임을 다시 만들지 않고, 
      // 만약 resize가 필요하다면 BustabitGame에 resize 메서드를 추가해야 함.
      // (BustabitGame.ts에는 resize 메서드가 아직 구현 안 됨. TODO: 추가 필요)
      
      // 현재 BustabitGame은 resize 메서드가 없으므로, 
      // 반응형이 필요하다면 window.location.reload()를 하거나 
      // canvas 스타일만 조정하고 내부 렌더링은 scale로 처리해야 함.
      
      // 이번 수정 범위에서는 일단 스타일로만 처리.
  };

  useEffect(() => {
    // window.addEventListener('resize', handleResize);
    return () => {
      // window.removeEventListener('resize', handleResize);
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-900 overflow-hidden">
      <HeaderNavigator />
      <div 
        ref={containerRef}
        className="relative flex-1 flex items-center justify-center w-full overflow-hidden p-2"
      >
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 z-20">
            <div className="w-64 sm:w-96 bg-gray-800 rounded-lg p-6 sm:p-8 border border-gray-700">
              <h2 className="text-white text-xl sm:text-2xl mb-4 text-center font-bold">Game Loading...</h2>
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
          className="border-2 border-yellow-500 rounded-lg shadow-2xl max-w-full max-h-full"
          style={{ 
            display: 'block',
            touchAction: 'none'
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

export default function BustabitGamePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading...</div>}>
      <BustabitGameComponent />
    </Suspense>
  )
}
