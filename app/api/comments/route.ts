import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// 댓글 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')

    if (!postId) {
      return NextResponse.json(
        { error: 'postId는 필수입니다.' },
        { status: 400 }
      )
    }

    const comments = await prisma.comment.findMany({
      where: {
        postId: parseInt(postId),
        parentId: null, // 최상위 댓글만
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            nickname: true,
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                email: true,
                nickname: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return NextResponse.json(comments, { status: 200 })
  } catch (error) {
    console.error('댓글 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 댓글 작성
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { postId, content, parentId } = body

    if (!postId || !content) {
      return NextResponse.json(
        { error: 'postId와 content는 필수입니다.' },
        { status: 400 }
      )
    }

    // 보안 검증
    const { detectSQLInjection, detectXSS, sanitizeInput } = await import('@/lib/security')
    
    if (detectSQLInjection(content)) {
      return NextResponse.json(
        { error: '잘못된 입력입니다.' },
        { status: 400 }
      )
    }

    if (detectXSS(content)) {
      return NextResponse.json(
        { error: '잘못된 입력입니다.' },
        { status: 400 }
      )
    }

    // 입력 길이 제한
    if (content.length > 5000) {
      return NextResponse.json(
        { error: '입력 길이가 너무 깁니다.' },
        { status: 400 }
      )
    }

    // 입력 정제
    const sanitizedContent = sanitizeInput(content.trim())

    const REWARD_POINTS = 5

    // Transaction: Create Comment, Give Points, Log Points
    const [comment] = await prisma.$transaction([
      prisma.comment.create({
        data: {
          content: sanitizedContent,
          postId: parseInt(postId),
          authorId: payload.userId,
          parentId: parentId ? parseInt(parentId) : null,
        },
        include: {
          author: {
            select: {
              id: true,
              email: true,
              nickname: true,
            },
          },
        },
      }),
      prisma.user.update({
        where: { id: payload.userId },
        data: { points: { increment: REWARD_POINTS } }
      }),
      prisma.gameLog.create({
        data: {
          userId: payload.userId,
          gameType: 'community',
          betAmount: 0,
          payout: REWARD_POINTS,
          profit: REWARD_POINTS,
          result: 'COMMENT_REWARD',
          metadata: { type: 'comment', postId: parseInt(postId) }
        }
      })
    ])

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('댓글 작성 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
