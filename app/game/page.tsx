'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import HeaderNavigator from '@/components/HeaderNavigator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function GamePage() {
  const router = useRouter()
  const [userPoints, setUserPoints] = useState(0)

  useEffect(() => {
    loadUserPoints()
  }, [])

  const loadUserPoints = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      return
    }

    try {
      const response = await fetch('/api/user/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const userData = await response.json()
        setUserPoints(userData.points || 0)
      }
    } catch (error) {
      console.error('Failed to load user points:', error)
    }
  }

  return (
    <div>
      <HeaderNavigator />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-8 sm:pb-12 lg:pb-20">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2">
            게임 선택
          </h1>
          <p className="text-center text-muted-foreground text-sm sm:text-base">
            보유 포인트: <span className="font-bold text-primary">{userPoints.toLocaleString()} P</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
          {/* 블랙잭 게임 */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl">🎰 블랙잭</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                전통적인 카드 게임
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                <div>• 승리: 베팅 금액의 2배</div>
                <div>• 블랙잭: 베팅 금액의 2.5배</div>
                <div>• 무승부: 베팅 금액 반환</div>
              </div>
              <Button
                className="w-full"
                onClick={() => router.push('/game/blackjack')}
              >
                게임 시작
              </Button>
            </CardContent>
          </Card>

          {/* Bustabit 게임 */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl">📈 Bustabit</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                크래시 그래프 게임
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                <div>• 그래프가 올라가는 동안 캐시아웃</div>
                <div>• 크래시 전 캐시아웃 시 승리</div>
                <div>• 배당 = 캐시아웃 시점의 배율</div>
              </div>
              <Button
                className="w-full"
                onClick={() => router.push('/game/bustabit')}
              >
                게임 시작
              </Button>
            </CardContent>
          </Card>

          {/* 이치방 쿠지 게임 */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl">🎫 이치방 쿠지</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                복권 추첨 게임
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                <div>• 1장당 10 포인트</div>
                <div>• 다양한 등급의 경품 획득</div>
                <div>• 라스트원 특별 경품</div>
              </div>
              <Button
                className="w-full"
                onClick={() => router.push('/game/kuji')}
              >
                게임 시작
              </Button>
            </CardContent>
          </Card>

          {/* 미니 클로버핏 게임 */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl">♣ 미니 클로버핏</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                슬롯 머신 로그라이크 게임
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                <div>• 슬롯 머신으로 돈 벌기</div>
                <div>• 빚을 갚고 다음 라운드로</div>
                <div>• 상점에서 아이템 구매</div>
              </div>
              <Button
                className="w-full"
                onClick={() => router.push('/game/cloverpit')}
              >
                게임 시작
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
