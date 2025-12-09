'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import LoginModal from './LoginModal'
import { getLevelProgress, getPointsForNextLevel, getPointsForCurrentLevel } from '@/lib/points'

interface User {
  id: number
  email: string
  nickname?: string
  points?: number
  level?: number
}

// 전역으로 포인트 업데이트 함수를 export
let updateUserPoints: (() => void) | null = null

export const refreshUserPoints = () => {
  if (updateUserPoints) {
    updateUserPoints()
  }
}

const HeaderNavigator = () => {
  const [isVisibleLogin, setIsVisibleLogin] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  
  const loadUserData = async () => {
    const token = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        setUser(parsedUser)
        
        // 서버에서 최신 사용자 정보 가져오기
        if (token) {
          try {
            const response = await fetch('/api/user/me', {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            })
            
            if (response.ok) {
              const userData = await response.json()
              setUser(userData)
              localStorage.setItem('user', JSON.stringify(userData))
            }
          } catch (error) {
            console.error('Failed to fetch user data:', error)
          }
        }
      } catch (e) {
        console.error('Failed to parse user data')
      }
    }
  }
  
  // 전역 함수 등록
  useEffect(() => {
    updateUserPoints = loadUserData
    return () => {
      updateUserPoints = null
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    loadUserData()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    window.location.reload()
  }

  const handleLoginSuccess = () => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (e) {
        console.error('Failed to parse user data')
      }
    }
  }

  const level = user?.level || 1
  const points = user?.points || 0
  const progress = getLevelProgress(points, level)
  const currentLevelPoints = getPointsForCurrentLevel(level)
  const nextLevelPoints = getPointsForNextLevel(level)
  const pointsNeeded = nextLevelPoints - points

  // test.com 도메인 체크
  const isTestAccount = user?.email?.endsWith('@test.com') || false

  const handleChargePoints = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      alert('로그인이 필요합니다.')
      return
    }

    try {
      const response = await fetch('/api/admin/charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: 100 }),
      })

      if (response.ok) {
        const data = await response.json()
        alert(`+100 포인트가 충전되었습니다! (현재: ${data.points} P)`)
        // 포인트 업데이트
        loadUserData()
      } else {
        const errorData = await response.json()
        alert(errorData.error || '포인트 충전에 실패했습니다.')
      }
    } catch (error) {
      console.error('Charge error:', error)
      alert('포인트 충전 중 오류가 발생했습니다.')
    }
  }

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-transparent'
            : 'bg-white shadow-md'
        }`}
      >
        <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4">
          <nav className="flex items-center gap-3 sm:gap-4 md:gap-6">
            <Link
              href="/"
              className="text-xs sm:text-sm font-medium text-gray-900 hover:text-gray-600 transition-colors"
            >
              Home
            </Link>
            <Link
              href="/board"
              className="text-xs sm:text-sm font-medium text-gray-900 hover:text-gray-600 transition-colors"
            >
              Board
            </Link>
            <Link
              href="/game"
              className="text-xs sm:text-sm font-medium text-gray-900 hover:text-gray-600 transition-colors"
            >
              Game
            </Link>
            {isTestAccount && (
              <Link
                href="/admin"
                className="text-xs sm:text-sm font-medium text-gray-900 hover:text-gray-600 transition-colors"
              >
                Admin
              </Link>
            )}
          </nav>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="font-medium text-gray-900 hover:text-gray-600 text-xs sm:text-sm px-2 sm:px-4"
                >
                  <span className="hidden sm:inline">{user.nickname || user.email}</span>
                  <span className="sm:hidden">
                    {user.nickname ? user.nickname.substring(0, 5) + '...' : user.email.substring(0, 5) + '...'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 sm:w-80">
                <DropdownMenuLabel>
                  <div className="space-y-2">
                    <div className="font-semibold text-sm sm:text-base">
                      {user.nickname || user.email}
                    </div>
                    <div className="text-xs text-gray-500 break-all">{user.email}</div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="p-3 sm:p-4 space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="font-medium">레벨 {level}</span>
                      <span className="text-gray-500 text-right">
                        {points} / {nextLevelPoints} 포인트
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="text-xs text-gray-500">
                      다음 레벨까지 {pointsNeeded} 포인트 필요
                    </div>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 text-sm">
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              onClick={() => setIsVisibleLogin(true)}
              className="text-xs sm:text-sm px-3 sm:px-4"
            >
              로그인
            </Button>
          )}
        </div>
      </header>
      <LoginModal
        open={isVisibleLogin}
        onClose={() => setIsVisibleLogin(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  )
}

export default HeaderNavigator
