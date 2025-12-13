'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// Supabase 클라이언트 초기화 (환경 변수 확인)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let supabase: any = null

if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  } catch (e) {
    console.error('Supabase client init failed:', e)
  }
}

interface OnlineUsersProps {
  className?: string
}

export default function OnlineUsers({ className }: OnlineUsersProps) {
  const [onlineCount, setOnlineCount] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    setMounted(true)

    if (!supabase) {
      return
    }

    // 'online-users' 채널 구독
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: `user-${Math.random().toString(36).substring(7)}`,
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setOnlineCount(Object.keys(state).length)
        setIsConnected(true)
      })
      .on('presence', { event: 'join' }, () => {
        setIsConnected(true)
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          await channel.track({
            online_at: new Date().toISOString(),
          })
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [])

  if (!mounted) return null

  // 연결되지 않았거나 설정이 없는 경우: 단순히 '접속 중' 표시
  if (!supabase || !isConnected) {
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
                USERS
            </span>
        </div>
      </div>
    </div>
  )
}
