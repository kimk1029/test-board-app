'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import HeaderNavigator from '@/components/HeaderNavigator'
import { BustabitGame } from './BustabitGame'

function BustabitGameComponent() {
  const searchParams = useSearchParams()
  const betAmount = parseInt(searchParams.get('bet') || '0')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<BustabitGame | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
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
    const game = new BustabitGame(canvas, betAmount, dimensions.width, dimensions.height)

    game.setMessageCallback((msg: string) => {
      setMessage(msg)
    })

    gameRef.current = game
    game.start()
    setLoading(false)

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
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-gray-900 pt-16 sm:pt-20 p-2 sm:p-4">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-75 z-10">
            <div className="text-white text-xl">로딩 중...</div>
          </div>
        )}
        <div className="relative w-full h-full flex items-center justify-center">
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
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-base sm:text-xl font-bold z-20">
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BustabitGamePage() {
  return <BustabitGameComponent />
}

