'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import BoardPostModal from './BoardPostModal'
import { PenSquare } from 'lucide-react'

interface BoardData {
  bbs_uid: number
  title: string
  author: string
  creation_date: string
  contents?: string
}

const Board = () => {
  const itemsPerPage = 10
  const [modalOpen, setModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [boardData, setBoardData] = useState<BoardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsAuthenticated(!!token)
    fetchBoardData()
  }, [])

  const fetchBoardData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/posts')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '게시글을 불러오는데 실패했습니다.')
      }

      setBoardData(data)
    } catch (err) {
      console.error('Error fetching board data:', err)
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleRowClick = (id: number) => {
    router.push(`/board/${id}`)
  }

  const handleOpenModal = () => {
    if (!isAuthenticated) {
      alert('로그인이 필요합니다.')
      return
    }
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePostCreated = () => {
    fetchBoardData()
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="flex items-center justify-center">
          <div className="text-lg text-violet-400 font-bold animate-pulse">데이터 로딩 중...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-20">
        <Card className="bg-red-900/20 border-red-500/50 text-red-200">
          <CardContent className="pt-6">
            <div className="text-red-400 font-bold">오류: {error}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalPages = Math.ceil(boardData.length / itemsPerPage)
  const paginatedData = boardData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">
                COMMUNITY BOARD
            </h1>
            <p className="text-slate-400 text-sm mt-1">유저들과 자유롭게 소통하세요.</p>
        </div>
        
        {isAuthenticated && (
          <Button 
            onClick={handleOpenModal}
            className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 text-white font-bold shadow-[0_0_15px_rgba(124,58,237,0.4)] transition-all"
          >
            <PenSquare className="w-4 h-4 mr-2" />
            새 게시글 작성
          </Button>
        )}
      </div>

      <Card className="bg-[#131316]/70 backdrop-blur-md border-white/5 shadow-2xl overflow-hidden rounded-2xl">
        <CardHeader className="border-b border-white/5 bg-white/5 py-4">
          <CardTitle className="text-lg text-slate-200 flex items-center gap-2">
            📋 게시글 목록
            <span className="text-xs text-slate-500 font-normal ml-auto">Total: {boardData.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* 모바일: 카드 형태 */}
          <div className="block sm:hidden">
            {paginatedData.length === 0 ? (
              <div className="text-center py-12 text-slate-500 px-4">
                게시글이 없습니다.
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {paginatedData.map((item) => (
                  <div
                    key={item.bbs_uid}
                    className="p-4 cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors"
                    onClick={() => handleRowClick(item.bbs_uid)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-base text-slate-200 line-clamp-2 flex-1">
                        {item.title}
                      </h3>
                      <span className="text-xs text-slate-500 bg-black/30 px-2 py-1 rounded font-mono">
                        #{item.bbs_uid}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="text-violet-400 font-semibold">{item.author}</span>
                      <span>
                        {new Date(item.creation_date).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 태블릿/PC: 테이블 형태 */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader className="bg-black/20 hover:bg-black/20">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="w-[80px] text-center text-slate-400 font-bold">ID</TableHead>
                  <TableHead className="text-slate-400 font-bold">제목</TableHead>
                  <TableHead className="w-[150px] text-slate-400 font-bold">작성자</TableHead>
                  <TableHead className="w-[120px] text-right text-slate-400 font-bold">작성일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                      게시글이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item) => (
                    <TableRow
                      key={item.bbs_uid}
                      className="cursor-pointer border-white/5 hover:bg-white/5 transition-colors group"
                      onClick={() => handleRowClick(item.bbs_uid)}
                    >
                      <TableCell className="text-center font-mono text-slate-500 group-hover:text-slate-300">
                        {item.bbs_uid}
                      </TableCell>
                      <TableCell className="font-medium text-slate-300 group-hover:text-white transition-colors">
                        {item.title}
                      </TableCell>
                      <TableCell className="text-violet-400 font-semibold">{item.author}</TableCell>
                      <TableCell className="text-right text-slate-500 text-sm">
                        {new Date(item.creation_date).toLocaleDateString('ko-KR')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-6 border-t border-white/5 bg-black/20">
              <Button
                variant="outline"
                size="sm"
                className="bg-transparent border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                이전
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'ghost'}
                    size="sm"
                    className={`min-w-[2rem] font-mono ${
                        currentPage === page 
                        ? 'bg-violet-600 hover:bg-violet-700 text-white' 
                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="bg-transparent border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                다음
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <BoardPostModal
        open={modalOpen}
        handleClose={handleCloseModal}
        onPostCreated={handlePostCreated}
      />
    </div>
  )
}

export default Board
