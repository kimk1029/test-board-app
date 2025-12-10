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
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 })

  useEffect(() => {
    const updateDimensions = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      // 모바일: 세로 모드 (사이드바 없음, 전체 화면 사용)
      if (width < 768) {
        setDimensions({ width: width, height: height - 80 }) // 헤더 높이 제외
      }
      // 태블릿: 사이드바 축소
      else if (width < 1024) {
        setDimensions({ width: width - 20, height: height - 100 })
      }
      // PC: 고정 크기
      else {
        setDimensions({ width: 1200, height: 800 })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const game = new BlackjackGame(canvas, betAmount, dimensions.width, dimensions.height)

    game.setStateChangeCallback((state: GameState) => {
      console.log('State change:', state)
    })

    game.setMessageCallback((msg: string) => {
      setMessage(msg)
    })

    game.setLoadingProgressCallback((progress: number) => {
      setLoadingProgress(progress)
      if (progress >= 100) {
        setTimeout(() => setLoading(false), 500) // 100% 도달 후 잠시 뒤 로딩 해제
      }
    })

    gameRef.current = game
    game.start()

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy()
        gameRef.current = null
      }
    }
  }, [betAmount, dimensions])

  return (
    <div>
      <HeaderNavigator />
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-gray-900 pt-16 sm:pt-20">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-75 z-10">
            <div className="w-96 bg-gray-800 rounded-lg p-8">
              <h2 className="text-white text-2xl mb-4 text-center">Loading...</h2>
              <div className="w-full bg-gray-700 rounded-full h-4 mb-2">
                <div
                  className="bg-green-500 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <p className="text-white text-center">{loadingProgress}%</p>
            </div>
          </div>
        )}
        <div className="relative w-full flex-1 flex items-center justify-center p-2 sm:p-4">
          <canvas
            ref={canvasRef}
            className="border-2 border-yellow-500 rounded-lg max-w-full max-h-full"
            style={{ 
              display: 'block',
              width: `${dimensions.width}px`,
              height: `${dimensions.height}px`
            }}
          />
          {message && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-6 py-3 rounded-lg text-xl font-bold">
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BlackjackGamePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">로딩 중...</div>}>
      <BlackjackGameComponent />
    </Suspense>
  )
}
