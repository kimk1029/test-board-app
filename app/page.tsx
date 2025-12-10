'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import HeaderNavigator from '@/components/HeaderNavigator'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface RankingUser {
  id: number
  email: string
  nickname: string | null
  points: number
  level: number
  rank: number
}

export default function Home() {
  const router = useRouter()
  const [rankings, setRankings] = useState<RankingUser[]>([])
  const [dailyRankings, setDailyRankings] = useState<RankingUser[]>([])
  const [weeklyRankings, setWeeklyRankings] = useState<RankingUser[]>([])
  const [monthlyRankings, setMonthlyRankings] = useState<RankingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [pointsHistory, setPointsHistory] = useState<Array<{ date: string; points: number }>>([])
  const [currentPoints, setCurrentPoints] = useState(0)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    const fetchRankings = async () => {
      try {
        // 전체 랭킹
        const response = await fetch('/api/ranking?limit=10')
        if (response.ok) {
          const data = await response.json()
          setRankings(data.rankings || [])
        }

        // 일간 랭킹
        const dailyResponse = await fetch('/api/ranking/period?period=daily&limit=10')
        if (dailyResponse.ok) {
          const dailyData = await dailyResponse.json()
          setDailyRankings(dailyData.rankings || [])
        }

        // 주간 랭킹
        const weeklyResponse = await fetch('/api/ranking/period?period=weekly&limit=10')
        if (weeklyResponse.ok) {
          const weeklyData = await weeklyResponse.json()
          setWeeklyRankings(weeklyData.rankings || [])
        }

        // 월간 랭킹
        const monthlyResponse = await fetch('/api/ranking/period?period=monthly&limit=10')
        if (monthlyResponse.ok) {
          const monthlyData = await monthlyResponse.json()
          setMonthlyRankings(monthlyData.rankings || [])
        }

        // 포인트 히스토리
        const token = localStorage.getItem('token')
        if (token) {
          const historyResponse = await fetch('/api/user/points-history', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          if (historyResponse.ok) {
            const historyData = await historyResponse.json()
            setPointsHistory(historyData.history || [])
            setCurrentPoints(historyData.currentPoints || 0)
          }
        }
      } catch (error) {
        console.error('랭킹 조회 오류:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRankings()
  }, [])

  const getCurrentRankings = () => {
    switch (selectedPeriod) {
      case 'daily':
        return dailyRankings
      case 'weekly':
        return weeklyRankings
      case 'monthly':
        return monthlyRankings
      default:
        return dailyRankings
    }
  }

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'daily':
        return '일간'
      case 'weekly':
        return '주간'
      case 'monthly':
        return '월간'
      default:
        return '일간'
    }
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-500'
    if (rank === 2) return 'text-gray-400'
    if (rank === 3) return 'text-orange-400'
    return 'text-muted-foreground'
  }

  return (
    <div>
      <HeaderNavigator />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-20">
        <div className="space-y-6">
          {/* 헤더 */}
          <div className="text-center space-y-3 sm:space-y-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
              KH플레이그라운드
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground">
              게임과 게시판을 통해 포인트를 모아 레벨을 올려보세요!
            </p>
          </div>

          {/* 대시보드 그리드 */}
          <div className="space-y-6">
            {/* 시작하기 카드 */}
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">시작하기</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  게시판에 글을 작성하고 포인트를 획득하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2 text-xs sm:text-sm text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">✨ 게시글 작성:</span>
                      <span>+10 포인트</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">🎁 일일 로그인:</span>
                      <span>+5 포인트</span>
                    </div>
                  </div>
                  <Button
                    size="lg"
                    className="w-full sm:w-auto text-sm sm:text-base px-8"
                    onClick={() => router.push('/board')}
                  >
                    게시판 보기
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* 나의 포인트 그래프 카드 */}
            <Card className="md:col-span-1 lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <span>📈</span>
                  나의 포인트 변화
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  최근 30일간의 일별 포인트 변화 그래프
                  {currentPoints > 0 && (
                    <span className="ml-2 font-semibold text-primary">
                      현재: {currentPoints.toLocaleString()} P
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pointsHistory.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">
                      {isClient && localStorage.getItem('token') ? '데이터를 불러오는 중...' : '로그인이 필요합니다.'}
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={pointsHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => {
                            const date = new Date(value)
                            return `${date.getMonth() + 1}/${date.getDate()}`
                          }}
                          style={{ fontSize: '12px' }}
                        />
                        <YAxis 
                          tickFormatter={(value) => `${value}P`}
                          style={{ fontSize: '12px' }}
                        />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toLocaleString()} P`, '포인트']}
                          labelFormatter={(label) => {
                            const date = new Date(label)
                            return date.toLocaleDateString('ko-KR', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="points" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
            {/* 전체 포인트 랭킹 카드 */}
            <Card className="md:col-span-1 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <span>🏆</span>
                  포인트 랭킹 (전체)
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  상위 10명의 포인트 순위
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">로딩 중...</div>
                  </div>
                ) : rankings.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">랭킹 데이터가 없습니다.</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rankings.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`text-lg sm:text-xl font-bold ${getRankColor(user.rank)} flex-shrink-0`}>
                            {getRankIcon(user.rank)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm sm:text-base truncate">
                              {user.nickname || user.email.split('@')[0]}
                            </div>
                            <div className="text-xs sm:text-sm text-muted-foreground">
                              Lv.{user.level}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-sm sm:text-base text-primary">
                            {user.points.toLocaleString()}P
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 기간별 포인트 랭킹 카드 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <span>📊</span>
                  기간별 랭킹
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  일간/주간/월간 포인트 획득 순위
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* 기간 선택 버튼 */}
                <div className="flex gap-2 mb-4">
                  <Button
                    variant={selectedPeriod === 'daily' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPeriod('daily')}
                    className="flex-1"
                  >
                    일간
                  </Button>
                  <Button
                    variant={selectedPeriod === 'weekly' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPeriod('weekly')}
                    className="flex-1"
                  >
                    주간
                  </Button>
                  <Button
                    variant={selectedPeriod === 'monthly' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPeriod('monthly')}
                    className="flex-1"
                  >
                    월간
                  </Button>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">로딩 중...</div>
                  </div>
                ) : getCurrentRankings().length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">랭킹 데이터가 없습니다.</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {getCurrentRankings().slice(0, 5).map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className={`text-sm font-bold ${getRankColor(user.rank)} flex-shrink-0`}>
                            {getRankIcon(user.rank)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-xs sm:text-sm truncate">
                              {user.nickname || user.email.split('@')[0]}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-xs sm:text-sm text-primary">
                            {user.points.toLocaleString()}P
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  </div>
  )
}
