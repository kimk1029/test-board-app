'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import HeaderNavigator from '@/components/HeaderNavigator'
import { Pencil, Trash2, MessageSquare, Reply } from 'lucide-react'

interface PostData {
  bbs_uid: number
  title: string
  author: string
  authorId: number
  creation_date: string
  contents: string
}

interface Comment {
  id: number
  content: string
  authorId: number
  author: {
    id: number
    email: string
    nickname?: string
  }
  parentId: number | null
  replies: Comment[]
  createdAt: string
  updatedAt: string
}

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [post, setPost] = useState<PostData | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<{ id: number } | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [commentContent, setCommentContent] = useState('')
  const [replyTo, setReplyTo] = useState<number | null>(null)
  const [replyContent, setReplyContent] = useState('')

  useEffect(() => {
    const loadUser = () => {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser)
          setCurrentUser(user)
        } catch (e) {
          console.error('Failed to parse user data')
        }
      }
    }
    loadUser()
  }, [])

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true)
        setError(null)
        const id = params.id as string
        const response = await fetch(`/api/posts/${id}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || '게시글을 불러오는데 실패했습니다.')
        }

        setPost(data)
        setEditTitle(data.title)
        setEditContent(data.contents)
      } catch (err) {
        console.error('Error fetching post:', err)
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchPost()
      fetchComments()
    }
  }, [params.id])

  const fetchComments = async () => {
    try {
      const id = params.id as string
      const response = await fetch(`/api/comments?postId=${id}`)
      const data = await response.json()

      if (response.ok) {
        setComments(data)
      }
    } catch (err) {
      console.error('Error fetching comments:', err)
    }
  }

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const token = localStorage.getItem('token')
      const id = params.id as string
      const response = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        router.push('/board')
      } else {
        const data = await response.json()
        alert(data.error || '삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleEdit = async () => {
    try {
      const token = localStorage.getItem('token')
      const id = params.id as string
      const response = await fetch(`/api/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editTitle.trim(),
          contents: editContent.trim(),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setPost(data)
        setEditDialogOpen(false)
      } else {
        const data = await response.json()
        alert(data.error || '수정에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error updating post:', error)
      alert('수정 중 오류가 발생했습니다.')
    }
  }

  const handleCommentSubmit = async (parentId: number | null = null) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('로그인이 필요합니다.')
        return
      }

      const content = parentId ? replyContent : commentContent
      if (!content.trim()) {
        alert('댓글 내용을 입력해주세요.')
        return
      }

      const id = params.id as string
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          postId: parseInt(id),
          content,
          parentId,
        }),
      })

      if (response.ok) {
        if (parentId) {
          setReplyContent('')
          setReplyTo(null)
        } else {
          setCommentContent('')
        }
        fetchComments()
      } else {
        const data = await response.json()
        alert(data.error || '댓글 작성에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error creating comment:', error)
      alert('댓글 작성 중 오류가 발생했습니다.')
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        fetchComments()
      } else {
        const data = await response.json()
        alert(data.error || '댓글 삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert('댓글 삭제 중 오류가 발생했습니다.')
    }
  }

  const isAuthor = post && currentUser && post.authorId === currentUser.id

  if (loading) {
    return (
      <div>
        <HeaderNavigator />
        <div className="container mx-auto px-4 py-20">
          <div className="flex items-center justify-center">
            <div className="text-lg">로딩 중...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div>
        <HeaderNavigator />
        <div className="container mx-auto px-4 py-20">
          <Card>
            <CardContent className="pt-6">
              <div className="text-red-600 mb-4">
                오류: {error || '게시글을 찾을 수 없습니다.'}
              </div>
              <Button onClick={() => router.push('/board')}>목록으로</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div>
      <HeaderNavigator />
      <div className="container mx-auto px-4 py-20">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="text-2xl flex-1">{post.title}</CardTitle>
              {isAuthor && (
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditDialogOpen(true)}
                    title="수정"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDelete}
                    title="삭제"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
              <span>작성자: {post.author}</span>
              <span>
                작성일: {new Date(post.creation_date).toLocaleString('ko-KR')}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap break-words min-h-[200px] leading-relaxed">
                {post.contents}
              </div>
            </div>
            <div className="mt-6">
              <Button variant="outline" onClick={() => router.push('/board')}>
                목록으로
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 댓글 섹션 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              댓글 ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 댓글 작성 */}
            {currentUser && (
              <div className="space-y-2">
                <Label htmlFor="comment">댓글 작성</Label>
                <Textarea
                  id="comment"
                  placeholder="댓글을 입력하세요..."
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  className="min-h-[100px]"
                />
                <Button onClick={() => handleCommentSubmit()}>댓글 작성</Button>
              </div>
            )}

            {/* 댓글 목록 */}
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="border-l-2 border-primary/20 pl-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">
                          {comment.author.nickname || comment.author.email}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleString('ko-KR')}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                      {currentUser && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-7"
                          onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                        >
                          <Reply className="h-3 w-3 mr-1" />
                          답글
                        </Button>
                      )}
                      {currentUser && comment.authorId === currentUser.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-7 text-red-600"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          삭제
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 대댓글 작성 */}
                  {replyTo === comment.id && (
                    <div className="mt-3 ml-4 space-y-2">
                      <Textarea
                        placeholder="답글을 입력하세요..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        className="min-h-[80px]"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleCommentSubmit(comment.id)}
                        >
                          답글 작성
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setReplyTo(null)
                            setReplyContent('')
                          }}
                        >
                          취소
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* 대댓글 목록 */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-4 ml-4 space-y-3">
                      {comment.replies.map((reply) => (
                        <div
                          key={reply.id}
                          className="border-l-2 border-muted pl-3 py-2"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm">
                                  {reply.author.nickname || reply.author.email}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(reply.createdAt).toLocaleString('ko-KR')}
                                </span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                              {currentUser && reply.authorId === currentUser.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-2 h-7 text-red-600"
                                  onClick={() => handleDeleteComment(reply.id)}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  삭제
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {comments.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                댓글이 없습니다.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 수정 다이얼로그 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>게시글 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">제목</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-content">내용</Label>
              <Textarea
                id="edit-content"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[300px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleEdit}>수정</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
