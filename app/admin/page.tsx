'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import HeaderNavigator from '@/components/HeaderNavigator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Prize {
  rank: string
  name: string
  image: string
  color: string
  totalQty: number
}

interface Post {
  id: number
  title: string
  content: string
  authorId: number
  createdAt: string
  author: {
    id: number
    email: string
    nickname: string | null
  }
  _count: {
    comments: number
  }
}

export default function AdminPage() {
  const router = useRouter()
  const [userPoints, setUserPoints] = useState(0)
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [selectedPostIds, setSelectedPostIds] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    checkAuth()
    loadUserPoints()
    loadPrizes()
    loadPosts()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/')
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
        if (userData.email && userData.email.endsWith('@test.com')) {
          setIsAuthorized(true)
        } else {
          alert('관리자 권한이 없습니다.')
          router.push('/')
        }
      } else {
        router.push('/')
      }
    } catch (error) {
      console.error('Auth check error:', error)
      router.push('/')
    }
  }

  const loadUserPoints = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

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

  const loadPrizes = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const response = await fetch('/api/admin/kuji/prizes', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPrizes(data.prizes || [])
      }
    } catch (error) {
      console.error('Failed to load prizes:', error)
    }
  }

  const loadPosts = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const response = await fetch('/api/admin/posts?limit=50', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPosts(data.posts || [])
      }
    } catch (error) {
      console.error('Failed to load posts:', error)
    }
  }

  const handleDeletePost = async (postId: number) => {
    const token = localStorage.getItem('token')
    if (!token) {
      alert('로그인이 필요합니다.')
      return
    }

    if (!confirm('정말 이 게시글을 삭제하시겠습니까?')) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/admin/posts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ postId }),
      })

      if (response.ok) {
        alert('게시글이 삭제되었습니다.')
        loadPosts()
        setSelectedPostIds([])
      } else {
        const errorData = await response.json()
        alert(errorData.error || '게시글 삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('Delete post error:', error)
      alert('게시글 삭제 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleSelect = (postId: number) => {
    setSelectedPostIds((prev) =>
      prev.includes(postId)
        ? prev.filter((id) => id !== postId)
        : [...prev, postId]
    )
  }

  const handleSelectAll = () => {
    if (selectedPostIds.length === posts.length) {
      setSelectedPostIds([])
    } else {
      setSelectedPostIds(posts.map((post) => post.id))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedPostIds.length === 0) {
      alert('삭제할 게시글을 선택해주세요.')
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      alert('로그인이 필요합니다.')
      return
    }

    if (!confirm(`정말 ${selectedPostIds.length}개의 게시글을 삭제하시겠습니까?`)) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/admin/posts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ postIds: selectedPostIds }),
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message || `${selectedPostIds.length}개의 게시글이 삭제되었습니다.`)
        loadPosts()
        setSelectedPostIds([])
      } else {
        const errorData = await response.json()
        alert(errorData.error || '게시글 삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('Delete posts error:', error)
      alert('게시글 삭제 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleChargePoints = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      alert('로그인이 필요합니다.')
      return
    }

    setLoading(true)

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
        setUserPoints(data.points)
        alert(`+100 포인트가 충전되었습니다! (현재: ${data.points} P)`)
      } else {
        const errorData = await response.json()
        alert(errorData.error || '포인트 충전에 실패했습니다.')
      }
    } catch (error) {
      console.error('Charge error:', error)
      alert('포인트 충전 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handlePrizeChange = (index: number, field: keyof Prize, value: string | number) => {
    const updatedPrizes = [...prizes]
    updatedPrizes[index] = {
      ...updatedPrizes[index],
      [field]: value,
    }
    setPrizes(updatedPrizes)
  }

  const handleSavePrizes = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      alert('로그인이 필요합니다.')
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/admin/kuji/prizes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prizes }),
      })

      if (response.ok) {
        alert('상품 설정이 저장되었습니다! (다음 박스부터 적용됩니다)')
      } else {
        const errorData = await response.json()
        alert(errorData.error || '상품 설정 저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('Save prizes error:', error)
      alert('상품 설정 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleResetBox = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      alert('로그인이 필요합니다.')
      return
    }

    if (!confirm('현재 활성 박스의 모든 티켓을 초기화하시겠습니까?')) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/admin/kuji/box/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        alert('박스가 리셋되었습니다!')
      } else {
        const errorData = await response.json()
        alert(errorData.error || '박스 리셋에 실패했습니다.')
      }
    } catch (error) {
      console.error('Reset box error:', error)
      alert('박스 리셋 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthorized) {
    return (
      <div>
        <HeaderNavigator />
        <div className="container mx-auto px-4 py-20">
          <div className="text-center">권한 확인 중...</div>
        </div>
      </div>
    )
  }

  const totalQty = prizes.reduce((sum, p) => sum + p.totalQty, 0)

  return (
    <div>
      <HeaderNavigator />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-20 pt-20 sm:pt-24">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">관리자 페이지</h1>
            <p className="text-muted-foreground">시스템 관리 및 설정</p>
          </div>

          <Tabs defaultValue="kuji" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="kuji">이치방쿠지</TabsTrigger>
              <TabsTrigger value="points">포인트</TabsTrigger>
              <TabsTrigger value="board">게시판</TabsTrigger>
              <TabsTrigger value="other">그외</TabsTrigger>
            </TabsList>

            {/* 이치방쿠지 탭 */}
            <TabsContent value="kuji" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 박스 리셋 카드 */}
                <Card>
                  <CardHeader>
                    <CardTitle>이치방쿠지 박스 관리</CardTitle>
                    <CardDescription>
                      현재 활성 박스의 모든 티켓을 초기화합니다
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={handleResetBox}
                      disabled={loading}
                      variant="destructive"
                      className="w-full"
                    >
                      {loading ? '처리 중...' : '박스 리셋'}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* 이치방쿠지 상품 관리 카드 */}
              <Card>
                <CardHeader>
                  <CardTitle>이치방쿠지 상품 설정</CardTitle>
                  <CardDescription>
                    상품 정보를 수정할 수 있습니다. 다음 박스부터 적용됩니다.
                    <br />
                    총 수량: {totalQty} / 80
                    {totalQty !== 80 && (
                      <span className="text-red-500 ml-2">⚠️ 총 수량은 80개여야 합니다!</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {prizes.map((prize, index) => (
                      <div
                        key={index}
                        className="p-4 border rounded-lg space-y-3"
                        style={{ borderColor: prize.color }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                              style={{ backgroundColor: prize.color }}
                            >
                              {prize.rank}
                            </span>
                            <Label className="w-20">등급</Label>
                            <Input
                              value={prize.rank}
                              onChange={(e) => handlePrizeChange(index, 'rank', e.target.value)}
                              className="w-20"
                            />
                          </div>
                          <div className="flex-1">
                            <Label>상품명</Label>
                            <Input
                              value={prize.name}
                              onChange={(e) => handlePrizeChange(index, 'name', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label>이모지/이미지</Label>
                            <Input
                              value={prize.image}
                              onChange={(e) => handlePrizeChange(index, 'image', e.target.value)}
                              placeholder="🧸"
                            />
                          </div>
                          <div>
                            <Label>색상 (HEX)</Label>
                            <Input
                              value={prize.color}
                              onChange={(e) => handlePrizeChange(index, 'color', e.target.value)}
                              placeholder="#ff4757"
                            />
                          </div>
                          <div>
                            <Label>수량</Label>
                            <Input
                              type="number"
                              value={prize.totalQty}
                              onChange={(e) => handlePrizeChange(index, 'totalQty', parseInt(e.target.value) || 0)}
                              min="1"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={handleSavePrizes}
                    disabled={saving || totalQty !== 80}
                    className="w-full"
                  >
                    {saving ? '저장 중...' : '상품 설정 저장'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 포인트 탭 */}
            <TabsContent value="points" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>포인트 충전</CardTitle>
                  <CardDescription>
                    현재 보유 포인트: {userPoints.toLocaleString()} P
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleChargePoints}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? '처리 중...' : '+100 포인트 충전'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 게시판 탭 */}
            <TabsContent value="board" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>게시판 관리</CardTitle>
                      <CardDescription>
                        게시글을 조회하고 관리할 수 있습니다.
                        {selectedPostIds.length > 0 && (
                          <span className="ml-2 font-semibold text-primary">
                            ({selectedPostIds.length}개 선택됨)
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    {selectedPostIds.length > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteSelected}
                        disabled={loading}
                      >
                        선택 삭제 ({selectedPostIds.length})
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {posts.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      게시글이 없습니다.
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedPostIds.length === posts.length && posts.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <label className="text-sm text-muted-foreground">
                          전체 선택 ({selectedPostIds.length}/{posts.length})
                        </label>
                      </div>
                      <div className="space-y-4 max-h-[600px] overflow-y-auto">
                        {posts.map((post) => (
                          <div
                            key={post.id}
                            className={`p-4 border rounded-lg space-y-2 hover:bg-accent/50 transition-colors ${
                              selectedPostIds.includes(post.id) ? 'bg-accent border-primary' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={selectedPostIds.includes(post.id)}
                                  onChange={() => handleToggleSelect(post.id)}
                                  className="w-4 h-4 mt-1 rounded border-gray-300 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-lg mb-1 truncate">
                                    {post.title}
                                  </h3>
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {post.content}
                                  </p>
                                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                    <span>
                                      작성자: {post.author.nickname || post.author.email}
                                    </span>
                                    <span>
                                      댓글: {post._count.comments}개
                                    </span>
                                    <span>
                                      {new Date(post.createdAt).toLocaleString('ko-KR')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push(`/board/${post.id}`)}
                                >
                                  보기
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeletePost(post.id)}
                                  disabled={loading}
                                >
                                  삭제
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 그외 탭 */}
            <TabsContent value="other" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>기타 관리 기능</CardTitle>
                  <CardDescription>
                    추가 관리 기능이 여기에 표시됩니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-muted-foreground py-8">
                    추후 추가될 기능들...
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

