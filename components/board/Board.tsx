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
          <div className="text-lg">로딩 중...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-20">
        <Card>
          <CardContent className="pt-6">
            <div className="text-red-600">오류: {error}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // API에서 이미 최신순으로 정렬되어 있으므로 reverse() 제거
  const totalPages = Math.ceil(boardData.length / itemsPerPage)
  const paginatedData = boardData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-20">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">게시판</h1>
        {isAuthenticated && (
          <Button 
            onClick={handleOpenModal}
            className="w-full sm:w-auto text-sm sm:text-base"
          >
            새 게시글 작성
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">게시글 목록</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {/* 모바일: 카드 형태 */}
          <div className="block sm:hidden">
            {paginatedData.length === 0 ? (
              <div className="text-center py-8 text-gray-500 px-4">
                게시글이 없습니다.
              </div>
            ) : (
              <div className="space-y-3 p-4">
                {paginatedData.map((item) => (
                  <Card
                    key={item.bbs_uid}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleRowClick(item.bbs_uid)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-base line-clamp-2 flex-1">
                          {item.title}
                        </h3>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          #{item.bbs_uid}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{item.author}</span>
                        <span>
                          {new Date(item.creation_date).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* 태블릿/PC: 테이블 형태 */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px] sm:w-[80px]">ID</TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead className="w-[120px] sm:w-[150px]">작성자</TableHead>
                  <TableHead className="w-[120px] sm:w-[150px]">작성일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      게시글이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item) => (
                    <TableRow
                      key={item.bbs_uid}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(item.bbs_uid)}
                    >
                      <TableCell className="font-medium text-sm sm:text-base">
                        {item.bbs_uid}
                      </TableCell>
                      <TableCell className="text-sm sm:text-base">{item.title}</TableCell>
                      <TableCell className="text-sm sm:text-base">{item.author}</TableCell>
                      <TableCell className="text-sm sm:text-base">
                        {new Date(item.creation_date).toLocaleDateString('ko-KR')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 sm:gap-2 mt-4 sm:mt-6 px-4 sm:px-0 pb-4 sm:pb-0">
              <Button
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                이전
              </Button>
              <div className="flex gap-1 sm:gap-2 overflow-x-auto">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs sm:text-sm min-w-[2rem] sm:min-w-[2.5rem]"
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm"
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
