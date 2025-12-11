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
import { Pencil, Trash2, MessageSquare, Reply, Heart, Eye } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

interface PostData {
  bbs_uid: number
  title: string
  author: string
  authorId: number
  creation_date: string
  contents: string
  likes: number
  liked: boolean
  views: number
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
  const [likeLoading, setLikeLoading] = useState(false)

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
        const token = localStorage.getItem('token')
        const headers: HeadersInit = {}
        if (token) {
            headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(`/api/posts/${id}`, { headers })
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
        setPost(prev => prev ? { ...prev, title: data.title, contents: data.contents } : null)
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

  const handleLike = async () => {
    if (!currentUser || !post) {
      alert('로그인이 필요합니다.')
      return
    }
    if (likeLoading) return

    setLikeLoading(true)
    const prevLiked = post.liked
    const prevLikes = post.likes

    // Optimistic Update
    setPost({ ...post, liked: !prevLiked, likes: prevLiked ? prevLikes - 1 : prevLikes + 1 })

    try {
        const token = localStorage.getItem('token')
        const response = await fetch(`/api/posts/${post.bbs_uid}/like`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        })
        
        if (!response.ok) {
            // Revert on failure
            setPost({ ...post, liked: prevLiked, likes: prevLikes })
            alert('좋아요 처리 중 오류가 발생했습니다.')
        } else {
            const data = await response.json()
            // Ensure synced with server response
            setPost(prev => prev ? { ...prev, liked: data.liked, likes: data.liked ? prevLikes + 1 : prevLikes - 1 } : null)
        }
    } catch (e) {
        console.error(e)
        setPost({ ...post, liked: prevLiked, likes: prevLikes })
    } finally {
        setLikeLoading(false)
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
              <div className="flex-1 mr-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-muted-foreground bg-secondary/20 px-2 py-1 rounded">
                        #{post.bbs_uid}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(post.creation_date)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
                        <Eye className="w-3 h-3" /> {post.views}
                    </span>
                  </div>
                  <CardTitle className="text-2xl sm:text-3xl leading-tight">{post.title}</CardTitle>
              </div>
              
              {isAuthor && (
                <div className="flex gap-2 shrink-0">
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
            
            <div className="flex items-center justify-between mt-4 pb-4 border-b">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-violet-600/20 flex items-center justify-center text-violet-400 font-bold">
                        {post.author.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold">{post.author}</span>
                </div>
                
                <Button 
                    variant={post.liked ? "default" : "outline"}
                    size="sm"
                    className={`gap-2 ${post.liked ? 'bg-pink-600 hover:bg-pink-700 text-white border-pink-600' : 'hover:text-pink-500 hover:border-pink-500'}`}
                    onClick={handleLike}
                >
                    <Heart className={`w-4 h-4 ${post.liked ? 'fill-current' : ''}`} />
                    <span>{post.likes}</span>
                </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="prose max-w-none dark:prose-invert">
              <div className="whitespace-pre-wrap break-words min-h-[200px] leading-relaxed text-slate-200">
                {post.contents}
              </div>
            </div>
            <div className="mt-8 pt-6 border-t flex justify-center">
              <Button variant="outline" onClick={() => router.push('/board')} className="px-8">
                목록으로
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 댓글 섹션 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5" />
              댓글 ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 댓글 작성 */}
            {currentUser ? (
              <div className="space-y-2">
                <Label htmlFor="comment">댓글 작성</Label>
                <div className="flex gap-2">
                    <Textarea
                    id="comment"
                    placeholder="댓글을 입력하세요... (댓글 작성 시 5P 지급)"
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    className="min-h-[80px]"
                    />
                    <Button onClick={() => handleCommentSubmit()} className="h-auto self-stretch px-6">
                        등록
                    </Button>
                </div>
              </div>
            ) : (
                <div className="bg-secondary/20 p-4 rounded-lg text-center text-sm text-muted-foreground">
                    댓글을 작성하려면 <Button variant="link" className="p-0 h-auto" onClick={() => document.getElementById('login-trigger')?.click()}>로그인</Button>이 필요합니다.
                </div>
            )}

            {/* 댓글 목록 */}
            <div className="space-y-6">
              {comments.map((comment) => (
                <div key={comment.id} className="relative pl-4 sm:pl-0">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0 mt-1">
                        {comment.author.nickname?.charAt(0) || comment.author.email.charAt(0)}
                    </div>
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">
                                {comment.author.nickname || comment.author.email}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                {formatRelativeTime(comment.createdAt)}
                                </span>
                            </div>
                            {currentUser && comment.authorId === currentUser.id && (
                                <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                                onClick={() => handleDeleteComment(comment.id)}
                                >
                                <Trash2 className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                        <p className="text-sm whitespace-pre-wrap text-slate-300">{comment.content}</p>
                        
                        {currentUser && (
                            <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-primary -ml-2"
                            onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                            >
                            <Reply className="h-3 w-3 mr-1" />
                            답글
                            </Button>
                        )}
                    </div>
                  </div>

                  {/* 대댓글 작성 */}
                  {replyTo === comment.id && (
                    <div className="mt-3 ml-11 space-y-2">
                      <div className="flex gap-2">
                        <Textarea
                            placeholder="답글을 입력하세요..."
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            className="min-h-[60px]"
                        />
                        <div className="flex flex-col gap-2">
                            <Button
                            size="sm"
                            onClick={() => handleCommentSubmit(comment.id)}
                            className="h-full"
                            >
                            등록
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
                    </div>
                  )}

                  {/* 대댓글 목록 */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-3 ml-11 space-y-4 border-l-2 border-white/5 pl-4">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-slate-800/50 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0 mt-1">
                                {reply.author.nickname?.charAt(0) || reply.author.email.charAt(0)}
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-xs">
                                        {reply.author.nickname || reply.author.email}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                        {formatRelativeTime(reply.createdAt)}
                                        </span>
                                    </div>
                                    {currentUser && reply.authorId === currentUser.id && (
                                        <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 w-5 p-0 text-muted-foreground hover:text-red-500"
                                        onClick={() => handleDeleteComment(reply.id)}
                                        >
                                        <Trash2 className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                                <p className="text-sm whitespace-pre-wrap text-slate-300">{reply.content}</p>
                            </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {comments.length === 0 && (
              <div className="text-center text-muted-foreground py-8 bg-secondary/10 rounded-xl">
                첫 번째 댓글을 남겨보세요!
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
