'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import HeaderNavigator from '@/components/HeaderNavigator'
import GameContainer from '@/components/GameContainer'
import TetrisGame from './TetrisGame'

function RoomJoinForm({ onJoin }: { onJoin: (roomId: string) => void }) {
  const [roomId, setRoomId] = useState('')

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        placeholder="방 ID 입력"
        className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
      />
      <button
        onClick={() => onJoin(roomId)}
        disabled={!roomId}
        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors"
      >
        입장
      </button>
    </div>
  )
}

function TetrisGameComponent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const roomId = searchParams.get('roomId')
  const modeParam = searchParams.get('mode')
  const mode = (modeParam === 'single' || modeParam === 'multiplayer') ? modeParam as 'single' | 'multiplayer' : null
  const [userId, setUserId] = useState<number | undefined>()
  const [playerIndex, setPlayerIndex] = useState<number | undefined>()
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    // 모드가 선택되지 않았으면 로딩 종료
    if (!mode) {
      setLoading(false)
      return
    }

    // 인증 확인
    const token = localStorage.getItem('token')
    if (!token) {
      setIsDemo(true)
      setLoading(false)
      return
    }

    try {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const user = JSON.parse(storedUser)
        const parsedUserId = user.id
        setUserId(parsedUserId)

        // 멀티플레이어 모드인 경우 방 정보 가져오기
        if (mode === 'multiplayer' && roomId) {
          fetchRoomInfo(roomId, parsedUserId)
        } else {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    } catch (e) {
      console.error('Failed to parse user data:', e)
      setLoading(false)
    }
  }, [roomId, mode])

  const fetchRoomInfo = async (roomId: string, currentUserId: number) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/tetris/room?roomId=${roomId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        // 플레이어 인덱스 찾기
        const myPlayer = data.players?.find((p: any) => p.userId === currentUserId)
        if (myPlayer) {
          setPlayerIndex(myPlayer.playerIndex)
        }
      }
    } catch (error) {
      console.error('Failed to fetch room info:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRoom = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/tetris/room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          mode: 'multiplayer'
        })
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/game/tetris?mode=multiplayer&roomId=${data.roomId}`)
      }
    } catch (error) {
      console.error('Failed to create room:', error)
    }
  }

  const handleJoinRoom = async (targetRoomId: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/tetris/room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roomId: targetRoomId,
          mode: 'multiplayer'
        })
      })

      if (response.ok) {
        router.push(`/game/tetris?mode=multiplayer&roomId=${targetRoomId}`)
      }
    } catch (error) {
      console.error('Failed to join room:', error)
    }
  }

  if (loading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">로딩 중...</div>
      </div>
    )
  }

  // 모드가 선택되지 않았거나, 멀티플레이어 모드인데 방 ID가 없는 경우 - 모드 선택 화면
  if (!mode || (mode === 'multiplayer' && !roomId)) {
    return (
      <div className="h-screen bg-gray-900">
        <HeaderNavigator />
        <div className="flex flex-col items-center justify-center h-full p-4">
          <h1 className="text-4xl font-bold text-blue-500 mb-8 tracking-widest uppercase">
            Cosmic Tetris
          </h1>
          
          <div className="flex flex-col gap-4 w-full max-w-md">
            <button
              onClick={() => router.push('/game/tetris?mode=single')}
              className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-lg transition-colors"
            >
              싱글플레이
            </button>
            
            <button
              onClick={handleCreateRoom}
              className="px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg transition-colors"
            >
              새 방 만들기
            </button>

            <div className="mt-8">
              <h2 className="text-xl font-bold text-white mb-4">방 입장하기</h2>
              <RoomJoinForm onJoin={handleJoinRoom} />
            </div>

            <button
              onClick={() => router.push('/game')}
              className="mt-8 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold text-sm transition-colors"
            >
              ← 게임 로비로 돌아가기
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 싱글플레이 모드 또는 멀티플레이어 모드 (방 ID 있음)
  return (
    <div className="h-screen bg-gray-900 overflow-hidden">
      <HeaderNavigator />
      <GameContainer className="relative" isDemo={isDemo}>
        <TetrisGame
          roomId={roomId || undefined}
          mode={mode}
          playerIndex={playerIndex}
          userId={userId}
        />
      </GameContainer>
    </div>
  )
}

export default function TetrisGamePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        Loading...
      </div>
    }>
      <TetrisGameComponent />
    </Suspense>
  )
}
