'use client'

import { useEffect, useState } from 'react'
import { getWebSocketClient } from '@/lib/websocket'

interface OnlineUsersProps {
  className?: string
}

export default function OnlineUsers({ className }: OnlineUsersProps) {
  const [onlineCount, setOnlineCount] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    setMounted(true)

    const wsClient = getWebSocketClient()

    // 사용자 정보 가져오기
    let userId: number | undefined
    let username: string | undefined
    let token: string | undefined

    try {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const user = JSON.parse(storedUser)
        userId = user.id
        username = user.nickname || user.email?.split('@')[0]
      }
      token = localStorage.getItem('token') || undefined
    } catch (e) {
      console.error('Failed to get user info:', e)
    }

    // 웹소켓 연결
    wsClient.connect(userId, username, token).then(() => {
      setIsConnected(true)
      wsClient.getOnlineUsers()
    }).catch((error) => {
      console.error('WebSocket connection failed:', error)
      setIsConnected(false)
    })

    // 접속자 수 업데이트 리스너
    const handleOnlineUsers = (payload: { users: any[], count: number }) => {
      setOnlineCount(payload.count)
      setIsConnected(true)
    }

    wsClient.on('online_users', handleOnlineUsers)

    // 주기적으로 접속자 수 요청 (30초마다)
    const interval = setInterval(() => {
      if (wsClient.isConnected) {
        wsClient.getOnlineUsers()
      }
    }, 30000)

    return () => {
      wsClient.off('online_users', handleOnlineUsers)
      clearInterval(interval)
      wsClient.disconnect()
    }
  }, [])

  // 서버 렌더링 시 빈 div 반환 (hydration mismatch 방지)
  if (!mounted) {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`} suppressHydrationWarning>
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-xl border border-white/5 rounded-full px-4 py-2">
          <div className="relative flex h-2.5 w-2.5">
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-500"></span>
          </div>
          <span className="text-xs font-bold text-slate-400 tracking-wide">
            CONNECTING...
          </span>
        </div>
      </div>
    )
  }

  // 연결되지 않았거나 설정이 없는 경우: 단순히 '접속 중' 표시
  if (!isConnected) {
    return (
      <div className={`fixed bottom-6 right-6 z-50 animate-fade-in ${className}`}>
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-xl border border-white/5 rounded-full px-4 py-2 shadow-2xl ring-1 ring-white/10 group hover:bg-black/80 transition-all duration-300">
          <div className="relative flex h-2.5 w-2.5">
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-500"></span>
          </div>
          <span className="text-xs font-bold text-slate-400 tracking-wide group-hover:text-slate-300 transition-colors">
            CONNECTING...
          </span>
        </div>
      </div>
    )
  }

  // 정상 연결 시: 예쁜 디자인으로 접속자 수 표시
  return (
    <div className={`fixed bottom-6 right-6 z-50 animate-fade-in ${className}`}>
      <div className="flex items-center gap-3 bg-black/60 backdrop-blur-xl border border-white/5 rounded-full px-4 py-2 shadow-[0_0_20px_rgba(0,0,0,0.3)] ring-1 ring-white/10 group hover:ring-emerald-500/30 hover:bg-black/80 transition-all duration-500 hover:scale-105 cursor-default">
        <div className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 duration-1000"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Live</span>
          <span className="text-sm font-bold text-slate-200 tracking-wide group-hover:text-white transition-colors">
            <span className="text-emerald-400 mr-1">{onlineCount.toLocaleString()}</span>
            Playing...
          </span>
        </div>
      </div>
    </div>
  )
}
