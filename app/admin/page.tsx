'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import HeaderNavigator from '@/components/HeaderNavigator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, Trash2, CheckCircle2, User, Gift, Coins, FileText, Settings } from 'lucide-react'

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
      <div className="min-h-screen bg-transparent">
        <HeaderNavigator />
        <div className="container mx-auto px-4 py-20 flex items-center justify-center">
          <div className="text-xl text-slate-400 animate-pulse">Checking authorization...</div>
        </div>
      </div>
    )
  }

  const totalQty = prizes.reduce((sum, p) => sum + p.totalQty, 0)

  return (
    <div className="min-h-screen bg-transparent text-slate-100">
      <HeaderNavigator />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-32 pb-20">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-2">ADMIN CONSOLE</h1>
                <p className="text-slate-400">시스템 설정 및 리소스 관리</p>
            </div>
            <div className="bg-violet-900/20 border border-violet-500/30 px-4 py-2 rounded-lg flex items-center gap-2">
                <User className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-bold text-violet-200">Administrator Access</span>
            </div>
        </div>

        <Tabs defaultValue="kuji" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-black/40 border border-white/5 p-1 rounded-xl mb-8">
            <TabsTrigger value="kuji" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white rounded-lg text-slate-400">
                <Gift className="w-4 h-4 mr-2" /> 이치방쿠지
            </TabsTrigger>
            <TabsTrigger value="points" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white rounded-lg text-slate-400">
                <Coins className="w-4 h-4 mr-2" /> 포인트
            </TabsTrigger>
            <TabsTrigger value="board" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white rounded-lg text-slate-400">
                <FileText className="w-4 h-4 mr-2" /> 게시판
            </TabsTrigger>
            <TabsTrigger value="other" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white rounded-lg text-slate-400">
                <Settings className="w-4 h-4 mr-2" /> 설정
            </TabsTrigger>
          </TabsList>

          {/* 이치방쿠지 탭 */}
          <TabsContent value="kuji" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-[#131316]/80 backdrop-blur border-white/5">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2"><AlertCircle className="w-5 h-5 text-red-500" /> 박스 초기화</CardTitle>
                  <CardDescription className="text-slate-400">
                    현재 진행 중인 게임 박스를 강제로 리셋합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleResetBox}
                    disabled={loading}
                    className="w-full bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 hover:border-red-500/50"
                  >
                    {loading ? '처리 중...' : '박스 리셋 실행'}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-[#131316]/80 backdrop-blur border-white/5">
              <CardHeader>
                <CardTitle className="text-white">상품 구성 설정</CardTitle>
                <CardDescription className="text-slate-400">
                  총 수량: <span className={`font-bold ${totalQty === 80 ? 'text-green-400' : 'text-red-400'}`}>{totalQty}</span> / 80
                  {totalQty !== 80 && (
                    <span className="text-red-400 ml-2 text-xs font-bold animate-pulse">⚠️ 수량을 80개로 맞춰주세요</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {prizes.map((prize, index) => (
                    <div
                      key={index}
                      className="p-4 border border-white/5 bg-white/5 rounded-xl space-y-3"
                      style={{ borderLeft: `4px solid ${prize.color}` }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 bg-black/30 px-3 py-2 rounded-lg">
                          <span
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm shadow-md"
                            style={{ backgroundColor: prize.color }}
                          >
                            {prize.rank}
                          </span>
                          <Input
                            value={prize.rank}
                            onChange={(e) => handlePrizeChange(index, 'rank', e.target.value)}
                            className="w-16 h-8 bg-transparent border-white/10 text-center font-bold"
                          />
                        </div>
                        <div className="flex-1">
                          <Input
                            value={prize.name}
                            onChange={(e) => handlePrizeChange(index, 'name', e.target.value)}
                            className="bg-black/20 border-white/10 text-white"
                            placeholder="상품명"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-xs text-slate-500 mb-1 block">이모지</Label>
                          <Input
                            value={prize.image}
                            onChange={(e) => handlePrizeChange(index, 'image', e.target.value)}
                            className="bg-black/20 border-white/10 text-center"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500 mb-1 block">HEX Color</Label>
                          <div className="flex gap-2">
                            <div className="w-6 h-9 rounded bg-white" style={{backgroundColor: prize.color}}></div>
                            <Input
                                value={prize.color}
                                onChange={(e) => handlePrizeChange(index, 'color', e.target.value)}
                                className="bg-black/20 border-white/10 font-mono text-xs"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500 mb-1 block">수량</Label>
                          <Input
                            type="number"
                            value={prize.totalQty}
                            onChange={(e) => handlePrizeChange(index, 'totalQty', parseInt(e.target.value) || 0)}
                            min="1"
                            className="bg-black/20 border-white/10 text-center font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleSavePrizes}
                  disabled={saving || totalQty !== 80}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold h-12"
                >
                  {saving ? '저장 중...' : '설정 저장하기'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 포인트 탭 */}
          <TabsContent value="points" className="space-y-6">
            <Card className="bg-[#131316]/80 backdrop-blur border-white/5">
              <CardHeader>
                <CardTitle className="text-white">관리자 포인트 충전</CardTitle>
                <CardDescription className="text-slate-400">
                  현재 보유 포인트: <span className="text-violet-400 font-bold">{userPoints.toLocaleString()} P</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleChargePoints}
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12"
                >
                  {loading ? '처리 중...' : '+100 포인트 즉시 충전'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 게시판 탭 */}
          <TabsContent value="board" className="space-y-6">
            <Card className="bg-[#131316]/80 backdrop-blur border-white/5">
              <CardHeader className="border-b border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">게시글 관리</CardTitle>
                    <CardDescription className="text-slate-400">
                      {selectedPostIds.length > 0 ? (
                        <span className="text-violet-400 font-bold">
                          {selectedPostIds.length}개 항목 선택됨
                        </span>
                      ) : (
                        '관리할 게시글을 선택하세요'
                      )}
                    </CardDescription>
                  </div>
                  {selectedPostIds.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteSelected}
                      disabled={loading}
                      className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      선택 삭제
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {posts.length === 0 ? (
                  <div className="text-center text-slate-500 py-12">
                    등록된 게시글이 없습니다.
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex items-center gap-3 px-2">
                      <input
                        type="checkbox"
                        checked={selectedPostIds.length === posts.length && posts.length > 0}
                        onChange={handleSelectAll}
                        className="w-5 h-5 rounded border-gray-600 bg-black/40 text-violet-600 focus:ring-violet-600"
                      />
                      <label className="text-sm text-slate-400 cursor-pointer" onClick={handleSelectAll}>
                        전체 선택 ({selectedPostIds.length}/{posts.length})
                      </label>
                    </div>
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                      {posts.map((post) => (
                        <div
                          key={post.id}
                          className={`p-4 border rounded-xl transition-all duration-200 ${
                            selectedPostIds.includes(post.id) 
                            ? 'bg-violet-900/10 border-violet-500/50' 
                            : 'bg-white/5 border-white/5 hover:border-white/10'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="pt-1">
                                <input
                                type="checkbox"
                                checked={selectedPostIds.includes(post.id)}
                                onChange={() => handleToggleSelect(post.id)}
                                className="w-5 h-5 rounded border-gray-600 bg-black/40 text-violet-600 focus:ring-violet-600"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-lg text-slate-200 mb-1 truncate">
                                {post.title}
                              </h3>
                              <p className="text-sm text-slate-500 line-clamp-1 mb-2">
                                {post.content}
                              </p>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-mono">
                                <span className="flex items-center gap-1 text-violet-400">
                                    <User className="w-3 h-3" />
                                    {post.author.nickname || post.author.email}
                                </span>
                                <span>COMMENTS: {post._count.comments}</span>
                                <span>{new Date(post.createdAt).toLocaleString('ko-KR')}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/board/${post.id}`)}
                                className="bg-transparent border-white/10 text-slate-400 hover:text-white"
                              >
                                View
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeletePost(post.id)}
                                disabled={loading}
                                className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border-none"
                              >
                                <Trash2 className="w-4 h-4" />
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
            <Card className="bg-[#131316]/80 backdrop-blur border-white/5">
              <CardHeader>
                <CardTitle className="text-white">기타 설정</CardTitle>
                <CardDescription className="text-slate-400">
                  시스템 환경 설정 및 로그 확인
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center text-slate-500 py-12 border border-dashed border-white/10 rounded-xl bg-white/5">
                  <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>추가 기능 준비 중...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
