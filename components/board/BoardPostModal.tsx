'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { refreshUserPoints } from '@/components/HeaderNavigator'

interface BoardPostModalProps {
  open: boolean
  handleClose: () => void
  onPostCreated?: () => void
}

const BoardPostModal = ({
  open,
  handleClose,
  onPostCreated,
}: BoardPostModalProps) => {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setTitle('')
      setContent('')
      setError('')
    }
  }, [open])

  const handleCreatePost = async () => {
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 모두 입력해주세요.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('로그인이 필요합니다.')
        setLoading(false)
        return
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          contents: content.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '게시글 작성에 실패했습니다.')
        setLoading(false)
        return
      }

      setTitle('')
      setContent('')
      handleClose()
      
      // 포인트 업데이트
      refreshUserPoints()
      
      onPostCreated?.()
    } catch (error) {
      console.error('Error creating post:', error)
      setError('게시글 작성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>새 게시글 작성</DialogTitle>
          <DialogDescription>
            게시글을 작성하면 10 포인트를 받습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="title">제목</Label>
            <Input
              id="title"
              type="text"
              placeholder="제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleCreatePost()
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">내용</Label>
            <Textarea
              id="content"
              placeholder="내용을 입력하세요"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[300px]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              취소
            </Button>
            <Button onClick={handleCreatePost} disabled={loading}>
              {loading ? '작성 중...' : '작성'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default BoardPostModal
