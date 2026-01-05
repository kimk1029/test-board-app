'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import HeaderNavigator from '@/components/HeaderNavigator'
import GameContainer from '@/components/GameContainer'
import TetrisGame from './TetrisGame'
import { getWebSocketClient } from '@/lib/websocket'
import { Wrench } from 'lucide-react'

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
        onKeyDown={(e) => {
          if (e.key === 'Enter' && roomId) {
            onJoin(roomId)
          }
        }}
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

function RoomList({ rooms, onJoin, onRefresh }: { rooms: any[], onJoin: (roomId: string) => void, onRefresh: () => void }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">방 목록</h3>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-colors"
        >
          새로고침
        </button>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {rooms.length === 0 ? (
          <div className="text-gray-400 text-center py-8">대기 중인 방이 없습니다</div>
        ) : (
          rooms.map((room) => (
            <div
              key={room.id}
              className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors cursor-pointer"
              onClick={() => onJoin(room.id)}
            >
              <div>
                <div className="text-white font-bold">
                  방 #{room.id.substring(0, 8)}
                </div>
                <div className="text-gray-400 text-sm">
                  플레이어 {room.players?.length || 0}/2 · {room.status === 'waiting' ? '대기 중' : room.status === 'playing' ? '게임 중' : '종료'}
                </div>
              </div>
              <button
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  onJoin(room.id)
                }}
              >
                입장
              </button>
            </div>
          ))
        )}
      </div>
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
  const [rooms, setRooms] = useState<any[]>([])

  const fetchRoomInfo = async (roomId: string, currentUserId: number) => {
    try {
      const wsClient = getWebSocketClient()

      // 웹소켓 연결 확인
      if (!wsClient.isConnected) {
        const token = localStorage.getItem('token')
        const storedUser = localStorage.getItem('user')
        let userId: number | undefined
        let username: string | undefined
        if (storedUser) {
          const user = JSON.parse(storedUser)
          userId = user.id
          username = user.nickname || user.email?.split('@')[0]
        }
        await wsClient.connect(userId, username, token || undefined)
      }

      // 방 참가 리스너
      const handleRoomJoined = (payload: { room: any }) => {
        wsClient.off('room_joined', handleRoomJoined)
        if (payload.room && payload.room.players) {
          const myPlayer = payload.room.players.find((p: any) => p.userId === currentUserId)
          if (myPlayer) {
            // playerIndex는 웹소켓 서버에서 관리하지 않으므로 players 배열 인덱스 사용
            const index = payload.room.players.findIndex((p: any) => p.userId === currentUserId)
            setPlayerIndex(index >= 0 ? index : 0)
          }
        }
        setLoading(false)
      }

      const handleRoomUpdate = (payload: { room: any }) => {
        if (payload.room && payload.room.id === roomId && payload.room.players) {
          const myPlayer = payload.room.players.find((p: any) => p.userId === currentUserId)
          if (myPlayer) {
            const index = payload.room.players.findIndex((p: any) => p.userId === currentUserId)
            setPlayerIndex(index >= 0 ? index : 0)
          }
        }
      }

      wsClient.on('room_joined', handleRoomJoined)
      wsClient.on('room_update', handleRoomUpdate)

      // 방에 참가
      wsClient.joinRoom(roomId)

      // 타임아웃 설정
      setTimeout(() => {
        wsClient.off('room_joined', handleRoomJoined)
        wsClient.off('room_update', handleRoomUpdate)
        if (loading) {
          setLoading(false)
        }
      }, 5000)
    } catch (error: any) {
      console.error('Failed to join room via WebSocket:', error)
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    let roomListCleanup: (() => void) | undefined

    // 안전장치: 15초 후에도 로딩이 끝나지 않으면 강제로 로딩 종료
    timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn('Loading timeout - forcing load to complete')
        setLoading(false)
      }
    }, 15000)

    // 모드가 선택되지 않았으면 로딩 종료 및 방 목록 로드
    if (!mode) {
      if (timeoutId) clearTimeout(timeoutId)
      if (isMounted) {
        setLoading(false)
        // 방 목록 로드
        fetchRoomList().then((cleanup) => {
          if (cleanup) roomListCleanup = cleanup
        })
      }
      return () => {
        if (roomListCleanup) roomListCleanup()
      }
    }

    // 인증 확인
    const token = localStorage.getItem('token')
    if (!token) {
      if (timeoutId) clearTimeout(timeoutId)
      if (isMounted) {
        setIsDemo(true)
        setLoading(false)
      }
      return
    }

    try {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const user = JSON.parse(storedUser)
        const parsedUserId = user.id
        if (isMounted) {
          setUserId(parsedUserId)
        }

        // 멀티플레이어 모드인 경우 방 정보 가져오기
        if (mode === 'multiplayer' && roomId) {
          fetchRoomInfo(roomId, parsedUserId).catch((error) => {
            console.error('Failed to fetch room info:', error)
            if (timeoutId) clearTimeout(timeoutId)
            if (isMounted) {
              setLoading(false)
            }
          })
        } else {
          if (timeoutId) clearTimeout(timeoutId)
          if (isMounted) {
            setLoading(false)
          }
        }
      } else {
        if (timeoutId) clearTimeout(timeoutId)
        if (isMounted) {
          setLoading(false)
        }
      }
    } catch (e) {
      console.error('Failed to parse user data:', e)
      if (timeoutId) clearTimeout(timeoutId)
      if (isMounted) {
        setLoading(false)
      }
    }

    return () => {
      isMounted = false
      if (timeoutId) clearTimeout(timeoutId)
      if (roomListCleanup) roomListCleanup()
    }
  }, [roomId, mode])

  const fetchRoomList = async () => {
    try {
      const { getWebSocketClient } = await import('@/lib/websocket')
      const wsClient = getWebSocketClient()

      // 웹소켓 연결 확인
      if (!wsClient.isConnected) {
        const token = localStorage.getItem('token')
        const storedUser = localStorage.getItem('user')
        let userId: number | undefined
        let username: string | undefined
        if (storedUser) {
          const user = JSON.parse(storedUser)
          userId = user.id
          username = user.nickname || user.email?.split('@')[0]
        }
        await wsClient.connect(userId, username, token || undefined)
      }

      // 방 목록 리스너
      const handleRoomList = (payload: { rooms: any[] }) => {
        const tetrisRooms = payload.rooms.filter((room: any) => room.type === 'tetris' && room.status === 'waiting')
        setRooms(tetrisRooms)
      }

      wsClient.on('room_list', handleRoomList)
      wsClient.getRooms('tetris')

      // 주기적으로 방 목록 새로고침
      const intervalId = setInterval(() => {
        wsClient.getRooms('tetris')
      }, 3000)

      return () => {
        clearInterval(intervalId)
        wsClient.off('room_list', handleRoomList)
      }
    } catch (error) {
      console.error('Failed to fetch room list:', error)
    }
  }

  const handleCreateRoom = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const { getWebSocketClient } = await import('@/lib/websocket')
      const wsClient = getWebSocketClient()

      // 웹소켓 연결 확인
      if (!wsClient.isConnected) {
        const storedUser = localStorage.getItem('user')
        let userId: number | undefined
        let username: string | undefined
        if (storedUser) {
          const user = JSON.parse(storedUser)
          userId = user.id
          username = user.nickname || user.email?.split('@')[0]
        }
        await wsClient.connect(userId, username, token)
      }

      // 방 생성 리스너
      const handleRoomCreated = (payload: { room: any }) => {
        wsClient.off('room_created', handleRoomCreated)
        // 방 목록 새로고침
        wsClient.getRooms('tetris')
        router.push(`/game/tetris?mode=multiplayer&roomId=${payload.room.id}`)
      }

      wsClient.on('room_created', handleRoomCreated)
      wsClient.createRoom('tetris')
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

      const { getWebSocketClient } = await import('@/lib/websocket')
      const wsClient = getWebSocketClient()

      // 웹소켓 연결 확인
      if (!wsClient.isConnected) {
        const storedUser = localStorage.getItem('user')
        let userId: number | undefined
        let username: string | undefined
        if (storedUser) {
          const user = JSON.parse(storedUser)
          userId = user.id
          username = user.nickname || user.email?.split('@')[0]
        }
        await wsClient.connect(userId, username, token)
      }

      // 방 참가 리스너
      const handleRoomJoined = (payload: { room: any }) => {
        wsClient.off('room_joined', handleRoomJoined)
        router.push(`/game/tetris?mode=multiplayer&roomId=${targetRoomId}`)
      }

      const handleError = (payload: { message: string }) => {
        wsClient.off('error', handleError)
        console.error('Failed to join room:', payload.message)
        alert('방 입장에 실패했습니다: ' + payload.message)
      }

      wsClient.on('room_joined', handleRoomJoined)
      wsClient.on('error', handleError)
      wsClient.joinRoom(targetRoomId)
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
          
          <div className="flex flex-col gap-6 w-full max-w-2xl px-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => router.push('/game/tetris?mode=single')}
                className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-base sm:text-lg transition-colors active:scale-95"
              >
                싱글플레이
              </button>
              
              <button
                onClick={handleCreateRoom}
                disabled={true}
                className="flex-1 px-6 py-4 bg-gray-600 text-white rounded-lg font-bold text-base sm:text-lg opacity-50 cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Wrench className="w-5 h-5" />
                <span className="hidden sm:inline">점검 중 (공사중)</span>
                <span className="sm:hidden">점검중</span>
              </button>
            </div>

            <div className="mt-4">
              <h2 className="text-xl font-bold text-white mb-4">방 입장하기</h2>
              <RoomJoinForm onJoin={handleJoinRoom} />
            </div>

            <div className="mt-4">
              <RoomList 
                rooms={rooms} 
                onJoin={handleJoinRoom}
                onRefresh={() => {
                  const { getWebSocketClient } = require('@/lib/websocket')
                  const wsClient = getWebSocketClient()
                  wsClient.getRooms('tetris')
                }}
              />
            </div>

            <button
              onClick={() => router.push('/game')}
              className="mt-4 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold text-sm transition-colors"
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
